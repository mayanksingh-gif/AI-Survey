import { Clock } from "lucide-react";
import type { QuestionStats } from "@/lib/survey/stats";

/** V2 Time Analysis: average survey duration is already in the top stat
 * tiles — this surfaces the per-question breakdown: which questions are
 * slow (candidates for simplifying) vs fast, and flags any without enough
 * data to say either way. */
export function TimeAnalysisPanel({ questionStats }: { questionStats: QuestionStats[] }) {
  const timed = questionStats
    .filter((q) => q.medianTimeSeconds != null)
    .sort((a, b) => (b.medianTimeSeconds ?? 0) - (a.medianTimeSeconds ?? 0));

  if (timed.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        Not enough response data yet to break down time per question.
      </div>
    );
  }

  const slowest = timed.slice(0, 3);
  const fastest = timed.slice(-3).reverse();

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Time per question</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-2">
            Slowest
          </p>
          <ul className="space-y-1.5">
            {slowest.map((q) => (
              <li key={q.question.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{q.question.text}</span>
                <span className="font-mono text-destructive/80 shrink-0">
                  {Math.round(q.medianTimeSeconds!)}s
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-2">
            Fastest
          </p>
          <ul className="space-y-1.5">
            {fastest.map((q) => (
              <li key={q.question.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{q.question.text}</span>
                <span className="font-mono text-sage shrink-0">{Math.round(q.medianTimeSeconds!)}s</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
