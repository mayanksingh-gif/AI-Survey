// V2: Cross-Question Analysis — "people who answered X on question A, how
// did they answer question B?" Pure code, deterministic, no LLM involved in
// the computation itself (an LLM may narrate the result, but the numbers
// come from here). Explicitly reports correlation, never causation — the
// UI/AI copy layered on top must not imply causal claims either.
import type { Answer } from "@prisma/client";
import type { OptionCount } from "@/lib/survey/stats";
import type { SurveyQuestion } from "@/lib/survey/types";

export interface CrossQuestionResult {
  filterQuestionId: string;
  filterValue: string;
  targetQuestionId: string;
  /** Responses matching the filter, broken down by their target-question answer. */
  breakdown: OptionCount[];
  matchingResponseCount: number;
  /** For numeric target questions (rating/nps/slider/emoji_scale): average
   * value among the filtered group, for direct comparison against the
   * question's overall average. */
  averageValue?: number;
}

/** Filters responses to those that answered `filterQuestionId` with
 * `filterValue`, then tallies how that subset answered `targetQuestion`. */
export function computeCrossQuestion(
  answers: Answer[],
  filterQuestionId: string,
  filterValue: string,
  targetQuestion: SurveyQuestion,
): CrossQuestionResult {
  const filterAnswersByResponse = new Map<string, unknown>();
  for (const a of answers) {
    if (a.questionId === filterQuestionId) filterAnswersByResponse.set(a.responseId, JSON.parse(a.value));
  }

  const matchingResponseIds = new Set<string>();
  for (const [responseId, value] of filterAnswersByResponse) {
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    if (values.includes(filterValue)) matchingResponseIds.add(responseId);
  }

  const targetAnswers = answers.filter(
    (a) => a.questionId === targetQuestion.id && matchingResponseIds.has(a.responseId),
  );

  const isNumeric = ["rating", "nps", "slider", "emoji_scale"].includes(targetQuestion.type);
  if (isNumeric) {
    const values = targetAnswers.map((a) => Number(JSON.parse(a.value))).filter((v) => Number.isFinite(v));
    return {
      filterQuestionId,
      filterValue,
      targetQuestionId: targetQuestion.id,
      breakdown: [],
      matchingResponseCount: matchingResponseIds.size,
      averageValue: values.length ? values.reduce((a, b) => a + b, 0) / values.length : undefined,
    };
  }

  const counts = new Map<string, number>();
  for (const a of targetAnswers) {
    const value = JSON.parse(a.value);
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const options =
    targetQuestion.type === "yes_no" || targetQuestion.type === "swipe_card"
      ? targetQuestion.options.length
        ? targetQuestion.options
        : [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
      : targetQuestion.options;

  const breakdown: OptionCount[] = options.length
    ? options.map((opt) => ({ label: opt.label, value: opt.value, count: counts.get(opt.value) ?? 0 }))
    : Array.from(counts.entries()).map(([value, count]) => ({ label: value, value, count }));

  return {
    filterQuestionId,
    filterValue,
    targetQuestionId: targetQuestion.id,
    breakdown,
    matchingResponseCount: matchingResponseIds.size,
  };
}
