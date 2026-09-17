"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";

type Granularity = "daily" | "weekly" | "monthly";

/** V2 Response Trends: line chart of response volume over time, with a
 * granularity toggle — most useful for recurring/longitudinal studies that
 * collect responses over weeks/months rather than all at once. */
export function ResponseTrendChart({ studyId }: { studyId: string }) {
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [trend, setTrend] = useState<{ bucket: string; count: number; completedCount: number }[] | null>(
    null,
  );

  useEffect(() => {
    api.getTrends(studyId, granularity).then(({ trend }) => setTrend(trend));
  }, [studyId, granularity]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
          Response trend
        </p>
        <div className="inline-flex rounded-lg border border-border p-0.5">
          {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
            <Button
              key={g}
              size="sm"
              variant="ghost"
              className={cn(
                "h-6 px-2 text-[11px] capitalize",
                granularity === g && "bg-accent text-foreground",
              )}
              onClick={() => setGranularity(g)}
            >
              {g}
            </Button>
          ))}
        </div>
      </div>

      {!trend || trend.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not enough data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trend} margin={{ top: 8, right: 8 }}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis hide />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line type="monotone" dataKey="count" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            <Line
              type="monotone"
              dataKey="completedCount"
              stroke="var(--color-sage)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
