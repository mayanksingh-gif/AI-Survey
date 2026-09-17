"use client";

import { useState } from "react";
import { Loader2, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { segmentLabel, type SegmentFilter } from "@/lib/survey/segments";
import { toast } from "sonner";
import type { DashboardStats, QuestionStats } from "@/lib/survey/stats";

const PRESETS: { label: string; filterA: SegmentFilter; filterB: SegmentFilter }[] = [
  {
    label: "Completed vs Abandoned",
    filterA: { kind: "completion", status: "completed" },
    filterB: { kind: "completion", status: "abandoned" },
  },
  {
    label: "Mobile vs Desktop",
    filterA: { kind: "device", deviceType: "mobile" },
    filterB: { kind: "device", deviceType: "desktop" },
  },
];

type ScopedStats = { dashboardStats: DashboardStats; questionStats: QuestionStats[] };

export function SegmentComparisonPanel({ studyId }: { studyId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ a: ScopedStats; b: ScopedStats; labelA: string; labelB: string } | null>(
    null,
  );

  async function runComparison(preset: (typeof PRESETS)[number]) {
    setLoading(true);
    try {
      const { segmentA, segmentB } = await api.compareSegments(studyId, preset.filterA, preset.filterB);
      setResult({
        a: segmentA,
        b: segmentB,
        labelA: segmentLabel(preset.filterA),
        labelB: segmentLabel(preset.filterB),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not compare segments");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users2 className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Segments</p>
        </div>
        <div className="flex gap-1.5">
          {PRESETS.map((p) => (
            <Button
              key={p.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => runComparison(p)}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-3 animate-spin" /> : p.label}
            </Button>
          ))}
        </div>
      </div>

      {!result && !loading && (
        <p className="text-xs text-muted-foreground">
          Compare respondent segments side by side — pick a comparison above.
        </p>
      )}

      {result && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: result.labelA, stats: result.a.dashboardStats },
            { label: result.labelB, stats: result.b.dashboardStats },
          ].map((side) => (
            <div key={side.label} className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium mb-2">{side.label}</p>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Responses</dt>
                  <dd className="font-mono">{side.stats.totalResponses}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Completion rate</dt>
                  <dd className="font-mono">{Math.round(side.stats.completionRate * 100)}%</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Avg. time</dt>
                  <dd className="font-mono">
                    {side.stats.avgCompletionTimeSeconds != null
                      ? `${Math.round(side.stats.avgCompletionTimeSeconds)}s`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
