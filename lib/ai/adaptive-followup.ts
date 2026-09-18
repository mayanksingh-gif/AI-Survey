// Adaptive Follow-Up Agent: decides, after a respondent answers an open-text
// question, whether a further probe would meaningfully improve the research
// — and if so, generates it. Runs live during a response, not at survey-
// design time. Bounded by the study's adaptiveFollowUpMode
// (off/conservative/balanced/deep -> ADAPTIVE_FOLLOWUP_MAX probes).
import { generateStructured } from "@/lib/llm/client";
import { AdaptiveFollowUpDecisionSchema } from "@/lib/llm/schemas";
import { ADAPTIVE_FOLLOWUP_MAX, type AdaptiveFollowUpMode } from "@/lib/survey/types";

const SYSTEM = `You are the Adaptive Follow-Up Agent inside an AI research
copilot, embedded live in a survey a respondent is currently taking. You see
the research goal, one base question, the respondent's answer, and any
follow-ups already asked in this chain. Decide whether ONE more follow-up
would meaningfully deepen the research, or whether enough detail has
already been collected.

Ask a follow-up when the answer:
- names a problem, feeling, or opinion WITHOUT saying what specifically
  caused it (e.g. "confusing", "frustrating", "it was fine", "too slow" —
  these are judgments, not descriptions of what happened)
- is shorter than what a genuinely complete answer to this specific
  question would need to be
- raises something that directly relates to the stated research goal but
  leaves the actually decision-relevant detail unstated
- contradicts an earlier answer in this same response, if you can see one

Do NOT ask a follow-up when:
- the answer already names a specific thing, step, feature, or reason (a
  concrete noun/detail is present, not just a feeling)
- the same ground would be covered again by asking
- you've already probed this chain enough to get the useful detail relative
  to the mode's guidance below

When you do ask, the follow-up must:
- reference the SPECIFIC word(s)/claim the respondent just used, not a
  generic "can you elaborate?" — e.g. if they said "the shipping step was
  confusing," ask about what specifically was confusing about shipping, not
  "what did you mean?"
- be neutral — never lead the respondent toward a particular answer
- be a single, short, natural question
- never repeat a question already asked in this chain, and never ask about
  something the answer already made specific`;

/** Deterministic pre-check, run before any LLM call. Catches the clear-cut
 * cases directly so probing behavior for "obviously vague" vs. "obviously
 * complete" answers doesn't depend on the local model's fairly noisy
 * judgment call — the LLM is only consulted for the genuinely ambiguous
 * middle. This is also what makes the feature actually consistent
 * (same input -> same outcome) rather than "sometimes appears, sometimes
 * doesn't" for equivalent answers. */
const VAGUE_JUDGMENT_WORDS = [
  "confusing", "confused", "frustrating", "frustrated", "annoying", "annoyed",
  "difficult", "hard", "easy", "fine", "ok", "okay", "good", "bad", "great",
  "terrible", "awful", "nice", "slow", "fast", "unclear", "clear", "weird",
  "strange", "bad experience", "good experience", "not great", "not good",
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** True if the answer is almost certainly too vague to be a complete
 * answer — e.g. "confusing", "it was bad", "not great" with nothing else. */
function isClearlyVague(answer: string): boolean {
  const trimmed = answer.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (trimmed.length === 0) return false;
  const words = wordCount(trimmed);
  // A one-or-two word answer that IS a judgment word (not a specific noun)
  // is the clearest case: "confusing.", "it was bad", "too slow".
  if (words <= 3 && VAGUE_JUDGMENT_WORDS.some((w) => trimmed.includes(w))) return true;
  return false;
}

/** True if the answer already contains enough concrete specificity that a
 * follow-up would very likely be redundant — long, or names something
 * beyond a bare judgment word. */
function isClearlySpecific(answer: string): boolean {
  const trimmed = answer.trim();
  if (wordCount(trimmed) >= 12) return true;
  // Numbers, quoted phrases, or capitalized multi-word noun phrases (e.g.
  // "the Shipping Options page") are strong specificity signals even in a
  // short answer.
  if (/\d/.test(trimmed)) return true;
  return false;
}

export async function decideAdaptiveFollowUp(args: {
  researchGoal: string;
  baseQuestionText: string;
  baseAnswer: string;
  priorFollowUps: { question: string; answer: string | null }[];
  mode: AdaptiveFollowUpMode;
}): Promise<{ shouldAsk: boolean; followUpQuestion?: string; reason: string }> {
  if (args.mode === "off") {
    return { shouldAsk: false, reason: "Adaptive follow-ups are turned off for this study." };
  }
  const maxProbes = ADAPTIVE_FOLLOWUP_MAX[args.mode];
  if (args.priorFollowUps.length >= maxProbes) {
    return {
      shouldAsk: false,
      reason: `Already asked the maximum ${maxProbes} follow-up(s) for mode "${args.mode}".`,
    };
  }

  // Deterministic fast paths — see isClearlyVague/isClearlySpecific docs.
  // Conservative mode still defers a "clearly vague" call to the LLM guard
  // below, since conservative's whole point is to probe less often even
  // when something looks vague.
  if (isClearlySpecific(args.baseAnswer)) {
    return { shouldAsk: false, reason: "Answer already contains specific detail (word count/number heuristic)." };
  }
  if (args.mode !== "conservative" && isClearlyVague(args.baseAnswer)) {
    return decideFollowUpQuestion(args, true);
  }

  return decideFollowUpQuestion(args, false);
}

async function decideFollowUpQuestion(
  args: {
    researchGoal: string;
    baseQuestionText: string;
    baseAnswer: string;
    priorFollowUps: { question: string; answer: string | null }[];
    mode: AdaptiveFollowUpMode;
  },
  knownVague: boolean,
): Promise<{ shouldAsk: boolean; followUpQuestion?: string; reason: string }> {
  const chainContext = args.priorFollowUps.length
    ? `\n\nFollow-ups already asked in this chain:\n${args.priorFollowUps
        .map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer ?? "(not yet answered)"}`)
        .join("\n")}`
    : "";

  const modeGuidance: Record<AdaptiveFollowUpMode, string> = {
    off: "",
    conservative: "Only ask if the answer is clearly vague or incomplete. Default to not asking.",
    balanced: "Ask when a follow-up would add real specificity, but don't probe simple/complete answers.",
    deep: "Be more willing to dig for detail, root causes, and specifics — but still never repeat ground already covered and still stop once genuinely enough detail exists.",
  };

  const vagueHint = knownVague
    ? `\n\nNote: this answer is a bare judgment word with no specific detail — a follow-up is almost certainly warranted here unless the chain has already extracted the relevant specifics.`
    : "";

  return generateStructured({
    system: `${SYSTEM}\n\nMode guidance for this study ("${args.mode}"): ${modeGuidance[args.mode]}${vagueHint}`,
    user: `Research goal: "${args.researchGoal}"

Base question: "${args.baseQuestionText}"
Respondent's answer: "${args.baseAnswer}"${chainContext}

Return JSON: { "shouldAsk": boolean, "followUpQuestion"?: string, "reason": string }`,
    schema: AdaptiveFollowUpDecisionSchema,
    temperature: 0.2,
    maxTokens: 300,
  });
}
