import type { AnswerValue } from "@/components/survey-runtime/question-input";
import type { Survey, SurveyQuestion } from "@/lib/survey/types";

/** Given the just-answered question and its value, resolve which question
 * comes next (or null to mean "go to thank-you"). Falls back to the next
 * question in order when no branching rule matches. */
export function resolveNextQuestionId(
  survey: Survey,
  current: SurveyQuestion,
  value: AnswerValue,
): string | null {
  const answerValues = Array.isArray(value) ? value : [String(value ?? "")];

  if (current.branching?.length) {
    for (const rule of current.branching) {
      if (answerValues.includes(rule.when)) {
        return rule.goTo === "end" ? null : rule.goTo;
      }
    }
  }

  const sorted = [...survey.questions].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((q) => q.id === current.id);
  const next = sorted[idx + 1];
  return next ? next.id : null;
}
