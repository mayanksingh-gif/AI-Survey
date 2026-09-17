"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "plan", label: "Plan" },
  { key: "build", label: "Build" },
  { key: "preview", label: "Preview" },
  { key: "share", label: "Share" },
  { key: "results", label: "Results" },
];

export function StudyTabs({ studyId }: { studyId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {TABS.map((tab) => {
        const href = `/studies/${studyId}/${tab.key}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "relative px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
            )}
          >
            {tab.label}
            {active && (
              <span className="absolute inset-x-2 -bottom-[9px] h-[2px] bg-signal rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
