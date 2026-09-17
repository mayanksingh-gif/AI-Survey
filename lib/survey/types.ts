// Core domain types shared by AI services, the builder UI, and the runtime.
// Kept independent of Prisma's model shape — lib/db-helpers.ts converts
// between this shape and the String-JSON columns SQLite stores.

export const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "yes_no",
  "short_text",
  "long_text",
  "rating",
  "likert",
  "nps",
  "slider",
  "ranking",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const SURVEY_TYPES = [
  "CSAT",
  "NPS",
  "CES",
  "Product Feedback",
  "UX / Usability",
  "Feature Prioritization",
  "Concept Testing",
  "Market Research",
  "Pricing Feedback",
  "Employee Feedback",
  "Event Feedback",
  "Onboarding",
  "Churn Survey",
  "Academic Research",
  "Lead Qualification",
  "Quiz / Assessment",
] as const;
export type SurveyType = (typeof SURVEY_TYPES)[number];

export const EXPERIENCE_MODES = ["professional", "conversational", "playful"] as const;
export type ExperienceMode = (typeof EXPERIENCE_MODES)[number];

export interface QuestionOption {
  label: string;
  value: string;
}

export interface BranchingRule {
  /** value (or one of, for multi-select) that triggers this rule */
  when: string;
  /** id of the question to jump to; omit / "end" to jump to the thank-you screen */
  goTo: string;
}

export interface SurveyQuestion {
  id: string;
  order: number;
  type: QuestionType;
  text: string;
  helpText?: string;
  options: QuestionOption[];
  required: boolean;
  branching?: BranchingRule[];
}

export interface ScreenCopy {
  heading: string;
  body: string;
}

export interface Survey {
  title: string;
  welcomeScreen: ScreenCopy;
  thankYouScreen: ScreenCopy;
  questions: SurveyQuestion[];
  experienceMode: ExperienceMode;
}

export interface FollowUpQA {
  question: string;
  answer: string;
}

export interface ResearchPlan {
  surveyType: SurveyType;
  audience: string;
  sampleSize: number;
  durationMinutes: string; // e.g. "3-4"
  questionCount: number;
  metric: string;
  distributionMethod: string;
  experienceMode: ExperienceMode;
  rationale: string;
}

export interface ReviewIssue {
  id: string;
  severity: "low" | "medium" | "high";
  category:
    | "leading_question"
    | "confusing_wording"
    | "duplicate"
    | "double_barrelled"
    | "too_long"
    | "poor_order"
    | "missing_options";
  questionId?: string;
  description: string;
  /** A complete replacement Survey reflecting the fix, applied wholesale on "Apply Fix". */
  fixedSurvey: Survey;
}

export interface KeyFinding {
  title: string;
  evidence: string; // must cite real computed numbers, e.g. "42% of respondents (21/50)"
}

export interface TextTheme {
  theme: string;
  mentionCount: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sampleQuotes: string[];
}

export interface AnalysisResult {
  executiveSummary: string;
  keyFindings: KeyFinding[];
  themes: TextTheme[];
  generatedAt: string;
}
