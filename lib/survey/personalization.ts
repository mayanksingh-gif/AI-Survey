// V2: Personalized Survey Paths — resolves `{{previousAnswer:<questionId>}}`
// tokens in a question's text/helpText using answers already given in this
// response, so later questions can naturally reference what the respondent
// said (e.g. "You mentioned shipping was difficult. What specifically
// should we improve?"). Branching (which question comes next) is handled
// separately by lib/survey/branching.ts — this only affects question COPY.
import type { AnswerValue, SurveyQuestion } from "@/lib/survey/types";

const TOKEN_RE = /\{\{previousAnswer:([^}]+)\}\}/g;

function formatAnswer(value: AnswerValue): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return Object.values(value).join(", ");
  return String(value);
}

/** Returns a copy of the question with any personalization tokens in
 * text/helpText resolved against `answers`. Questions not marked
 * extraConfig.personalized are returned unchanged (avoids scanning every
 * question's text on every render for no reason). */
export function personalizeQuestion(
  question: SurveyQuestion,
  answers: Record<string, AnswerValue>,
): SurveyQuestion {
  if (!question.extraConfig?.personalized) return question;

  const resolve = (text: string) =>
    text.replace(TOKEN_RE, (_match, questionId: string) => {
      const answer = answers[questionId.trim()];
      const formatted = formatAnswer(answer);
      return formatted || "that";
    });

  return {
    ...question,
    text: resolve(question.text),
    helpText: question.helpText ? resolve(question.helpText) : question.helpText,
  };
}
