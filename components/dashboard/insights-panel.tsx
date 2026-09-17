"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InsightCard } from "@/components/dashboard/insight-card";
import { DesignerJokes } from "@/components/brand/designer-jokes";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Insight } from "@/lib/survey/types";

export function InsightsPanel({ studyId, hasResponses }: { studyId: string; hasResponses: boolean }) {
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api
      .getInsights(studyId)
      .then(({ insights }) => setInsights(insights))
      .catch(() => setInsights([]));
  }, [studyId]);

  async function generate() {
    setGenerating(true);
    try {
      const result = await api.generateInsight(studyId);
      if ("insight" in result) {
        setInsights((prev) => [result.insight, ...(prev ?? [])]);
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate an insight");
    } finally {
      setGenerating(false);
    }
  }

  if (!hasResponses) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Insight → Action
        </p>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Generate Insight
        </Button>
      </div>

      {generating && (
        <div className="rounded-xl border border-border bg-card p-6">
          <DesignerJokes />
        </div>
      )}

      {insights === null ? null : insights.length === 0 && !generating ? (
        <p className="text-xs text-muted-foreground">
          No insights yet — click Generate Insight to turn a finding into a documented hypothesis and
          recommended action.
        </p>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} studyId={studyId} />
          ))}
        </div>
      )}
    </div>
  );
}
