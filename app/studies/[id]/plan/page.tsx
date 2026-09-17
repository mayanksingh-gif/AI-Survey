"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";
import { useStudy } from "@/lib/study-context";
import { GoalCard } from "@/components/study/plan/goal-card";
import { FollowUpFlow } from "@/components/study/plan/follow-up-flow";
import { ResearchPlanCard } from "@/components/study/plan/research-plan-card";
import { AdaptiveFollowUpSetting } from "@/components/study/plan/adaptive-followup-setting";
import { DesignerJokes } from "@/components/brand/designer-jokes";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { FollowUpQA } from "@/lib/survey/types";

export default function PlanPage() {
  const { study, loading, refresh } = useStudy();
  const router = useRouter();
  const [stage, setStage] = useState<"followups" | "generating-plan" | "plan-ready">(
    "followups",
  );
  const [generatingSurvey, setGeneratingSurvey] = useState(false);

  if (loading || !study) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const hasPlan = !!study.researchPlan;

  async function handleFollowUpsDone(followUps: FollowUpQA[]) {
    setStage("generating-plan");
    try {
      await api.generatePlan(study!.id, followUps);
      await refresh();
      setStage("plan-ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate research plan");
      setStage("followups");
    }
  }

  async function handleGenerateSurvey() {
    setGeneratingSurvey(true);
    try {
      await api.generateSurvey(study!.id);
      await refresh();
      router.push(`/studies/${study!.id}/build`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate survey");
      setGeneratingSurvey(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <GoalCard goal={study.researchGoal} />

      {!hasPlan && stage !== "generating-plan" && (
        <FollowUpFlow studyId={study.id} onDone={handleFollowUpsDone} />
      )}

      {stage === "generating-plan" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Copilot is designing a research plan…
          </div>
          <DesignerJokes />
        </div>
      )}

      {hasPlan && study.researchPlan && (
        <>
          <ResearchPlanCard plan={study.researchPlan} />
          <AdaptiveFollowUpSetting studyId={study.id} value={study.adaptiveFollowUpMode} />
          {generatingSurvey && (
            <div className="rounded-xl border border-border bg-card p-6">
              <DesignerJokes />
            </div>
          )}
          <div className="flex justify-end">
            <Button size="lg" onClick={handleGenerateSurvey} disabled={generatingSurvey} className="gap-2">
              {generatingSurvey ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating survey…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Generate Survey
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
