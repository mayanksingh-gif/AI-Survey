"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { useStudy } from "@/lib/study-context";
import { Skeleton } from "@/components/ui/skeleton";
import { SurveyRunner } from "@/components/survey-runtime/survey-runner";
import { publicApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export default function PreviewPage() {
  const { study, loading } = useStudy();
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [responseId, setResponseId] = useState<string | null>(null);

  if (loading || !study) {
    return <Skeleton className="h-[600px] w-full rounded-xl max-w-md mx-auto" />;
  }

  if (!study.survey) {
    return (
      <div className="max-w-md mx-auto text-center py-24 text-sm text-muted-foreground">
        Generate a survey first to preview it here.
      </div>
    );
  }

  async function ensurePreviewResponse() {
    if (responseId) return responseId;
    const { responseId: id } = await publicApi.startResponse(study!.slug, true);
    setResponseId(id);
    return id;
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
        <button
          onClick={() => setDevice("desktop")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            device === "desktop" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Monitor className="size-3.5" />
          Desktop
        </button>
        <button
          onClick={() => setDevice("mobile")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
            device === "mobile" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Smartphone className="size-3.5" />
          Mobile
        </button>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Preview responses are not counted — nothing you submit here appears in Results.
      </p>

      <div
        className={cn(
          "transition-all",
          device === "mobile"
            ? "w-[375px] rounded-[2rem] border-8 border-foreground/90 bg-foreground/90 p-1.5 shadow-xl"
            : "w-full max-w-2xl",
        )}
      >
        <div
          className={cn(
            "bg-muted/30 p-8 flex items-center justify-center overflow-y-auto",
            device === "mobile" ? "rounded-[1.5rem] h-[700px]" : "rounded-xl min-h-[600px] border border-border",
          )}
        >
          <SurveyRunner
            survey={study.survey}
            onStart={async () => {
              await ensurePreviewResponse();
            }}
            onAnswer={async (questionId, value) => {
              await ensurePreviewResponse();
              if (responseId) {
                await publicApi.saveAnswer(study.slug, responseId, { answer: { questionId, value } });
              }
            }}
            onComplete={async (path) => {
              if (responseId) {
                await publicApi.saveAnswer(study.slug, responseId, { questionPath: path, complete: true });
              }
            }}
            onCheckAdaptiveFollowUp={async (questionId, answer) => {
              const id = await ensurePreviewResponse();
              const result = await publicApi.checkAdaptiveFollowUp(study.slug, id!, questionId, answer);
              return result.shouldAsk ? { shouldAsk: true, followUp: result.followUp } : { shouldAsk: false };
            }}
            onAnswerAdaptiveFollowUp={async (followUpId, answer) => {
              if (responseId) {
                await publicApi.answerAdaptiveFollowUp(study.slug, responseId, followUpId, answer);
              }
            }}
            studyId={study.id}
            responseId={responseId}
          />
        </div>
      </div>
    </div>
  );
}
