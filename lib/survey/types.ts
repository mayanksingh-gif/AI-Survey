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
  // --- V2: Better Respondent Experience ---------------------------------
  "matrix", // grid of sub-questions (rows) x a shared scale (columns)
  "categorize", // drag items into 2+ labeled buckets
  "pairwise_comparison", // repeated forced-choice rounds between two options
  "swipe_card", // swipe-style binary choice, same answer shape as yes_no
  "card_choice", // large-card visual variant of single/multiple choice
  "emoji_scale", // emoji/reaction variant of rating
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Question types whose answer is a single string option value, same shape
 * as single_choice — used wherever code branches on "is this a simple
 * single-select" rather than listing every visual variant. */
export const SINGLE_SELECT_LIKE_TYPES: QuestionType[] = [
  "single_choice",
  "yes_no",
  "swipe_card",
  "card_choice",
];

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

// --- V2: Smarter AI — Adaptive Follow-ups ---------------------------------
export const ADAPTIVE_FOLLOWUP_MODES = ["off", "conservative", "balanced", "deep"] as const;
export type AdaptiveFollowUpMode = (typeof ADAPTIVE_FOLLOWUP_MODES)[number];

/** Max follow-up probes per base open-text question, by mode. Enforced both
 * as a hard ceiling in the agent and shown to users as "up to N follow-ups". */
export const ADAPTIVE_FOLLOWUP_MAX: Record<AdaptiveFollowUpMode, number> = {
  off: 0,
  conservative: 1,
  balanced: 2,
  deep: 4,
};

// --- V2: Better Respondent Experience — engagement/gamification ----------
export const INTERACTION_LEVELS = ["none", "light", "medium", "high"] as const;
export type InteractionLevel = (typeof INTERACTION_LEVELS)[number];

export interface QuestionOption {
  label: string;
  value: string;
  /** V2 multimedia: an image option can carry its own image (concept A/B
   * tests, image selection). Undefined for plain text options. */
  imageUrl?: string;
}

export interface BranchingRule {
  /** value (or one of, for multi-select) that triggers this rule */
  when: string;
  /** id of the question to jump to; omit / "end" to jump to the thank-you screen */
  goTo: string;
}

/** Type-specific extras that don't fit the shared QuestionOption[] shape.
 * Every field optional — only the fields relevant to a question's `type`
 * are populated; see lib/survey/types.ts QUESTION_TYPES for which type uses
 * which field. */
export interface QuestionExtraConfig {
  /** matrix: row labels; each row is answered against the shared `options` scale */
  matrixRows?: string[];
  /** categorize: bucket labels items get dragged into */
  categories?: string[];
  /** categorize: the items to sort into `categories` */
  categorizeItems?: string[];
  /** pairwise_comparison: the full set of candidates; each round shows 2 at a time */
  comparisonItems?: string[];
  /** emoji_scale: emoji glyphs, ordered worst -> best, parallel to `options` */
  emojiSet?: string[];
  /** personalization: when true, `text`/`helpText` may contain a
   * `{{previousAnswer:<questionId>}}` token resolved at render time —
   * see lib/survey/personalization.ts */
  personalized?: boolean;
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
  extraConfig?: QuestionExtraConfig;
  /** V2 multimedia: stimulus shown alongside the question (image/video/audio
   * the respondent views/listens to before answering). */
  stimulusMedia?: MediaRef[];
  /** V2 multimedia: respondent may answer with an uploaded image/audio/video
   * instead of (or in addition to) the normal answer control. */
  allowMediaResponse?: boolean;
  /** V2 adaptive follow-ups: allow the AI to probe this open-text question
   * further, subject to the study's adaptiveFollowUpMode. Defaults to true
   * for short_text/long_text; ignored for all other types. */
  allowAdaptiveFollowUp?: boolean;
}

export interface MediaRef {
  id: string;
  kind: "image" | "audio" | "video";
  url: string;
  mimeType: string;
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
  /** V2: how much interaction/gamification the runtime should apply on top
   * of the base question types (progress milestones, celebration, card
   * styling intensity). Independent from experienceMode's tone/pacing. */
  interactionLevel?: InteractionLevel;
  interactionLevelRationale?: string;
  /** V2: off | conservative | balanced | deep — see ADAPTIVE_FOLLOWUP_MODES */
  adaptiveFollowUpMode?: AdaptiveFollowUpMode;
}

/** The canonical shape of a respondent's answer to one question. Superset of
 * the original string | string[] | number | null — extended for matrix,
 * categorize, pairwise, and media-response answers. Kept here (not just in
 * the question-input component) since AI services and stats now read it too. */
export type AnswerValue =
  | string
  | string[]
  | number
  | null
  | Record<string, string> // matrix: { [rowLabel]: selectedOptionValue }
  | Record<string, string[]> // categorize: { [category]: itemLabel[] }
  | { mediaId: string; kind: "image" | "audio" | "video" }; // media response

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

export const THEME_KINDS = [
  "general",
  "pain_point",
  "feature_request",
  "positive_feedback",
  "negative_feedback",
  "contradiction",
  "outlier",
] as const;
export type ThemeKind = (typeof THEME_KINDS)[number];

export interface TextTheme {
  theme: string;
  mentionCount: number;
  sentiment: "positive" | "negative" | "neutral" | "mixed";
  sampleQuotes: string[];
  /** V2: richer qualitative breakdown (PRD "Better Qualitative Analysis"). */
  kind?: ThemeKind;
  subthemes?: string[];
  /** 0-1, mentionCount / relevant-open-text-response-count — computed in
   * code from real counts, never estimated by the LLM. */
  percentageOfRelevant?: number;
  relatedQuestionIds?: string[];
}

export interface AnalysisResult {
  executiveSummary: string;
  keyFindings: KeyFinding[];
  themes: TextTheme[];
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// V2: Smarter AI — Adaptive Follow-ups (respondent-facing)
// ---------------------------------------------------------------------------
export interface AdaptiveFollowUpTurn {
  id: string;
  order: number;
  question: string;
  answer: string | null;
}

// ---------------------------------------------------------------------------
// V2: Smarter AI — Research Suggestions
// ---------------------------------------------------------------------------
export const SUGGESTION_CATEGORIES = [
  "missing_objective",
  "uncovered_question",
  "low_value_question",
  "too_long",
  "poor_sequencing",
  "weak_options",
  "biased_wording",
  "branching_opportunity",
  "segment_recommendation",
  "sample_size_recommendation",
  "experience_recommendation",
] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export interface ResearchSuggestionItem {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  /** Present only for suggestions actionable via "Add Suggested Question". */
  suggestedQuestion?: SurveyQuestion;
  status: "open" | "applied" | "dismissed";
}

// ---------------------------------------------------------------------------
// V2: Insight -> Action
// ---------------------------------------------------------------------------
export const EVIDENCE_STRENGTHS = ["strong", "moderate", "early_signal", "insufficient_data"] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export interface EvidenceItem {
  /** Human-readable evidence line, e.g. "42% of respondents (21/50) rated
   * shipping selection difficult" — must be traceable to real computed data. */
  description: string;
  /** "quantitative" cites a stat; "qualitative" cites open-text mentions. */
  kind: "quantitative" | "qualitative";
  questionId?: string;
}

export interface Insight {
  id: string;
  studyId: string;
  finding: string;
  evidence: EvidenceItem[];
  hypothesis: string;
  recommendedAction: string;
  nextResearch: string;
  evidenceStrength: EvidenceStrength;
  evidenceStrengthReason: string;
  relatedQuestionIds: string[];
  followUpStudyId?: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// V2: Respondent Quality Detection
// ---------------------------------------------------------------------------
export const QUALITY_CATEGORIES = ["high_quality", "normal", "needs_review", "suspicious"] as const;
export type QualityCategory = (typeof QUALITY_CATEGORIES)[number];

export const QUALITY_FLAG_TYPES = [
  "speeding",
  "straight_lining",
  "gibberish",
  "duplicate_response",
  "contradiction",
  "low_effort_text",
  "bot_like",
] as const;
export type QualityFlagType = (typeof QUALITY_FLAG_TYPES)[number];

export interface QualityFlag {
  type: QualityFlagType;
  description: string;
  severity: "low" | "medium" | "high";
}

export interface ResponseQualityResult {
  responseId: string;
  score: number; // 0-100
  category: QualityCategory;
  flags: QualityFlag[];
  /** Positive indicators shown alongside flags, e.g. "Normal completion
   * speed" — so the score isn't only ever bad news. */
  positiveIndicators: string[];
}

export const ANALYTICS_FILTER_PRESETS = [
  "all",
  "high_and_normal",
  "exclude_suspicious",
  "custom",
] as const;
export type AnalyticsFilterPreset = (typeof ANALYTICS_FILTER_PRESETS)[number];
