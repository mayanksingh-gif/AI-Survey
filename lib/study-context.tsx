"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import type {
  AdaptiveFollowUpMode,
  FollowUpQA,
  InteractionLevel,
  ResearchPlan,
  Survey,
} from "@/lib/survey/types";

export interface StudyDetail {
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
}

interface StudyContextValue {
  study: StudyDetail | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setStudy: (s: StudyDetail) => void;
}

const StudyContext = createContext<StudyContextValue | null>(null);

export function StudyProvider({ studyId, children }: { studyId: string; children: React.ReactNode }) {
  const [study, setStudy] = useState<StudyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const { study } = await api.getStudy(studyId);
      setStudy(study as StudyDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load study");
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    // Fetch-on-mount: synchronizing with the server, not derived render state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return (
    <StudyContext.Provider value={{ study, loading, error, refresh, setStudy }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error("useStudy must be used within a StudyProvider");
  return ctx;
}
