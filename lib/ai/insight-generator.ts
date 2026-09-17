// Insight Generator: computed stats -> Data -> Finding -> Evidence ->
// Hypothesis -> Recommended Action -> Next Research. The LLM proposes the
// finding/hypothesis/action/next-research narrative; the Evidence Engine
// (pure code, not the LLM) separately verifies evidence strength — the two
// are deliberately decoupled so the model can't grade its own homework.
import { generateStructured } from "@/lib/llm/client";
import { InsightGenerationResultSchema } from "@/lib/llm/schemas";
import { assessEvidenceStrength } from "@/lib/ai/evidence-engine";
import type { DashboardStats, QuestionStats } from "@/lib/survey/stats";
import type { Insight } from "@/lib/survey/types";

const SYSTEM = `You are the Insight Generator inside an AI research copilot.
Given a study's ground-truth stats, produce ONE well-evidenced insight
following this structure: finding -> evidence -> hypothesis ->
recommendedAction -> nextResearch.

- finding: one sentence stating what the data shows, in plain language.
- evidence: a list of concrete evidence lines, each citing real numbers
  from the provided data (kind: "quantitative" for stats, "qualitative" for
  open-text mentions). Never invent a number not present in the data.
- hypothesis: a plausible explanation for WHY the finding might be true —
  phrase as "may" / "could" / "possibly", never asserted as proven fact.
- recommendedAction: one concrete, specific action a team could take.
- nextResearch: one concrete follow-up research method to validate the
  hypothesis (e.g. a focused concept test, a specific follow-up survey, a
  qualitative interview approach) — specific enough that a new research
  plan could be generated from it.
- relatedQuestionIds: ids of every question this insight draws on.

If asked for an insight about a specific finding, focus on exactly that. If
no specific focus is given, pick the single most useful, well-evidenced
insight the data supports — prefer one grounded in the largest sample and
clearest signal over a marginal one.`;

export async function generateInsight(args: {
  studyId: string;
  researchGoal: string;
  dashboardStats: DashboardStats;
  questionStats: QuestionStats[];
  focusHint?: string; // e.g. "the shipping selection friction finding"
}): Promise<Insight> {
  const groundTruth = {
    dashboardStats: args.dashboardStats,
    perQuestion: args.questionStats.map((q) => ({
      questionId: q.question.id,
      questionText: q.question.text,
      type: q.question.type,
      responseCount: q.responseCount,
      optionCounts: q.optionCounts,
      numericValues: q.numericValues,
      npsBreakdown: q.npsBreakdown,
      rawTextAnswers: q.rawTextAnswers,
    })),
  };

  const generated = await generateStructured({
    system: SYSTEM,
    user: `Research goal: "${args.researchGoal}"

Ground-truth data:
${JSON.stringify(groundTruth, null, 2)}
${args.focusHint ? `\nFocus on: ${args.focusHint}` : ""}

Return JSON: { "finding": string, "evidence": [{"description": string,
"kind": "quantitative"|"qualitative", "questionId"?: string}],
"hypothesis": string, "recommendedAction": string, "nextResearch": string,
"relatedQuestionIds": string[] }`,
    schema: InsightGenerationResultSchema,
    temperature: 0.4,
    maxTokens: 1200,
  });

  const relatedStats = args.questionStats.filter((q) => generated.relatedQuestionIds.includes(q.question.id));
  const evidenceAssessment = assessEvidenceStrength({
    relatedQuestionStats: relatedStats.length ? relatedStats : args.questionStats,
    evidence: generated.evidence,
  });

  return {
    id: "", // assigned by the caller once persisted
    studyId: args.studyId,
    finding: generated.finding,
    evidence: generated.evidence,
    hypothesis: generated.hypothesis,
    recommendedAction: generated.recommendedAction,
    nextResearch: generated.nextResearch,
    evidenceStrength: evidenceAssessment.strength,
    evidenceStrengthReason: evidenceAssessment.reason,
    relatedQuestionIds: generated.relatedQuestionIds,
    createdAt: new Date().toISOString(),
  };
}
