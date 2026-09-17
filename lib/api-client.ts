// Thin fetch wrappers for client components. Every AI-backed call can take
// a while on a local 4B model, so callers should show loading state — these
// helpers just centralize the request/error shape.
import type { AnalysisResult, FollowUpQA, ResearchPlan, ReviewIssue, Survey } from "@/lib/survey/types";

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

  getResults: (id: string) =>
    request<{
      dashboardStats: {
        totalResponses: number;
        completedResponses: number;
        completionRate: number;
        avgCompletionTimeSeconds: number | null;
      };
      questionStats: Array<{
        question: Survey["questions"][number];
        chartKind: string;
        responseCount: number;
        skipCount: number;
        optionCounts?: { label: string; value: string; count: number }[];
        numericValues?: number[];
        npsBreakdown?: { promoters: number; passives: number; detractors: number; score: number };
        rawTextAnswers?: string[];
        rawAnswers: { responseId: string; value: unknown }[];
      }>;
    }>(`/api/studies/${id}/results`),

  analyze: (id: string, force = false) =>
    request<{ analysis: AnalysisResult; cached: boolean } | { error: string }>(
      `/api/studies/${id}/analyze`,
      { method: "POST", body: JSON.stringify({ force }) },
    ),

  exportCsvUrl: (id: string) => `/api/studies/${id}/export`,
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
};
