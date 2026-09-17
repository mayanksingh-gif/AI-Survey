// Ask Your Research: a grounded Q&A agent over a study's actual data.
// Given a user's question, it's handed real computed stats, raw open-text
// answers, themes/sentiment, and the existing AI analysis — never asked to
// reason from vibes. Every answer must cite concrete evidence lines the UI
// can show under "View Supporting Responses".
import { generateStructured } from "@/lib/llm/client";
import { AskResearchAnswerSchema } from "@/lib/llm/schemas";
import type { AnalysisResult } from "@/lib/survey/types";
import type { DashboardStats, QuestionStats } from "@/lib/survey/stats";

const SYSTEM = `You are "Ask Your Research" — a research analyst embedded in
a survey results dashboard. You answer questions about THIS study only,
grounded strictly in the data you're given: computed statistics, raw
open-text answers, extracted themes/sentiment, and any existing executive
summary/findings. Every claim in your answer must be traceable to that
data — cite specific numbers, counts, or quoted/paraphrased open-text
mentions in "evidence". Never invent a statistic that isn't in the
provided data. If the data can't answer the question, say so plainly
rather than speculating.

When asked to compare groups (e.g. "compare new vs returning users"), only
compare groups the data actually distinguishes — if segment data isn't
provided, say you don't have that breakdown rather than guessing.

When asked about causation ("what is causing X"), describe correlations
and plausible contributing factors evidenced by the data, but do not claim
causation was proven — surveys measure correlation, not causation.

Populate relatedQuestionIds with the ids of any questions your answer
draws on, so the UI can link back to them.`;

export async function askResearch(args: {
  question: string;
  dashboardStats: DashboardStats;
  questionStats: QuestionStats[];
  existingAnalysis: AnalysisResult | null;
  conversationHistory: { role: "user" | "assistant"; content: string }[];
}): Promise<{ answer: string; evidence: string[]; relatedQuestionIds: string[] }> {
  const groundTruth = {
    dashboardStats: args.dashboardStats,
    perQuestion: args.questionStats.map((q) => ({
      questionId: q.question.id,
      questionText: q.question.text,
      type: q.question.type,
      responseCount: q.responseCount,
      skipCount: q.skipCount,
      optionCounts: q.optionCounts,
      numericValues: q.numericValues,
      npsBreakdown: q.npsBreakdown,
      rawTextAnswers: q.rawTextAnswers,
      medianTimeSeconds: q.medianTimeSeconds,
    })),
    existingAnalysis: args.existingAnalysis,
  };

  const historyText = args.conversationHistory.length
    ? `\n\nPrior conversation in this session:\n${args.conversationHistory
        .map((h) => `${h.role === "user" ? "User" : "You"}: ${h.content}`)
        .join("\n")}`
    : "";

  return generateStructured({
    system: SYSTEM,
    user: `Ground-truth data:
${JSON.stringify(groundTruth, null, 2)}${historyText}

User's question: "${args.question}"

Return JSON: { "answer": string, "evidence": string[], "relatedQuestionIds": string[] }`,
    schema: AskResearchAnswerSchema,
    temperature: 0.3,
    maxTokens: 1200,
  });
}
