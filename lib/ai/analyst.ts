// Research Analyst: computed stats (ground truth, from lib/survey/stats.ts)
// -> executive summary + evidence-backed key findings + open-text themes.
// The LLM is explicitly given the real numbers and instructed to cite only
// those — it never computes percentages itself.
import { generateStructured } from "@/lib/llm/client";
import { AnalysisResultSchema } from "@/lib/llm/schemas";
import { THEME_KINDS } from "@/lib/survey/types";
import type { DashboardStats, QuestionStats } from "@/lib/survey/stats";
import type { AnalysisResult } from "@/lib/survey/types";

const SYSTEM = `You are the Research Analyst inside an AI research copilot.
You are given pre-computed, ground-truth statistics for a survey's
responses — you must NEVER invent, estimate, or round numbers yourself.
Every number in your output must be one that appears in the provided data
(or a direct arithmetic restatement of it, e.g. "21 of 50 respondents" for a
42% figure that was given to you). If the data is too thin to support a
claim, say so plainly instead of fabricating specifics.

Write:
- executiveSummary: 2-4 sentences, plain language, the single most useful
  takeaway a stakeholder needs.
- keyFindings: each with a short title and an "evidence" string that cites
  the actual number/percentage from the data.
- themes: for open-text questions, identify recurring themes. For each:
  - mentionCount: an accurate count drawn from the provided text answers
  - percentageOfRelevant: mentionCount / total open-text answers for that
    question, as a 0-1 fraction you compute yourself from the given counts
  - sentiment, kind (one of: ${THEME_KINDS.join(", ")}), subthemes if any
  - sampleQuotes: 1-2 short verbatim quotes actually pulled from the answers
  - relatedQuestionIds if the theme spans more than one open-text question
  Separate distinct kinds of theme rather than lumping everything together —
  e.g. a recurring pain point is a different theme from a feature request,
  even if mentioned by the same respondents. Flag any genuine contradiction
  you notice between respondents as its own theme with kind "contradiction",
  and any single unusual response as kind "outlier" (not as a "theme" with
  mentionCount 1 mixed into a real pattern).
If there are no open-text answers, return an empty themes array. If there are
too few responses to say anything meaningful, say that plainly.`;

export async function analyzeResponses(
  dashboardStats: DashboardStats,
  questionStats: QuestionStats[],
): Promise<AnalysisResult> {
  const groundTruth = {
    dashboardStats,
    perQuestion: questionStats.map((q) => ({
      questionId: q.question.id,
      questionText: q.question.text,
      type: q.question.type,
      responseCount: q.responseCount,
      skipCount: q.skipCount,
      optionCounts: q.optionCounts,
      numericValues: q.numericValues,
      npsBreakdown: q.npsBreakdown,
      rawTextAnswers: q.rawTextAnswers,
    })),
  };

  const result = await generateStructured({
    system: SYSTEM,
    user: `Ground-truth data:
${JSON.stringify(groundTruth, null, 2)}

Return JSON: { "executiveSummary": string, "keyFindings": [{"title": string,
"evidence": string}], "themes": [{"theme": string, "mentionCount": number,
"percentageOfRelevant"?: number, "sentiment": "positive"|"negative"|"neutral"|"mixed",
"kind"?: string, "subthemes"?: string[], "sampleQuotes": string[],
"relatedQuestionIds"?: string[]}] }`,
    schema: AnalysisResultSchema,
    temperature: 0.3,
    maxTokens: 2200,
  });

  return { ...result, generatedAt: new Date().toISOString() };
}
