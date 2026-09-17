"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ReviewIssue, Survey } from "@/lib/survey/types";

const SEVERITY_STYLES: Record<ReviewIssue["severity"], string> = {
  high: "border-destructive/40 text-destructive bg-destructive/5",
  medium: "border-signal/40 text-signal bg-signal/5",
  low: "border-border text-muted-foreground",
};

const CATEGORY_LABELS: Record<ReviewIssue["category"], string> = {
  leading_question: "Leading question",
  confusing_wording: "Confusing wording",
  duplicate: "Duplicate question",
  double_barrelled: "Double-barrelled",
  too_long: "Survey too long",
  poor_order: "Poor question order",
  missing_options: "Missing options",
};

export function ReviewerPanel({
  studyId,
  onFixApplied,
}: {
  studyId: string;
  onFixApplied: (survey: Survey) => void;
}) {
  const [issues, setIssues] = useState<ReviewIssue[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  async function runReview() {
    setChecking(true);
    try {
      const { issues } = await api.reviewSurvey(studyId);
      setIssues(issues);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed");
    } finally {
      setChecking(false);
    }
  }

  async function applyFix(issue: ReviewIssue) {
    setApplyingId(issue.id);
    try {
      const { survey } = await api.applyFix(studyId, issue.fixedSurvey);
      onFixApplied(survey);
      setIssues((prev) => (prev ?? []).filter((i) => i.id !== issue.id));
      toast.success("Fix applied");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not apply fix");
    } finally {
      setApplyingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Survey Review</p>
        </div>
        <Button variant="outline" size="sm" onClick={runReview} disabled={checking} className="gap-1.5">
          {checking ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {issues === null ? "Run review" : "Re-run"}
        </Button>
      </div>

      {issues === null && !checking && (
        <p className="text-xs text-muted-foreground">
          Check for leading questions, confusing wording, duplicates, and more before publishing.
        </p>
      )}

      {issues !== null && issues.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-sage">
          <CheckCircle2 className="size-4" />
          No issues found.
        </div>
      )}

      {issues !== null && issues.length > 0 && (
        <div className="space-y-2.5">
          {issues.map((issue) => (
            <div key={issue.id} className={cn("rounded-lg border p-3", SEVERITY_STYLES[issue.severity])}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="size-3.5 shrink-0" />
                <Badge variant="outline" className="text-[10px] font-mono uppercase">
                  {CATEGORY_LABELS[issue.category]}
                </Badge>
              </div>
              <p className="text-sm text-foreground/90 leading-snug">{issue.description}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs"
                onClick={() => applyFix(issue)}
                disabled={applyingId === issue.id}
              >
                {applyingId === issue.id ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
                Apply Fix
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
