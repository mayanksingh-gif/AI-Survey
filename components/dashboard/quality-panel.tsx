"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { QualityCategory, ResponseQualityResult } from "@/lib/survey/types";

const CATEGORY_STYLES: Record<QualityCategory, string> = {
  high_quality: "border-sage/40 text-sage bg-sage/5",
  normal: "border-border text-muted-foreground",
  needs_review: "border-signal/40 text-signal bg-signal/5",
  suspicious: "border-destructive/40 text-destructive bg-destructive/5",
};

const CATEGORY_LABELS: Record<QualityCategory, string> = {
  high_quality: "High Quality",
  normal: "Normal",
  needs_review: "Needs Review",
  suspicious: "Suspicious",
};

export function QualityPanel({
  studyId,
  onFilterChange,
}: {
  studyId: string;
  onFilterChange?: (filter: string) => void;
}) {
  const [quality, setQuality] = useState<ResponseQualityResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high_and_normal" | "exclude_suspicious">("all");

  async function load(force = false) {
    setLoading(true);
    try {
      const { quality } = await api.getQuality(studyId, force);
      setQuality(quality);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not compute quality scores");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: synchronizing with the server-computed quality scores.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId]);

  function setFilterAndNotify(next: typeof filter) {
    setFilter(next);
    onFilterChange?.(next);
  }

  const counts = quality?.reduce<Record<string, number>>((acc, q) => {
    acc[q.category] = (acc[q.category] ?? 0) + 1;
    return acc;
  }, {});
  const flagged = quality?.filter((q) => q.category === "needs_review" || q.category === "suspicious") ?? [];

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Response Quality</p>
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => load(true)} disabled={loading}>
          {loading ? <Loader2 className="size-3 animate-spin" /> : null}
          {quality === null ? "Check quality" : "Recheck"}
        </Button>
      </div>

      {counts && (
        <div className="flex gap-1.5 flex-wrap mb-3">
          {(Object.keys(CATEGORY_LABELS) as QualityCategory[]).map((cat) => (
            <Badge key={cat} variant="outline" className={cn("text-[10px]", CATEGORY_STYLES[cat])}>
              {counts[cat] ?? 0} {CATEGORY_LABELS[cat]}
            </Badge>
          ))}
        </div>
      )}

      {quality && (
        <div className="flex gap-1.5 mb-3">
          {(["all", "high_and_normal", "exclude_suspicious"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterAndNotify(f)}
              className={cn(
                "text-[11px] px-2 py-1 rounded-full border transition-colors",
                filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent/60",
              )}
            >
              {f === "all" ? "Include all" : f === "high_and_normal" ? "High + Normal only" : "Exclude suspicious"}
            </button>
          ))}
        </div>
      )}

      {quality && flagged.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-sage">
          <CheckCircle2 className="size-4" />
          No flagged responses.
        </div>
      )}

      {flagged.length > 0 && (
        <div className="space-y-2">
          {flagged.map((q) => (
            <div key={q.responseId} className={cn("rounded-lg border p-2.5", CATEGORY_STYLES[q.category])}>
              <button
                onClick={() => setExpandedId(expandedId === q.responseId ? null : q.responseId)}
                className="w-full flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                  <AlertTriangle className="size-3.5" />
                  Response {q.responseId.slice(-6)}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">{q.score}/100</Badge>
              </button>
              {expandedId === q.responseId && (
                <ul className="mt-2 space-y-1">
                  {q.flags.map((f, i) => (
                    <li key={i} className="text-[11px] text-foreground/80">
                      ⚠ {f.description}
                    </li>
                  ))}
                  {q.positiveIndicators.map((p, i) => (
                    <li key={`p${i}`} className="text-[11px] text-sage">
                      ✓ {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
