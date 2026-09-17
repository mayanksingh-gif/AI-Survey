"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Beaker, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { EvidenceStrength, Insight } from "@/lib/survey/types";

const STRENGTH_STYLES: Record<EvidenceStrength, string> = {
  strong: "border-sage/40 text-sage bg-sage/5",
  moderate: "border-chart-3/40 text-foreground bg-accent/40",
  early_signal: "border-signal/40 text-signal bg-signal/5",
  insufficient_data: "border-destructive/40 text-destructive bg-destructive/5",
};

const STRENGTH_LABELS: Record<EvidenceStrength, string> = {
  strong: "Strong evidence",
  moderate: "Moderate evidence",
  early_signal: "Early signal",
  insufficient_data: "Insufficient data",
};

export function InsightCard({ insight, studyId }: { insight: Insight; studyId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function createFollowUp() {
    setCreating(true);
    try {
      const { study } = await api.createFollowUpStudy(studyId, insight.id);
      toast.success("Follow-up study created");
      router.push(`/studies/${study.id}/plan`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create follow-up study");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Finding</p>
          <p className="text-sm font-medium leading-snug">{insight.finding}</p>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${STRENGTH_STYLES[insight.evidenceStrength]}`}>
          {STRENGTH_LABELS[insight.evidenceStrength]}
        </Badge>
      </div>

      <div>
        <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1">Evidence</p>
        <ul className="space-y-1">
          {insight.evidence.map((e, i) => (
            <li key={i} className="text-xs text-foreground/80 flex gap-1.5">
              <span className="text-muted-foreground">·</span>
              {e.description}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground mt-1.5 italic">{insight.evidenceStrengthReason}</p>
      </div>

      <div>
        <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
          Possible hypothesis
        </p>
        <p className="text-xs text-foreground/80">{insight.hypothesis}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
            Recommended action
          </p>
          <p className="text-xs text-foreground/80">{insight.recommendedAction}</p>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1">
            Next research
          </p>
          <p className="text-xs text-foreground/80">{insight.nextResearch}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-border flex justify-end">
        {insight.followUpStudyId ? (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => router.push(`/studies/${insight.followUpStudyId}/plan`)}
          >
            <Beaker className="size-3.5" />
            View Follow-Up Study
            <ArrowRight className="size-3.5" />
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 text-xs" onClick={createFollowUp} disabled={creating}>
            {creating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            Create Follow-Up Study
          </Button>
        )}
      </div>
    </div>
  );
}
