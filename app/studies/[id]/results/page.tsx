"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useStudy } from "@/lib/study-context";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AiAnalysisPanel } from "@/components/dashboard/ai-analysis-panel";
import { QuestionResultsCard } from "@/components/dashboard/question-results-card";
import { AskYourResearch } from "@/components/dashboard/ask-your-research";
import { QualityPanel } from "@/components/dashboard/quality-panel";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ResponseTrendChart } from "@/components/dashboard/response-trend-chart";
import { TimeAnalysisPanel } from "@/components/dashboard/time-analysis-panel";
import { SegmentComparisonPanel } from "@/components/dashboard/segment-comparison-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";

type Results = Awaited<ReturnType<typeof api.getResults>>;

export default function ResultsPage() {
  const { study, loading } = useStudy();
  const [results, setResults] = useState<Results | null>(null);
  const [funnel, setFunnel] = useState<{ questionId: string; label: string; reachedCount: number }[] | null>(
    null,
  );
  const [qualityFilter, setQualityFilter] = useState("all");

  useEffect(() => {
    if (!study) return;
    api.getResults(study.id, qualityFilter).then(setResults);
  }, [study, qualityFilter]);

  useEffect(() => {
    if (!study) return;
    api.getFunnel(study.id).then(({ funnel }) => setFunnel(funnel));
  }, [study]);

  if (loading || !study || !results) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  const { dashboardStats, questionStats } = results;
  const avgTime = dashboardStats.avgCompletionTimeSeconds;
  const hasResponses = dashboardStats.totalResponses > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      {/* Main column: overview, quality, findings, charts, themes, segments, funnel */}
      <div className="space-y-8 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
            Research Overview
          </p>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            nativeButton={false}
            render={<a href={api.exportCsvUrl(study.id)} download />}
          >
            <Download className="size-3.5" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile label="Total responses" value={dashboardStats.totalResponses} />
          <StatTile label="Completed" value={dashboardStats.completedResponses} />
          <StatTile
            label="Completion rate"
            value={Math.round(dashboardStats.completionRate * 100)}
            suffix="%"
          />
          <StatTile
            label="Avg. time"
            value={avgTime != null ? Math.round(avgTime) : "—"}
            suffix={avgTime != null ? "s" : undefined}
          />
          <StatTile
            label="Median time"
            value={
              dashboardStats.medianCompletionTimeSeconds != null
                ? Math.round(dashboardStats.medianCompletionTimeSeconds)
                : "—"
            }
            suffix={dashboardStats.medianCompletionTimeSeconds != null ? "s" : undefined}
          />
          <StatTile label="Abandonment rate" value={Math.round(dashboardStats.abandonmentRate * 100)} suffix="%" />
        </div>

        <QualityPanel studyId={study.id} onFilterChange={setQualityFilter} />

        <AiAnalysisPanel studyId={study.id} hasResponses={hasResponses} qualityFilter={qualityFilter} />

        <InsightsPanel studyId={study.id} hasResponses={hasResponses} />

        {hasResponses && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div className="rounded-xl border border-border bg-card p-5">
              <ResponseTrendChart studyId={study.id} />
            </div>
            {funnel && funnel.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground mb-3">
                  Survey funnel
                </p>
                <FunnelChart stages={funnel} />
              </div>
            )}
          </div>
        )}

        {hasResponses && <TimeAnalysisPanel questionStats={questionStats} />}

        {hasResponses && <SegmentComparisonPanel studyId={study.id} />}

        {questionStats.length > 0 && (
          <div>
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground mb-3">
              Question-level results
            </p>
            <div className="space-y-4">
              {questionStats.map((stat, i) => (
                <QuestionResultsCard key={stat.question.id} stat={stat} index={i} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: persistent Ask Your Research, pinned to the viewport
          height so it scrolls internally instead of growing with the page.
          The -mt-8 cancels this wrapper's py-8 top padding so the panel's
          natural (pre-scroll) top lines up exactly with the sticky header's
          bottom edge (~93px) — otherwise the extra padding makes the panel
          taller than the remaining viewport before it ever sticks, so the
          page scrolls a few px even though the aside is meant to be fixed,
          and the sticky offset then clips its top edge once it does stick. */}
      <div className="lg:sticky lg:top-24 lg:-mt-8 lg:h-[calc(100vh-6rem)]">
        <AskYourResearch studyId={study.id} className="h-full" />
      </div>
    </div>
  );
}
