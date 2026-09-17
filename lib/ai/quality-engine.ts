// Respondent Quality Detection: flags potentially unreliable responses
// without ever deleting data. Deterministic checks (speeding, straight-
// lining, gibberish, duplicates, low-effort text) run first as pure code —
// only contradiction detection, which requires semantic understanding
// across answers, calls the LLM, and only when there's enough open-ended
// signal to check. The score/category synthesize both.
import { generateStructured } from "@/lib/llm/client";
import { ContradictionCheckSchema } from "@/lib/llm/schemas";
import type { Answer, Question, Response as ResponseRow } from "@prisma/client";
import { questionFromRow } from "@/lib/survey/db-mapping";
import type { QualityFlag, ResponseQualityResult } from "@/lib/survey/types";

const LOW_EFFORT_PATTERNS = [
  "idk",
  "i dont know",
  "i don't know",
  "n/a",
  "na",
  "none",
  "nothing",
  "asdf",
  "test",
  "no comment",
  "no",
  "-",
];

// A crude but effective gibberish check: real words have vowels and
// reasonable length variance; keyboard-mashing typically doesn't.
function looksLikeGibberish(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  if (trimmed.length < 3) return false;
  const words = trimmed.split(/\s+/);
  const noVowelWords = words.filter((w) => w.length > 2 && !/[aeiou]/.test(w));
  return noVowelWords.length / words.length > 0.5;
}

function isLowEffort(text: string): boolean {
  const trimmed = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  return LOW_EFFORT_PATTERNS.includes(trimmed) || trimmed.length <= 2;
}

interface DeterministicCheckArgs {
  response: ResponseRow;
  questionRows: Question[];
  answers: Answer[]; // this response's answers only
  allResponsesForStudy: ResponseRow[]; // for duplicate detection
  allAnswersForStudy: Answer[]; // for duplicate detection
}

function runDeterministicChecks(args: DeterministicCheckArgs): { flags: QualityFlag[]; positives: string[] } {
  const { response, questionRows, answers, allAnswersForStudy } = args;
  const flags: QualityFlag[] = [];
  const positives: string[] = [];
  const questionsById = new Map(questionRows.map((q) => [q.id, questionFromRow(q)]));

  // --- Speeding: unrealistically fast for the number of questions answered.
  if (response.completedAt) {
    const durationSeconds = (response.completedAt.getTime() - response.startedAt.getTime()) / 1000;
    const secondsPerQuestion = answers.length ? durationSeconds / answers.length : durationSeconds;
    if (secondsPerQuestion < 2 && answers.length >= 3) {
      flags.push({
        type: "speeding",
        description: `Completed ${answers.length} questions in ${Math.round(durationSeconds)}s (~${secondsPerQuestion.toFixed(1)}s/question) — unrealistically fast.`,
        severity: "high",
      });
    } else if (secondsPerQuestion < 4 && answers.length >= 3) {
      flags.push({
        type: "speeding",
        description: `Averaged ~${secondsPerQuestion.toFixed(1)}s per question — faster than typical careful reading.`,
        severity: "medium",
      });
    } else {
      positives.push("Normal completion speed");
    }
  }

  // --- Straight-lining: identical option chosen across every matrix row,
  // or the same single-choice/likert/rating value repeated across most
  // scale-type questions in the survey.
  const scaleAnswers: string[] = [];
  for (const a of answers) {
    const q = questionsById.get(a.questionId);
    if (!q) continue;
    if (q.type === "likert" || q.type === "rating" || q.type === "nps" || q.type === "emoji_scale") {
      scaleAnswers.push(String(JSON.parse(a.value)));
    }
    if (q.type === "matrix") {
      const rowAnswers = JSON.parse(a.value) as Record<string, string>;
      const values = Object.values(rowAnswers);
      if (values.length >= 3 && values.every((v) => v === values[0])) {
        flags.push({
          type: "straight_lining",
          description: `Selected the same option for all ${values.length} rows in a matrix question.`,
          severity: "medium",
        });
      }
    }
  }
  if (scaleAnswers.length >= 4) {
    const allSame = scaleAnswers.every((v) => v === scaleAnswers[0]);
    if (allSame) {
      flags.push({
        type: "straight_lining",
        description: `Gave the identical rating/scale answer (${scaleAnswers[0]}) on all ${scaleAnswers.length} scale questions.`,
        severity: "medium",
      });
    } else {
      positives.push("Consistent, varied answers across scale questions");
    }
  }

  // --- Gibberish / low-effort text.
  let meaningfulTextCount = 0;
  let textAnswerCount = 0;
  for (const a of answers) {
    const q = questionsById.get(a.questionId);
    if (!q || (q.type !== "short_text" && q.type !== "long_text")) continue;
    const value = JSON.parse(a.value);
    if (typeof value !== "string" || !value.trim()) continue;
    textAnswerCount++;
    if (looksLikeGibberish(value)) {
      flags.push({
        type: "gibberish",
        description: `Open-text answer to "${q.text.slice(0, 40)}…" looks like gibberish: "${value.slice(0, 30)}"`,
        severity: "high",
      });
    } else if (isLowEffort(value)) {
      flags.push({
        type: "low_effort_text",
        description: `Low-effort answer to "${q.text.slice(0, 40)}…": "${value}"`,
        severity: "low",
      });
    } else {
      meaningfulTextCount++;
    }
  }
  if (textAnswerCount > 0 && meaningfulTextCount === textAnswerCount) {
    positives.push("Meaningful open-text responses");
  }

  // --- Duplicate responses: another response in this study with an
  // identical answer set (same values for every shared question).
  const thisAnswerMap = new Map(answers.map((a) => [a.questionId, a.value]));
  const otherResponseIds = new Set(
    allAnswersForStudy.filter((a) => a.responseId !== response.id).map((a) => a.responseId),
  );
  for (const otherId of otherResponseIds) {
    const otherAnswers = allAnswersForStudy.filter((a) => a.responseId === otherId);
    if (otherAnswers.length !== thisAnswerMap.size || otherAnswers.length === 0) continue;
    const identical = otherAnswers.every((a) => thisAnswerMap.get(a.questionId) === a.value);
    if (identical) {
      flags.push({
        type: "duplicate_response",
        description: `Answers are identical to another response (possible duplicate submission).`,
        severity: "medium",
      });
      break;
    }
  }

  // --- Bot-like: combination signal, not a separate raw check — if 3+
  // other flags fired together, it reads as automated rather than a person
  // who was just fast or terse on one question.
  const highSeverityCount = flags.filter((f) => f.severity === "high").length;
  if (flags.length >= 3 && highSeverityCount >= 1) {
    flags.push({
      type: "bot_like",
      description: "Multiple quality signals fired together, consistent with automated/careless completion.",
      severity: "high",
    });
  }

  return { flags, positives };
}

/** Contradiction detection needs semantic understanding across the
 * response's own answers (e.g. "never used Feature X" vs "use it daily"),
 * so it's the one check that calls the LLM — and only when there's more
 * than one substantive answer to compare. */
async function checkContradictions(
  questionRows: Question[],
  answers: Answer[],
): Promise<QualityFlag[]> {
  const questionsById = new Map(questionRows.map((q) => [q.id, questionFromRow(q)]));
  const substantive = answers
    .map((a) => {
      const q = questionsById.get(a.questionId);
      if (!q) return null;
      const value = JSON.parse(a.value);
      if (value == null || value === "") return null;
      return { question: q.text, answer: typeof value === "object" ? JSON.stringify(value) : String(value) };
    })
    .filter((x): x is { question: string; answer: string } => x !== null);

  if (substantive.length < 2) return [];

  const result = await generateStructured({
    system: `You check a single survey response's answers for direct logical
contradictions BETWEEN TWO OR MORE of its answers — e.g. answering "never
used this feature" to one question and "use it every day" to another.

A contradiction requires at least two answers that conflict with each
other. Never report a single answer restated on its own — that is not a
contradiction, it is just an answer. Only flag GENUINE, direct conflicts;
different opinions, nuance, or a critical answer alongside a positive one
are NOT contradictions (e.g. "confusing" + a low confidence rating are
consistent with each other, not contradictory). Most responses have none
— an empty array is the expected, correct answer far more often than not.

Each string in "contradictions" MUST name both conflicting answers, in the
form: "Answered '<X>' to '<question A>' but '<Y>' to '<question B>'."`,
    user: `Answers from one response:
${substantive.map((s) => `Q: ${s.question}\nA: ${s.answer}`).join("\n\n")}

Return JSON: { "contradictions": string[] } — empty array if none found.`,
    schema: ContradictionCheckSchema,
    temperature: 0.1,
    maxTokens: 400,
  });

  // Defensive filter: a genuine contradiction description contrasts two
  // answers (typically via "but"/"vs"/"while", per the prompt's required
  // format) and is longer than a single restated answer. A bare echo of
  // one answer — which is what this model sometimes produces despite the
  // tightened prompt — is short and lacks any contrast marker.
  const genuine = result.contradictions.filter(
    (desc) => desc.length > 40 && /\b(but|however|vs\.?|while|whereas|yet)\b/i.test(desc),
  );

  // Cap contradiction flags per response — even a genuine set rarely
  // exceeds 1-2; more than that is a sign the check is still over-firing
  // and every extra "high" severity flag is disproportionate to the score.
  return genuine.slice(0, 2).map((desc) => ({
    type: "contradiction" as const,
    description: desc,
    severity: "high" as const,
  }));
}

export async function assessResponseQuality(args: {
  response: ResponseRow;
  questionRows: Question[];
  answers: Answer[];
  allResponsesForStudy: ResponseRow[];
  allAnswersForStudy: Answer[];
}): Promise<ResponseQualityResult> {
  const { flags: deterministicFlags, positives } = runDeterministicChecks(args);
  const contradictionFlags = await checkContradictions(args.questionRows, args.answers).catch(() => []);
  const flags = [...deterministicFlags, ...contradictionFlags];

  // Score: start at 100, deduct per flag by severity, floor at 0.
  const deductions: Record<QualityFlag["severity"], number> = { low: 5, medium: 15, high: 30 };
  const score = Math.max(0, 100 - flags.reduce((sum, f) => sum + deductions[f.severity], 0));

  const category =
    score >= 85 ? "high_quality" : score >= 60 ? "normal" : score >= 35 ? "needs_review" : "suspicious";

  return {
    responseId: args.response.id,
    score,
    category,
    flags,
    positiveIndicators: positives,
  };
}
