import { z } from "zod";
import { EXPERIENCE_MODES, QUESTION_TYPES, SURVEY_TYPES } from "@/lib/survey/types";

export const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const BranchingRuleSchema = z.object({
  when: z.string().min(1),
  goTo: z.string().min(1),
});

export const SurveyQuestionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().min(0),
  type: z.enum(QUESTION_TYPES),
  text: z.string().min(1),
  helpText: z.string().optional(),
  options: z.array(QuestionOptionSchema).default([]),
  required: z.boolean().default(true),
  branching: z.array(BranchingRuleSchema).optional(),
});

export const ScreenCopySchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
});

export const SurveySchema = z.object({
  title: z.string().min(1),
  welcomeScreen: ScreenCopySchema,
  thankYouScreen: ScreenCopySchema,
  questions: z.array(SurveyQuestionSchema).min(1),
  experienceMode: z.enum(EXPERIENCE_MODES),
});

// --- Research Strategist -----------------------------------------------

export const FollowUpQuestionsSchema = z.object({
  followUpQuestions: z.array(z.string().min(1)).max(5),
});

export const ResearchPlanSchema = z.object({
  surveyType: z.enum(SURVEY_TYPES),
  audience: z.string().min(1),
  sampleSize: z.number().int().min(1),
  durationMinutes: z.string().min(1),
  questionCount: z.number().int().min(1),
  metric: z.string().min(1),
  distributionMethod: z.string().min(1),
  experienceMode: z.enum(EXPERIENCE_MODES),
  rationale: z.string().min(1),
});

// --- Survey Editor --------------------------------------------------------

export const EditResultSchema = z.object({
  survey: SurveySchema,
  changeSummary: z.string().min(1),
});

// --- Survey Reviewer -------------------------------------------------------

export const ReviewIssueSchema = z.object({
  id: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  category: z.enum([
    "leading_question",
    "confusing_wording",
    "duplicate",
    "double_barrelled",
    "too_long",
    "poor_order",
    "missing_options",
  ]),
  questionId: z.string().optional(),
  description: z.string().min(1),
  fixedSurvey: SurveySchema,
});

export const ReviewResultSchema = z.object({
  issues: z.array(ReviewIssueSchema),
});

// --- Research Analyst --------------------------------------------------------

export const KeyFindingSchema = z.object({
  title: z.string().min(1),
  evidence: z.string().min(1),
});

export const TextThemeSchema = z.object({
  theme: z.string().min(1),
  mentionCount: z.number().int().min(0),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
  sampleQuotes: z.array(z.string()).default([]),
});

export const AnalysisResultSchema = z.object({
  executiveSummary: z.string().min(1),
  keyFindings: z.array(KeyFindingSchema),
  themes: z.array(TextThemeSchema),
});
