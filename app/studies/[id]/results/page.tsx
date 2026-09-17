"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { useStudy } from "@/lib/study-context";
import { StatTile } from "@/components/dashboard/stat-tile";
import { AiAnalysisPanel } from "@/components/dashboard/ai-analysis-panel";
import { QuestionResultsCard } from "@/components/dashboard/question-results-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";

type Results = Awaited<ReturnType<typeof api.getResults>>;

export default function ResultsPage() {
  const { study, loading } = useStudy();
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    if (!study) return;
    api.getResults(study.id).then(setResults);
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

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Overview
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
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
          label="Avg. completion time"
          value={avgTime != null ? Math.round(avgTime) : "—"}
          suffix={avgTime != null ? "s" : undefined}
        />
      </div>

      <AiAnalysisPanel studyId={study.id} hasResponses={dashboardStats.totalResponses > 0} />

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
  );
}
