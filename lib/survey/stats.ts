// Pure, deterministic computation over stored responses/answers. This is the
// "ground truth" the Research Analyst is given — it must cite these numbers,
// never invent its own, per the PRD's "never invent numbers" requirement.
import type { Answer, Question, Response as ResponseRow } from "@prisma/client";
import { questionFromRow } from "@/lib/survey/db-mapping";
import { chartKindForQuestionType } from "@/lib/survey/charts";
import type { SurveyQuestion } from "@/lib/survey/types";

export interface DashboardStats {
  totalResponses: number;
  completedResponses: number;
  completionRate: number; // 0-1
  avgCompletionTimeSeconds: number | null;
}

export function computeDashboardStats(responses: ResponseRow[]): DashboardStats {
  const real = responses.filter((r) => !r.isPreview);
  const completed = real.filter((r) => r.status === "completed");
  const durations = completed
    .filter((r) => r.completedAt)
    .map((r) => (r.completedAt!.getTime() - r.startedAt.getTime()) / 1000)
    .filter((s) => s >= 0);

  return {
    totalResponses: real.length,
    completedResponses: completed.length,
    completionRate: real.length ? completed.length / real.length : 0,
    avgCompletionTimeSeconds: durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null,
  };
}

export interface OptionCount {
  label: string;
  value: string;
  count: number;
}

export interface QuestionStats {
  question: SurveyQuestion;
  chartKind: ReturnType<typeof chartKindForQuestionType>;
  responseCount: number;
  skipCount: number;
  optionCounts?: OptionCount[]; // choice / yes_no / likert / ranking / card_choice / categorize
  numericValues?: number[]; // rating / slider / nps / emoji_scale raw values
  npsBreakdown?: { promoters: number; passives: number; detractors: number; score: number };
  rawTextAnswers?: string[]; // short_text / long_text
  rawAnswers: { responseId: string; value: unknown }[];
  /** matrix: per-row option counts, same shape as top-level optionCounts */
  matrixRowCounts?: { row: string; optionCounts: OptionCount[] }[];
  /** pairwise_comparison: win count per candidate item */
  pairwiseWinCounts?: OptionCount[];
}

/**
 * `answersByQuestion` should already be scoped to non-preview, and ideally
 * completed-or-in-progress-but-answered responses — caller decides scope.
 */
export function computeQuestionStats(
  questionRows: Question[],
  answers: Answer[],
  totalNonPreviewResponses: number,
): QuestionStats[] {
  const answersByQuestion = new Map<string, Answer[]>();
  for (const a of answers) {
    const list = answersByQuestion.get(a.questionId) ?? [];
    list.push(a);
    answersByQuestion.set(a.questionId, list);
  }

  return questionRows
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((row) => {
      const question = questionFromRow(row);
      const qAnswers = answersByQuestion.get(row.id) ?? [];
      const chartKind = chartKindForQuestionType(question.type);
      const rawAnswers = qAnswers.map((a) => ({
        responseId: a.responseId,
        value: JSON.parse(a.value),
      }));

      const stats: QuestionStats = {
        question,
        chartKind,
        responseCount: qAnswers.length,
        skipCount: Math.max(0, totalNonPreviewResponses - qAnswers.length),
        rawAnswers,
      };

      if (question.type === "short_text" || question.type === "long_text") {
        stats.rawTextAnswers = rawAnswers.map((a) => String(a.value ?? "")).filter(Boolean);
        return stats;
      }

      if (question.type === "rating" || question.type === "slider" || question.type === "emoji_scale") {
        stats.numericValues = rawAnswers
          .map((a) => Number(a.value))
          .filter((v) => Number.isFinite(v));
        return stats;
      }

      if (question.type === "nps") {
        const values = rawAnswers.map((a) => Number(a.value)).filter((v) => Number.isFinite(v));
        stats.numericValues = values;
        const promoters = values.filter((v) => v >= 9).length;
        const passives = values.filter((v) => v >= 7 && v <= 8).length;
        const detractors = values.filter((v) => v <= 6).length;
        const total = values.length || 1;
        stats.npsBreakdown = {
          promoters,
          passives,
          detractors,
          score: Math.round(((promoters - detractors) / total) * 100),
        };
        return stats;
      }

      if (question.type === "ranking") {
        // value is string[] (ranked option values, best first) -> score by
        // position (first place = N points, last = 1 point).
        const scoreByValue = new Map<string, number>();
        for (const { value } of rawAnswers) {
          const ranked = Array.isArray(value) ? (value as string[]) : [];
          ranked.forEach((v, idx) => {
            scoreByValue.set(v, (scoreByValue.get(v) ?? 0) + (ranked.length - idx));
          });
        }
        stats.optionCounts = question.options.map((opt) => ({
          label: opt.label,
          value: opt.value,
          count: scoreByValue.get(opt.value) ?? 0,
        }));
        return stats;
      }

      if (question.type === "matrix") {
        const rows = question.extraConfig?.matrixRows ?? [];
        stats.matrixRowCounts = rows.map((row) => {
          const counts = new Map<string, number>();
          for (const { value } of rawAnswers) {
            const rowAnswers = (value as Record<string, string>) ?? {};
            const v = rowAnswers[row];
            if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
          }
          return {
            row,
            optionCounts: question.options.map((opt) => ({
              label: opt.label,
              value: opt.value,
              count: counts.get(opt.value) ?? 0,
            })),
          };
        });
        return stats;
      }

      if (question.type === "categorize") {
        // Aggregate: how many times each category received an item, across
        // all respondents (a respondent contributes 1 per category they used).
        const categories = question.extraConfig?.categories ?? [];
        const counts = new Map<string, number>();
        for (const { value } of rawAnswers) {
          const byCategory = (value as Record<string, string[]>) ?? {};
          for (const cat of categories) {
            counts.set(cat, (counts.get(cat) ?? 0) + (byCategory[cat]?.length ?? 0));
          }
        }
        stats.optionCounts = categories.map((cat) => ({
          label: cat,
          value: cat,
          count: counts.get(cat) ?? 0,
        }));
        return stats;
      }

      if (question.type === "pairwise_comparison") {
        const items = question.extraConfig?.comparisonItems ?? question.options.map((o) => o.value);
        const wins = new Map<string, number>();
        for (const { value } of rawAnswers) {
          const rounds = (value as Record<string, string>) ?? {};
          for (const winner of Object.values(rounds)) {
            wins.set(winner, (wins.get(winner) ?? 0) + 1);
          }
        }
        stats.pairwiseWinCounts = items.map((item) => ({
          label: item,
          value: item,
          count: wins.get(item) ?? 0,
        }));
        return stats;
      }

      // single_choice, multiple_choice, yes_no, likert, swipe_card, card_choice
      // -> count per option
      const counts = new Map<string, number>();
      for (const { value } of rawAnswers) {
        const values = Array.isArray(value) ? (value as string[]) : [String(value)];
        for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const options =
        question.type === "yes_no" || question.type === "swipe_card"
          ? question.options.length
            ? question.options
            : [
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]
          : question.options;
      stats.optionCounts = options.map((opt) => ({
        label: opt.label,
        value: opt.value,
        count: counts.get(opt.value) ?? 0,
      }));
      return stats;
    });
}
