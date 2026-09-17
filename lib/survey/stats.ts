// Pure, deterministic computation over stored responses/answers. This is the
// "ground truth" the Research Analyst is given — it must cite these numbers,
// never invent its own, per the PRD's "never invent numbers" requirement.
import type { Answer, Question, Response as ResponseRow } from "@prisma/client";
import { questionFromRow } from "@/lib/survey/db-mapping";
import { chartKindForQuestionType } from "@/lib/survey/charts";
import type { SurveyQuestion } from "@/lib/survey/types";

export interface ResponseTrendPoint {
  /** ISO date (daily) or ISO week/month start, depending on requested bucket */
  bucket: string;
  count: number;
  completedCount: number;
}

export interface DashboardStats {
  totalResponses: number;
  completedResponses: number;
  completionRate: number; // 0-1
  avgCompletionTimeSeconds: number | null;
  /** V2: Much Better Analytics — Research Overview */
  medianCompletionTimeSeconds: number | null;
  abandonmentRate: number; // 0-1, 1 - completionRate (started but never finished)
  avgTimePerQuestionSeconds: number | null;
}

export function computeDashboardStats(responses: ResponseRow[]): DashboardStats {
  const real = responses.filter((r) => !r.isPreview);
  const completed = real.filter((r) => r.status === "completed");
  const durations = completed
    .filter((r) => r.completedAt)
    .map((r) => (r.completedAt!.getTime() - r.startedAt.getTime()) / 1000)
    .filter((s) => s >= 0)
    .sort((a, b) => a - b);

  const avgCompletionTimeSeconds = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;

  const avgQuestionsAnswered = completed.length
    ? completed.reduce((sum, r) => sum + (JSON.parse(r.questionPath || "[]") as string[]).length, 0) /
      completed.length
    : 0;

  return {
    totalResponses: real.length,
    completedResponses: completed.length,
    completionRate: real.length ? completed.length / real.length : 0,
    avgCompletionTimeSeconds,
    medianCompletionTimeSeconds: durations.length ? median(durations) : null,
    abandonmentRate: real.length ? 1 - completed.length / real.length : 0,
    avgTimePerQuestionSeconds:
      avgCompletionTimeSeconds != null && avgQuestionsAnswered > 0
        ? avgCompletionTimeSeconds / avgQuestionsAnswered
        : null,
  };
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** V2: Response Trends — bucket non-preview responses by day/week/month for
 * recurring/longitudinal studies. Buckets are UTC-based ISO date strings so
 * results are stable regardless of server timezone. */
export function computeResponseTrend(
  responses: ResponseRow[],
  granularity: "daily" | "weekly" | "monthly",
): ResponseTrendPoint[] {
  const real = responses.filter((r) => !r.isPreview);
  const buckets = new Map<string, { count: number; completedCount: number }>();

  for (const r of real) {
    const key = bucketKey(r.startedAt, granularity);
    const entry = buckets.get(key) ?? { count: 0, completedCount: 0 };
    entry.count += 1;
    if (r.status === "completed") entry.completedCount += 1;
    buckets.set(key, entry);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([bucket, v]) => ({ bucket, ...v }));
}

function bucketKey(date: Date, granularity: "daily" | "weekly" | "monthly"): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  if (granularity === "daily") return d.toISOString().slice(0, 10);
  if (granularity === "monthly") return d.toISOString().slice(0, 7);
  // weekly: Monday-anchored ISO week start
  const day = d.getUTCDay() || 7;
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

export interface FunnelStage {
  questionId: string | "start" | "completed";
  label: string;
  reachedCount: number;
}

/** V2: Survey Funnel — how many (non-preview) responses reached each
 * question, in order, ending with how many fully completed. "Reached" a
 * question means it appears in that response's questionPath OR it has an
 * Answer row for it (covers a respondent who reached but skipped an
 * optional question without answering). */
export function computeFunnel(
  questionRows: Question[],
  responses: ResponseRow[],
  answers: Answer[],
): FunnelStage[] {
  const real = responses.filter((r) => !r.isPreview);
  const sortedQuestions = questionRows.slice().sort((a, b) => a.order - b.order);
  const answeredQuestionIdsByResponse = new Map<string, Set<string>>();
  for (const a of answers) {
    const set = answeredQuestionIdsByResponse.get(a.responseId) ?? new Set<string>();
    set.add(a.questionId);
    answeredQuestionIdsByResponse.set(a.responseId, set);
  }

  const stages: FunnelStage[] = [{ questionId: "start", label: "Started", reachedCount: real.length }];

  for (const q of sortedQuestions) {
    let reached = 0;
    for (const r of real) {
      const path: string[] = JSON.parse(r.questionPath || "[]");
      const answeredSet = answeredQuestionIdsByResponse.get(r.id);
      if (path.includes(q.id) || answeredSet?.has(q.id)) reached++;
    }
    stages.push({ questionId: q.id, label: q.text, reachedCount: reached });
  }

  stages.push({
    questionId: "completed",
    label: "Completed",
    reachedCount: real.filter((r) => r.status === "completed").length,
  });

  return stages;
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
  /** V2 Time Analysis: median seconds spent on this question, approximated
   * as the gap between this and the previous answer's createdAt within the
   * same response. First-answered question in a response has no prior
   * answer to diff against, so it's excluded from this question's sample —
   * an approximation, not a precise per-question timer. */
  medianTimeSeconds?: number | null;
}

/** V2 Time Analysis: for each response, sort its answers by createdAt and
 * diff consecutive timestamps — the gap before answering question N
 * approximates time spent on question N. Returns the median gap per
 * question across all responses (median resists a few very slow/fast
 * outliers skewing the "slowest/fastest question" comparison). */
function computeTimePerQuestion(answers: Answer[]): Map<string, number> {
  const byResponse = new Map<string, Answer[]>();
  for (const a of answers) {
    const list = byResponse.get(a.responseId) ?? [];
    list.push(a);
    byResponse.set(a.responseId, list);
  }

  const gapsByQuestion = new Map<string, number[]>();
  for (const list of byResponse.values()) {
    const sorted = list.slice().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (let i = 1; i < sorted.length; i++) {
      const gapSeconds = (sorted[i].createdAt.getTime() - sorted[i - 1].createdAt.getTime()) / 1000;
      if (gapSeconds < 0 || gapSeconds > 600) continue; // skip negative/implausible gaps (e.g. resumed session)
      const list2 = gapsByQuestion.get(sorted[i].questionId) ?? [];
      list2.push(gapSeconds);
      gapsByQuestion.set(sorted[i].questionId, list2);
    }
  }

  const result = new Map<string, number>();
  for (const [questionId, gaps] of gapsByQuestion) {
    result.set(questionId, median(gaps.sort((a, b) => a - b)));
  }
  return result;
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

  const timeSecondsByQuestion = computeTimePerQuestion(answers);

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
        medianTimeSeconds: timeSecondsByQuestion.get(row.id) ?? null,
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
