import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground border-border" },
  live: { label: "Live", className: "bg-sage/15 text-sage border-sage/30" },
  closed: { label: "Closed", className: "bg-accent text-accent-foreground border-border" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = CONFIG[status] ?? CONFIG.draft;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-mono text-[11px] uppercase tracking-wide", cfg.className, className)}
    >
      {status === "live" && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sage" />
        </span>
      )}
      {cfg.label}
    </Badge>
  );
}
