"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { QuestionTypeBadge } from "@/components/survey-builder/question-type-badge";
import { QuestionChart } from "@/components/dashboard/question-chart";
import { cn } from "@/lib/utils";
import type { api } from "@/lib/api-client";

type QuestionStat = Awaited<ReturnType<typeof api.getResults>>["questionStats"][number];

export function QuestionResultsCard({ stat, index }: { stat: QuestionStat; index: number }) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
            <QuestionTypeBadge type={stat.question.type} />
          </div>
          <p className="text-sm font-medium">{stat.question.text}</p>
        </div>
        <div className="text-right shrink-0 text-xs text-muted-foreground font-mono">
          <p>{stat.responseCount} responses</p>
          {stat.skipCount > 0 && <p>{stat.skipCount} skipped</p>}
        </div>
      </div>

      <QuestionChart stat={stat} />

      {stat.question.type !== "short_text" && stat.question.type !== "long_text" && (
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={cn("size-3.5 transition-transform", showRaw && "rotate-180")} />
          {showRaw ? "Hide raw answers" : "View raw answers"}
        </button>
      )}

      {showRaw && (
        <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto text-xs font-mono text-muted-foreground border-t border-border pt-2">
          {stat.rawAnswers.map((a, i) => (
            <li key={i}>{JSON.stringify(a.value)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
