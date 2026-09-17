"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { FileText, Users } from "lucide-react";
import { api, type StudySummary } from "@/lib/api-client";
import { StatusBadge } from "@/components/study/status-badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_ORDER = ["live", "draft", "closed"];

export function StudiesList() {
  const [studies, setStudies] = useState<StudySummary[] | null>(null);

  useEffect(() => {
    api
      .listStudies()
      .then(({ studies }) => setStudies(studies))
      .catch(() => setStudies([]));
  }, []);

  if (studies === null) {
    return (
      <div className="mx-auto max-w-3xl px-6 space-y-3 pb-24">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (studies.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <FileText className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            No studies yet — describe a research goal above to start your first one.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...studies].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );

  return (
    <div className="mx-auto max-w-3xl px-6 pb-24">
      <p className="mb-3 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
        Studies
      </p>
      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden bg-card">
        {sorted.map((study) => (
          <Link
            key={study.id}
            href={`/studies/${study.id}/${study.status === "draft" ? "plan" : "results"}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-accent/40 transition-colors"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{study.title}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                Updated {formatDistanceToNow(new Date(study.updatedAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-mono tabular-nums">
                <Users className="size-3.5" />
                {study.responseCount}
              </span>
              <StatusBadge status={study.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
