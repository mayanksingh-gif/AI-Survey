import { AiLabel } from "@/components/brand/signal-glyph";

export function GoalCard({ goal }: { goal: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">
        Research goal
      </p>
      <p className="font-heading text-lg leading-snug">{goal}</p>
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <AiLabel>{children}</AiLabel>
    </div>
  );
}
