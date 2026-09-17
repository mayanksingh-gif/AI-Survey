"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiLabel } from "@/components/brand/signal-glyph";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { AnalysisResult } from "@/lib/survey/types";

const SENTIMENT_STYLES: Record<AnalysisResult["themes"][number]["sentiment"], string> = {
  positive: "border-sage/40 text-sage bg-sage/5",
  negative: "border-destructive/40 text-destructive bg-destructive/5",
  neutral: "border-border text-muted-foreground",
  mixed: "border-signal/40 text-signal bg-signal/5",
};

export function AiAnalysisPanel({ studyId, hasResponses }: { studyId: string; hasResponses: boolean }) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  async function runAnalysis(force = false) {
    setLoading(true);
    try {
      const result = await api.analyze(studyId, force);
      if ("analysis" in result) setAnalysis(result.analysis);
      else toast.error(result.error);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
      setAttempted(true);
    }
  }

  useEffect(() => {
    // Fetch-on-mount: synchronizing with the server-computed analysis cache.
    // runAnalysis is intentionally omitted — it's stable in behavior for a
    // given studyId and re-including it would refire on every render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasResponses) runAnalysis(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId, hasResponses]);

  if (!hasResponses) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No responses yet — the AI summary appears once respondents complete the survey.
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Copilot is analyzing responses…
      </div>
    );
  }

  if (!analysis) {
    return attempted ? null : null;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <AiLabel>Executive summary</AiLabel>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => runAnalysis(true)} disabled={loading}>
            {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            Refresh
          </Button>
        </div>
        <p className="font-heading text-lg leading-relaxed">{analysis.executiveSummary}</p>
      </div>

      {analysis.keyFindings.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground mb-3">
            Key findings
          </p>
          <ul className="space-y-3">
            {analysis.keyFindings.map((f, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-xs text-signal mt-1">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-sm font-medium">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.evidence}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.themes.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground mb-3">
            Open-text themes
          </p>
          <div className="space-y-3">
            {analysis.themes.map((t, i) => (
              <div key={i} className={`rounded-lg border p-3 ${SENTIMENT_STYLES[t.sentiment]}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{t.theme}</p>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {t.mentionCount} mentions
                  </Badge>
                </div>
                {t.sampleQuotes.length > 0 && (
                  <p className="mt-1.5 text-xs text-foreground/80 italic">“{t.sampleQuotes[0]}”</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
