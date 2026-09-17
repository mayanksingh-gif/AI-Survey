"use client";

import { useEffect, useState } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AiLabel } from "@/components/brand/signal-glyph";
import { DesignerJokes } from "@/components/brand/designer-jokes";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { FollowUpQA } from "@/lib/survey/types";

export function FollowUpFlow({
  studyId,
  onDone,
}: {
  studyId: string;
  onDone: (followUps: FollowUpQA[]) => void;
}) {
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .getFollowUps(studyId)
      .then(({ followUpQuestions }) => setQuestions(followUpQuestions))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not reach the local model");
        setQuestions([]);
      })
      .finally(() => setLoadingQuestions(false));
  }, [studyId]);

  if (loadingQuestions) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Copilot is reading your goal and deciding what else it needs to know…
        </div>
        <DesignerJokes />
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    // Nothing more needed — skip straight to plan generation.
    onDone([]);
    return null;
  }

  const allAnswered = questions.every((_, i) => (answers[i] ?? "").trim().length > 0);

  async function handleContinue() {
    setSubmitting(true);
    const followUps: FollowUpQA[] = questions!.map((q, i) => ({
      question: q,
      answer: (answers[i] ?? "").trim(),
    }));
    onDone(followUps);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <AiLabel className="mb-4">A few quick questions before we plan this</AiLabel>
      <div className="space-y-5">
        {questions.map((q, i) => (
          <div key={i}>
            <label className="text-sm font-medium block mb-1.5">{q}</label>
            <Textarea
              rows={2}
              value={answers[i] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
              className="resize-none"
              placeholder="Your answer…"
            />
          </div>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <Button onClick={handleContinue} disabled={!allAnswered || submitting} className="gap-1.5">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <>Continue <ArrowRight className="size-4" /></>}
        </Button>
      </div>
    </div>
  );
}
