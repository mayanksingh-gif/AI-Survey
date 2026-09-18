// Pure checks for missing media on a survey before publishing. A
// "card_choice" question is specifically the visual-comparison type (e.g.
// "Which design do you prefer?"), so its options are expected to carry an
// image — if any option is missing one, the respondent would see a blank
// card. This never blocks publishing, it's purely advisory (surfaced as a
// warning on the Share page).
import type { Survey, SurveyQuestion } from "@/lib/survey/types";

export interface MissingImageIssue {
  questionId: string;
  questionText: string;
  /** Option labels/positions missing an image, for card_choice. */
  missingOptionLabels: string[];
}

export function findMissingImages(survey: Survey): MissingImageIssue[] {
  const issues: MissingImageIssue[] = [];
  for (const q of survey.questions) {
    if (q.type !== "card_choice") continue;
    const missing = q.options.filter((opt) => !opt.imageUrl).map((opt) => opt.label);
    if (missing.length > 0) {
      issues.push({ questionId: q.id, questionText: q.text, missingOptionLabels: missing });
    }
  }
  return issues;
}

export function questionNeedsImages(question: SurveyQuestion): boolean {
  return question.type === "card_choice";
}
