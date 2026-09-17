"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface FunnelStage {
  questionId: string;
  label: string;
  reachedCount: number;
}

/** V2 Survey Funnel: Started -> each question in order -> Completed, with
 * per-stage abandonment. Clicking a stage surfaces which respondents
 * reached it (delegated to the parent via onInspect, since fetching those
 * responses needs a network call this component shouldn't own). */
export function FunnelChart({
  stages,
  onInspect,
}: {
  stages: FunnelStage[];
  onInspect?: (stage: FunnelStage) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const max = stages[0]?.reachedCount || 1;

  return (
    <div className="space-y-1.5">
      {stages.map((stage, i) => {
        const pct = (stage.reachedCount / max) * 100;
        const prev = stages[i - 1];
        const dropOff = prev ? prev.reachedCount - stage.reachedCount : 0;
        const dropOffPct = prev && prev.reachedCount ? Math.round((dropOff / prev.reachedCount) * 100) : 0;

        return (
          <div key={stage.questionId}>
            <button
              onClick={() => onInspect?.(stage)}
              onMouseEnter={() => setHovered(stage.questionId)}
              onMouseLeave={() => setHovered(null)}
              className="w-full text-left group"
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs truncate max-w-[70%]">{stage.label}</span>
                <span className="text-xs font-mono text-muted-foreground">{stage.reachedCount}</span>
              </div>
              <div className="h-6 rounded-md bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-md transition-all bg-chart-1 group-hover:opacity-80",
                    hovered === stage.questionId && "opacity-80",
                  )}
                  style={{ width: `${pct}%`, backgroundColor: "var(--color-chart-1)" }}
                />
              </div>
            </button>
            {i > 0 && dropOff > 0 && (
              <p className="text-[11px] text-destructive/80 mt-0.5">
                −{dropOff} dropped off here ({dropOffPct}%)
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
