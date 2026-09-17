import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  suffix,
  className,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card px-5 py-4", className)}>
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-medium tabular-nums">
        {value}
        {suffix && <span className="text-sm text-muted-foreground font-sans ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
