"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useStudy } from "@/lib/study-context";
import { StudyTabs } from "@/components/study/study-tabs";
import { StatusBadge } from "@/components/study/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

export function StudyShellHeader({ studyId }: { studyId: string }) {
  const { study, loading } = useStudy();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="size-4" />
            Studies
          </Link>
          <StudyTabs studyId={studyId} />
          <div className="w-[92px] shrink-0 flex justify-end">
            {study && <StatusBadge status={study.status} />}
          </div>
        </div>
        <div className="pb-3 -mt-1">
          {loading ? (
            <Skeleton className="h-6 w-64" />
          ) : (
            <h1 className="font-heading text-lg font-medium tracking-tight truncate">
              {study?.title}
            </h1>
          )}
        </div>
      </div>
    </header>
  );
}
