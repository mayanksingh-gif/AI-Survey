import { z } from "zod";
import {
  EXPERIENCE_MODES,
  INTERACTION_LEVELS,
  ADAPTIVE_FOLLOWUP_MODES,
  QUESTION_TYPES,
  SURVEY_TYPES,
  SUGGESTION_CATEGORIES,
  QUALITY_FLAG_TYPES,
  THEME_KINDS,
} from "@/lib/survey/types";

export const QuestionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  imageUrl: z.string().optional(),
});

export const BranchingRuleSchema = z.object({
  when: z.string().min(1),
  goTo: z.string().min(1),
});

export const QuestionExtraConfigSchema = z.object({
  matrixRows: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  categorizeItems: z.array(z.string()).optional(),
  comparisonItems: z.array(z.string()).optional(),
  emojiSet: z.array(z.string()).optional(),
  allowMultiple: z.boolean().optional(),
  personalized: z.boolean().optional(),
});

export const MediaRefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["image", "audio", "video"]),
  url: z.string().min(1),
  mimeType: z.string().min(1),
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
  extraConfig: QuestionExtraConfigSchema.optional(),
  stimulusMedia: z.array(MediaRefSchema).optional(),
  allowMediaResponse: z.boolean().optional(),
  allowAdaptiveFollowUp: z.boolean().optional(),
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
  interactionLevel: z.enum(INTERACTION_LEVELS).optional(),
  interactionLevelRationale: z.string().optional(),
  adaptiveFollowUpMode: z.enum(ADAPTIVE_FOLLOWUP_MODES).optional(),
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
  interactionLevel: z.enum(INTERACTION_LEVELS),
  interactionLevelRationale: z.string().min(1),
});

// --- Survey Editor / Optimizer ---------------------------------------------

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

// Local 4B models occasionally emit a near-miss sentiment value (wrong case,
// or a close synonym like "critical"/"concerned") that would otherwise fail
// validation on both the original attempt AND the one repair retry. This
// normalizes common variants before the strict enum check, rather than
// spending the retry budget on something recoverable in code.
const SentimentSchema = z.preprocess((val) => {
  if (typeof val !== "string") return val;
  const lower = val.toLowerCase().trim();
  if (["positive", "negative", "neutral", "mixed"].includes(lower)) return lower;
  if (/(critical|concern|frustrat|angry|upset|disappoint)/.test(lower)) return "negative";
  if (/(happy|satisf|pleas|delight|praise)/.test(lower)) return "positive";
  if (/(mixed|both|split)/.test(lower)) return "mixed";
  return "neutral";
}, z.enum(["positive", "negative", "neutral", "mixed"]));

export const TextThemeSchema = z.object({
  theme: z.string().min(1),
  mentionCount: z.number().int().min(0),
  sentiment: SentimentSchema,
  sampleQuotes: z.array(z.string()).default([]),
  kind: z.enum(THEME_KINDS).optional(),
  subthemes: z.array(z.string()).optional(),
  percentageOfRelevant: z.number().min(0).max(1).optional(),
  relatedQuestionIds: z.array(z.string()).optional(),
});

export const AnalysisResultSchema = z.object({
  executiveSummary: z.string().min(1),
  keyFindings: z.array(KeyFindingSchema),
  themes: z.array(TextThemeSchema),
});

// --- V2: Smarter AI — Adaptive Follow-up Agent ------------------------------

export const AdaptiveFollowUpDecisionSchema = z.object({
  /** Whether a further probe is warranted at all. */
  shouldAsk: z.boolean(),
  /** Required when shouldAsk is true. */
  followUpQuestion: z.string().optional(),
  /** Brief internal rationale, not shown to the respondent — used for
   * debugging/audit, and to keep the model from asking reflexively. */
  reason: z.string().min(1),
});

// --- V2: Smarter AI — Research Suggestions ----------------------------------

export const ResearchSuggestionItemSchema = z.object({
  id: z.string().min(1),
  category: z.enum(SUGGESTION_CATEGORIES),
  title: z.string().min(1),
  description: z.string().min(1),
  suggestedQuestion: SurveyQuestionSchema.optional(),
});

export const ResearchSuggestionsResultSchema = z.object({
  suggestions: z.array(ResearchSuggestionItemSchema),
});

// --- V2: Insight -> Action ---------------------------------------------------

export const EvidenceItemSchema = z.object({
  description: z.string().min(1),
  kind: z.enum(["quantitative", "qualitative"]),
  questionId: z.string().optional(),
});

// Note: deliberately does NOT include evidenceStrength/evidenceStrengthReason
// — that verdict is computed by lib/ai/evidence-engine.ts from real stats,
// never asserted by the model about its own output. See lib/ai/insight-generator.ts.
export const InsightGenerationResultSchema = z.object({
  finding: z.string().min(1),
  evidence: z.array(EvidenceItemSchema).min(1),
  hypothesis: z.string().min(1),
  recommendedAction: z.string().min(1),
  nextResearch: z.string().min(1),
  relatedQuestionIds: z.array(z.string()).default([]),
});

// --- V2: Respondent Quality Detection ----------------------------------------

export const QualityFlagSchema = z.object({
  type: z.enum(QUALITY_FLAG_TYPES),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
});

// Note: no top-level "assess this response's quality" schema — score and
// category are computed deterministically in lib/ai/quality-engine.ts from
// real signals (speed, straight-lining, gibberish, duplicates), never
// self-assessed by the model. The only LLM call in that pipeline is the
// narrow contradiction check below.
export const ContradictionCheckSchema = z.object({
  contradictions: z.array(z.string()).default([]),
});

// --- V2: Ask Your Research ---------------------------------------------------

export const AskResearchAnswerSchema = z.object({
  answer: z.string().min(1),
  /** Evidence lines the answer relies on — surfaced under "View Supporting
   * Responses" so claims are traceable, never just asserted. */
  evidence: z.array(z.string()).default([]),
  relatedQuestionIds: z.array(z.string()).default([]),
});

// --- V2: Multimedia analysis --------------------------------------------------

export const MediaAnalysisResultSchema = z.object({
  themes: z.array(z.string()).default([]),
  sentiment: SentimentSchema.optional(),
  keyPoints: z.array(z.string()).default([]),
  description: z.string().optional(),
});
