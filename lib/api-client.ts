// Thin fetch wrappers for client components. Every AI-backed call can take
// a while on a local 4B model, so callers should show loading state — these
// helpers just centralize the request/error shape.
import type {
  AdaptiveFollowUpMode,
  AnalysisResult,
  FollowUpQA,
  Insight,
  InteractionLevel,
  ResearchPlan,
  ResearchSuggestionItem,
  ResponseQualityResult,
  ReviewIssue,
  Survey,
} from "@/lib/survey/types";
import type { DashboardStats, QuestionStats } from "@/lib/survey/stats";
import type { SegmentFilter } from "@/lib/survey/segments";
import type { CrossQuestionResult } from "@/lib/survey/cross-question";

export class ApiError extends Error {}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export interface StudySummary {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "live" | "closed";
  researchGoal: string;
  responseCount: number;
  updatedAt: string;
  createdAt: string;
}

export const api = {
  listStudies: () => request<{ studies: StudySummary[] }>("/api/studies"),

  createStudy: (researchGoal: string) =>
    request<{ study: StudySummary & { id: string } }>("/api/studies", {
      method: "POST",
      body: JSON.stringify({ researchGoal }),
    }),

  getStudy: (id: string) =>
    request<{
      study: {
        id: string;
        slug: string;
        title: string;
        status: string;
        researchGoal: string;
        followUps: FollowUpQA[];
        researchPlan: ResearchPlan | null;
        survey: Survey | null;
        experienceMode: string;
        responseCount: number;
        surveyVersion: number;
        analysisCache: string | null;
        adaptiveFollowUpMode: AdaptiveFollowUpMode;
        interactionLevel: InteractionLevel;
        interactionLevelRationale: string | null;
        parentInsightId: string | null;
      };
    }>(`/api/studies/${id}`),

  updateStudy: (id: string, data: Record<string, unknown>) =>
    request(`/api/studies/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteStudy: (id: string) => request(`/api/studies/${id}`, { method: "DELETE" }),

  getFollowUps: (id: string) =>
    request<{ followUpQuestions: string[] }>(`/api/studies/${id}/plan/followups`, {
      method: "POST",
    }),

  generatePlan: (id: string, followUps: FollowUpQA[]) =>
    request<{ plan: ResearchPlan }>(`/api/studies/${id}/plan/generate`, {
      method: "POST",
      body: JSON.stringify({ followUps }),
    }),

  generateSurvey: (id: string) =>
    request<{ survey: Survey }>(`/api/studies/${id}/generate`, { method: "POST" }),

  editSurvey: (id: string, instruction: string) =>
    request<{ survey: Survey; changeSummary: string }>(`/api/studies/${id}/edit`, {
      method: "POST",
      body: JSON.stringify({ instruction }),
    }),

  saveSurvey: (id: string, survey: Survey) =>
    request<{ survey: Survey }>(`/api/studies/${id}/survey`, {
      method: "PUT",
      body: JSON.stringify({ survey }),
    }),

  reviewSurvey: (id: string) =>
    request<{ issues: ReviewIssue[] }>(`/api/studies/${id}/review`, { method: "POST" }),

  applyFix: (id: string, fixedSurvey: Survey) =>
    request<{ survey: Survey }>(`/api/studies/${id}/review/apply`, {
      method: "POST",
      body: JSON.stringify({ fixedSurvey }),
    }),

  publishStudy: (id: string) =>
    request<{ study: StudySummary; publicUrl: string }>(`/api/studies/${id}/publish`, {
      method: "POST",
    }),

  // --- V2: Smarter AI — Research Suggestions -----------------------------

  getSuggestions: (id: string) =>
    request<{ suggestions: ResearchSuggestionItem[] }>(`/api/studies/${id}/suggestions`),

  refreshSuggestions: (id: string) =>
    request<{ suggestions: ResearchSuggestionItem[] }>(`/api/studies/${id}/suggestions`, {
      method: "POST",
    }),

  applySuggestion: (id: string, suggestionId: string) =>
    request<{ survey: Survey }>(`/api/studies/${id}/suggestions/apply`, {
      method: "POST",
      body: JSON.stringify({ suggestionId }),
    }),

  dismissSuggestion: (id: string, suggestionId: string) =>
    request(`/api/studies/${id}/suggestions/dismiss`, {
      method: "POST",
      body: JSON.stringify({ suggestionId }),
    }),

  getResults: (id: string, qualityFilter: string = "all") =>
    request<{
      dashboardStats: DashboardStats;
      questionStats: QuestionStats[];
    }>(`/api/studies/${id}/results?qualityFilter=${qualityFilter}`),

  analyze: (id: string, force = false, qualityFilter: string = "all") =>
    request<{ analysis: AnalysisResult; cached: boolean } | { error: string }>(
      `/api/studies/${id}/analyze`,
      { method: "POST", body: JSON.stringify({ force, qualityFilter }) },
    ),

  // --- V2: Respondent Quality Detection ---------------------------------

  getQuality: (id: string, force = false) =>
    request<{ quality: ResponseQualityResult[] }>(`/api/studies/${id}/quality?force=${force}`),

  exportCsvUrl: (id: string) => `/api/studies/${id}/export`,

  // --- V2: Much Better Analytics ------------------------------------------

  getFunnel: (id: string) =>
    request<{ funnel: { questionId: string; label: string; reachedCount: number }[] }>(
      `/api/studies/${id}/funnel`,
    ),

  getTrends: (id: string, granularity: "daily" | "weekly" | "monthly" = "daily") =>
    request<{
      trend: { bucket: string; count: number; completedCount: number }[];
      granularity: string;
    }>(`/api/studies/${id}/trends?granularity=${granularity}`),

  compareSegments: (id: string, filterA: SegmentFilter, filterB: SegmentFilter) =>
    request<{
      segmentA: { dashboardStats: DashboardStats; questionStats: QuestionStats[] };
      segmentB: { dashboardStats: DashboardStats; questionStats: QuestionStats[] };
    }>(`/api/studies/${id}/segments/compare`, {
      method: "POST",
      body: JSON.stringify({ filterA, filterB }),
    }),

  crossQuestion: (id: string, filterQuestionId: string, filterValue: string, targetQuestionId: string) =>
    request<{ result: CrossQuestionResult }>(`/api/studies/${id}/cross-question`, {
      method: "POST",
      body: JSON.stringify({ filterQuestionId, filterValue, targetQuestionId }),
    }),

  askResearch: (id: string, question: string, history: { role: "user" | "assistant"; content: string }[]) =>
    request<{ answer: string; evidence: string[]; relatedQuestionIds: string[] } | { error: string }>(
      `/api/studies/${id}/ask`,
      { method: "POST", body: JSON.stringify({ question, history }) },
    ),

  // --- V2: Insight -> Action ------------------------------------------------

  getInsights: (id: string) => request<{ insights: Insight[] }>(`/api/studies/${id}/insights`),

  generateInsight: (id: string, focusHint?: string) =>
    request<{ insight: Insight } | { error: string }>(`/api/studies/${id}/insights`, {
      method: "POST",
      body: JSON.stringify({ focusHint }),
    }),

  createFollowUpStudy: (id: string, insightId: string) =>
    request<{ study: StudySummary & { id: string } }>(
      `/api/studies/${id}/insights/${insightId}/follow-up-study`,
      { method: "POST" },
    ),
};

// --- Public (respondent-facing), no auth ---------------------------------

export const publicApi = {
  getSurvey: (slug: string) =>
    request<{ studyId: string; status: string; surveyVersion: number; survey: Survey }>(
      `/api/public/${slug}`,
    ),

  startResponse: (slug: string, isPreview: boolean) =>
    request<{ responseId: string }>(`/api/public/${slug}/responses`, {
      method: "POST",
      body: JSON.stringify({ isPreview }),
    }),

  saveAnswer: (
    slug: string,
    responseId: string,
    payload: {
      answer?: { questionId: string; value: unknown };
      questionPath?: string[];
      complete?: boolean;
    },
  ) =>
    request(`/api/public/${slug}/responses/${responseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  checkAdaptiveFollowUp: (slug: string, responseId: string, baseQuestionId: string, baseAnswer: string) =>
    request<
      | { shouldAsk: false; reason: string }
      | { shouldAsk: true; followUp: { id: string; question: string } }
    >(`/api/public/${slug}/responses/${responseId}/adaptive-followup`, {
      method: "POST",
      body: JSON.stringify({ baseQuestionId, baseAnswer }),
    }),

  answerAdaptiveFollowUp: (slug: string, responseId: string, followUpId: string, answer: string) =>
    request(`/api/public/${slug}/responses/${responseId}/adaptive-followup`, {
      method: "PATCH",
      body: JSON.stringify({ followUpId, answer }),
    }),
};
