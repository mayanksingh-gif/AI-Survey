// SQLite has no native Json column, so Study/Question rows store JSON as
// String. These helpers convert between the Prisma row shape and the
// in-memory Survey/ResearchPlan types used everywhere else.
import type { Study, Question } from "@prisma/client";
import type {
  BranchingRule,
  FollowUpQA,
  QuestionOption,
  ResearchPlan,
  Survey,
  SurveyQuestion,
} from "@/lib/survey/types";

export function questionFromRow(row: Question): SurveyQuestion {
  return {
    id: row.id,
    order: row.order,
    type: row.type as SurveyQuestion["type"],
    text: row.text,
    helpText: row.helpText ?? undefined,
    options: JSON.parse(row.options) as QuestionOption[],
    required: row.required,
    branching: JSON.parse(row.branchingRules) as BranchingRule[],
    extraConfig: row.extraConfig ? JSON.parse(row.extraConfig) : undefined,
    allowMediaResponse: row.allowMediaResponse,
  };
}

export function surveyFromStudy(study: Study, questions: Question[]): Survey {
  return {
    title: study.surveyTitle ?? study.title,
    welcomeScreen: study.welcomeScreen
      ? JSON.parse(study.welcomeScreen)
      : { heading: study.title, body: "" },
    thankYouScreen: study.thankYouScreen
      ? JSON.parse(study.thankYouScreen)
      : { heading: "Thank you!", body: "Your response has been recorded." },
    questions: questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(questionFromRow),
    experienceMode: study.experienceMode as Survey["experienceMode"],
    interactionLevel: study.interactionLevel as Survey["interactionLevel"],
    interactionLevelRationale: study.interactionLevelRationale ?? undefined,
    adaptiveFollowUpMode: study.adaptiveFollowUpMode as Survey["adaptiveFollowUpMode"],
  };
}

export function researchPlanFromStudy(study: Study): ResearchPlan | null {
  return study.researchPlan ? JSON.parse(study.researchPlan) : null;
}

export function followUpsFromStudy(study: Study): FollowUpQA[] {
  return JSON.parse(study.followUps ?? "[]");
}
