"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { api } from "@/lib/api-client";

type QuestionStat = Awaited<ReturnType<typeof api.getResults>>["questionStats"][number];

// Chart palette follows the design system's chart-1..5 tokens (gold/sage/slate
// family) — never a generic rainbow, and never a pie chart for every type.
const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function QuestionChart({ stat }: { stat: QuestionStat }) {
  switch (stat.chartKind) {
    case "donut":
      return <DonutChart data={stat.optionCounts ?? []} />;
    case "bar":
      return <SimpleBarChart data={stat.optionCounts ?? []} />;
    case "distribution":
      return <DistributionChart values={stat.numericValues ?? []} />;
    case "stacked_bar":
      return <LikertBar data={stat.optionCounts ?? []} />;
    case "nps_breakdown":
      return stat.npsBreakdown ? <NpsBreakdown breakdown={stat.npsBreakdown} /> : null;
    case "ranked_bars":
      return <RankedBars data={stat.optionCounts ?? []} />;
    case "text_list":
      return <TextAnswerList answers={stat.rawTextAnswers ?? []} />;
    case "matrix_grid":
      return <MatrixGrid rows={stat.matrixRowCounts ?? []} />;
    case "grouped_bar":
      return <RankedBars data={stat.pairwiseWinCounts ?? []} />;
    default:
      return null;
  }
}

function DonutChart({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="label" innerRadius={32} outerRadius={52} paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="capitalize">{d.label}</span>
            <span className="text-muted-foreground font-mono">
              {Math.round((d.count / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ data }: { data: { label: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 16 }}>
        <CartesianGrid horizontal={false} stroke="var(--color-border)" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={140}
          tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DistributionChart({ values }: { values: number[] }) {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const data = Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([value, count]) => ({ label: String(value), count }));

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="count" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function LikertBar({ data }: { data: { label: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  return (
    <div>
      <div className="flex h-8 w-full overflow-hidden rounded-md">
        {data.map((d, i) => (
          <div
            key={d.label}
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: COLORS[i % COLORS.length],
            }}
            className="h-full first:rounded-l-md last:rounded-r-md"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-[11px]">
            <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-muted-foreground">{d.label}</span>
            <span className="font-mono">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NpsBreakdown({
  breakdown,
}: {
  breakdown: { promoters: number; passives: number; detractors: number; score: number };
}) {
  const total = breakdown.promoters + breakdown.passives + breakdown.detractors || 1;
  const segments = [
    { label: "Detractors", count: breakdown.detractors, color: "var(--color-destructive)" },
    { label: "Passives", count: breakdown.passives, color: "var(--color-muted-foreground)" },
    { label: "Promoters", count: breakdown.promoters, color: "var(--color-sage)" },
  ];
  return (
    <div>
      <p className="font-heading text-3xl font-medium tabular-nums">{breakdown.score}</p>
      <p className="text-xs text-muted-foreground mb-3">NPS score</p>
      <div className="flex h-6 w-full overflow-hidden rounded-md">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
            className="h-full"
          />
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-[11px]">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="font-mono">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedBars({ data }: { data: { label: string; count: number }[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count || 1;
  return (
    <div className="space-y-2">
      {sorted.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted-foreground w-4">{i + 1}</span>
          <span className="w-28 truncate">{d.label}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-chart-1"
              style={{ width: `${(d.count / max) * 100}%`, backgroundColor: "var(--color-chart-1)" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** matrix: one mini diverging-stacked-bar per row, reusing LikertBar's
 * visual language so a matrix reads as "N little Likerts", not a new idiom. */
function MatrixGrid({ rows }: { rows: { row: string; optionCounts: { label: string; value: string; count: number }[] }[] }) {
  if (!rows.length) return <p className="text-xs text-muted-foreground">No matrix rows configured.</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.row}>
          <p className="text-xs font-medium mb-1">{r.row}</p>
          <LikertBar data={r.optionCounts} />
        </div>
      ))}
    </div>
  );
}

function TextAnswerList({ answers }: { answers: string[] }) {
  if (!answers.length) {
    return <p className="text-xs text-muted-foreground">No responses yet.</p>;
  }
  return (
    <ul className={cn("space-y-1.5 max-h-40 overflow-y-auto pr-1")}>
      {answers.slice(0, 20).map((a, i) => (
        <li key={i} className="text-sm rounded-md bg-muted/40 px-3 py-2 leading-snug">
          {a}
        </li>
      ))}
    </ul>
  );
}
