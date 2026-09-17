// Research Analyst: computed stats (ground truth, from lib/survey/stats.ts)
// -> executive summary + evidence-backed key findings + open-text themes.
// The LLM is explicitly given the real numbers and instructed to cite only
// those — it never computes percentages itself.
import { generateStructured } from "@/lib/llm/client";
import { AnalysisResultSchema } from "@/lib/llm/schemas";
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
- themes: for open-text questions, identify recurring themes with an accurate
  mentionCount drawn from the provided text answers, a sentiment, and 1-2
  short verbatim sample quotes pulled from the actual answers given.
If there are no open-text answers, return an empty themes array. If there are
too few responses to say anything meaningful, say that plainly.`;

export async function analyzeResponses(
  dashboardStats: DashboardStats,
  questionStats: QuestionStats[],
): Promise<AnalysisResult> {
  const groundTruth = {
    dashboardStats,
    perQuestion: questionStats.map((q) => ({
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
"sentiment": "positive"|"negative"|"neutral"|"mixed", "sampleQuotes": string[]}] }`,
    schema: AnalysisResultSchema,
    temperature: 0.3,
    maxTokens: 1800,
  });

  return { ...result, generatedAt: new Date().toISOString() };
}
