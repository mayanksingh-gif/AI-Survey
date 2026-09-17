"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { ResearchSuggestionItem, Survey } from "@/lib/survey/types";

const CATEGORY_LABELS: Record<ResearchSuggestionItem["category"], string> = {
  missing_objective: "Missing objective",
  uncovered_question: "Uncovered question",
  low_value_question: "Low value",
  too_long: "Too long",
  poor_sequencing: "Poor sequencing",
  weak_options: "Weak options",
  biased_wording: "Biased wording",
  branching_opportunity: "Branching opportunity",
  segment_recommendation: "Segment idea",
  sample_size_recommendation: "Sample size",
  experience_recommendation: "Experience",
};

export function SuggestionsPanel({
  studyId,
  onSurveyUpdated,
}: {
  studyId: string;
  onSurveyUpdated: (survey: Survey) => void;
}) {
  const [suggestions, setSuggestions] = useState<ResearchSuggestionItem[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSuggestions(studyId)
      .then(({ suggestions }) => setSuggestions(suggestions))
      .catch(() => setSuggestions([]));
  }, [studyId]);

  async function refresh() {
    setChecking(true);
    try {
      const { suggestions } = await api.refreshSuggestions(studyId);
      setSuggestions(suggestions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not evaluate the survey");
    } finally {
      setChecking(false);
    }
  }

  async function apply(s: ResearchSuggestionItem) {
    setActingId(s.id);
    try {
      const { survey } = await api.applySuggestion(studyId, s.id);
      onSurveyUpdated(survey);
      setSuggestions((prev) => (prev ?? []).filter((x) => x.id !== s.id));
      toast.success("Question added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add question");
    } finally {
      setActingId(null);
    }
  }

  async function dismiss(s: ResearchSuggestionItem) {
    setActingId(s.id);
    try {
      await api.dismissSuggestion(studyId, s.id);
      setSuggestions((prev) => (prev ?? []).filter((x) => x.id !== s.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not dismiss");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Research Suggestions</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={checking} className="gap-1.5">
          {checking ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {suggestions === null ? "Evaluate" : "Re-evaluate"}
        </Button>
      </div>

      {suggestions === null && !checking && (
        <p className="text-xs text-muted-foreground">
          Ask the copilot to check for missing objectives, uncovered questions, weak sequencing, and
          more.
        </p>
      )}

      {suggestions !== null && suggestions.length === 0 && !checking && (
        <p className="text-xs text-muted-foreground">No open suggestions right now.</p>
      )}

      {suggestions !== null && suggestions.length > 0 && (
        <div className="space-y-2.5">
          {suggestions.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-3">
              <Badge variant="outline" className="text-[10px] font-mono uppercase mb-1.5">
                {CATEGORY_LABELS[s.category]}
              </Badge>
              <p className="text-sm font-medium leading-snug">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{s.description}</p>
              <div className="mt-2 flex gap-1.5">
                {s.suggestedQuestion && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => apply(s)}
                    disabled={actingId === s.id}
                  >
                    {actingId === s.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    Add Suggested Question
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => dismiss(s)}
                  disabled={actingId === s.id}
                >
                  <X className="size-3" />
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
