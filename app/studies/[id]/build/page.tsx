"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useStudy } from "@/lib/study-context";
import { AiChatEmptyHint, AiChatPanel } from "@/components/survey-builder/ai-chat-panel";
import { SurveyFlowPanel } from "@/components/survey-builder/survey-flow-panel";
import { ReviewerPanel } from "@/components/survey-builder/reviewer-panel";
import { SuggestionsPanel } from "@/components/survey-builder/suggestions-panel";
import { SurveyRunner } from "@/components/survey-runtime/survey-runner";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import type { Survey } from "@/lib/survey/types";

export default function BuildPage() {
  const { study, loading } = useStudy();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every persist() call; a save's response is only applied if
  // it's still the most recent one requested — otherwise a slower earlier
  // save landing after a newer edit would stomp that newer edit with
  // stale (though still real, just outdated) ids/content.
  const saveToken = useRef(0);

  useEffect(() => {
    // Seeds local editable state from the fetched study; local `survey` then
    // diverges intentionally as the user edits, so this can't be computed
    // during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (study?.survey) setSurvey(study.survey);
  }, [study?.survey]);

  const persist = useCallback(
    (next: Survey) => {
      if (!study) return;
      setSaveState("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const token = ++saveToken.current;
      saveTimer.current = setTimeout(async () => {
        const { survey: saved } = await api.saveSurvey(study.id, next);
        // Adopt the server's response — a newly-added question (client-
        // side placeholder id from SurveyFlowPanel's "Add question") gets
        // its real database id back here. Skipping this left the client
        // holding a stale id that a subsequent image/media upload on that
        // same question would then fail against. Only apply it if no
        // newer save has been requested since — otherwise this response
        // is already outdated and would stomp a more recent edit.
        if (token === saveToken.current) setSurvey(saved);
        setSaveState("saved");
      }, 500);
    },
    [study],
  );

  function handleSurveyChange(next: Survey) {
    setSurvey(next);
    persist(next);
  }

  function handleAiUpdate(next: Survey) {
    setSurvey(next);
    setSaveState("saved");
  }

  if (loading || !study) {
    return (
      <div className="grid grid-cols-3 gap-4 h-[70vh]">
        <Skeleton className="rounded-xl" />
        <Skeleton className="rounded-xl" />
        <Skeleton className="rounded-xl" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-md mx-auto text-center py-24 text-sm text-muted-foreground">
        Generate a survey from the Plan tab to start building.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-medium">{survey.title}</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {saveState === "saving" && (
            <>
              <Loader2 className="size-3 animate-spin" /> Saving…
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="size-3 text-sage" /> Saved
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-4 h-[calc(100vh-260px)] min-h-[560px]">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {survey ? (
            <AiChatPanel studyId={study.id} onSurveyUpdated={handleAiUpdate} />
          ) : (
            <AiChatEmptyHint />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <SurveyFlowPanel survey={survey} studyId={study.id} onSurveyChange={handleSurveyChange} />
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          <div className="rounded-xl border border-border bg-muted/30 p-6 flex-1 flex items-center justify-center">
            <SurveyRunner survey={survey} studyId={study.id} />
          </div>
          <SuggestionsPanel studyId={study.id} onSurveyUpdated={handleAiUpdate} />
          <ReviewerPanel studyId={study.id} onFixApplied={handleAiUpdate} />
        </div>
      </div>
    </div>
  );
}
