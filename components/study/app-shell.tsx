import Link from "next/link";

/** Top-level chrome shared by home and study screens: wordmark + slot for
 * page-specific controls on the right (tabs, actions). */
export function AppShell({
  right,
  children,
}: {
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="font-heading text-[17px] font-medium tracking-tight">
              Copilot
            </span>
            <span className="text-signal font-serif italic text-lg leading-none -mt-1">*</span>
          </Link>
          <div className="flex-1 flex justify-center min-w-0">{right}</div>
          <div className="w-[92px] shrink-0" aria-hidden />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
