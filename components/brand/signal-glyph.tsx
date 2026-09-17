import { cn } from "@/lib/utils";

/**
 * The product's one signature mark: a small gold asterisk that flags
 * anything AI-authored (survey copy, chat replies, executive summary,
 * suggested fixes) so users always know what came from the copilot vs.
 * what they wrote themselves.
 */
export function SignalGlyph({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("text-signal font-serif italic select-none", className)}
    >
      *
    </span>
  );
}

export function AiLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-signal",
        className,
      )}
    >
      <SignalGlyph />
      {children}
    </span>
  );
}
