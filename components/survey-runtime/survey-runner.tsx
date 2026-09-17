"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuestionInput, type AnswerValue } from "@/components/survey-runtime/question-input";
import { resolveNextQuestionId } from "@/lib/survey/branching";
import { cn } from "@/lib/utils";
import type { Survey } from "@/lib/survey/types";

export type RunnerStage = "welcome" | "question" | "thanks";

interface Props {
  survey: Survey;
  /** Called after every answered question — persist here (respondent flow),
   * or ignore (creator preview). */
  onAnswer?: (questionId: string, value: AnswerValue) => void | Promise<void>;
  /** Called once, with the final question path, when the respondent finishes. */
  onComplete?: (questionPath: string[]) => void | Promise<void>;
  /** Called when the respondent clicks Start. */
  onStart?: () => void | Promise<void>;
  className?: string;
}

const CARD_STYLES: Record<Survey["experienceMode"], string> = {
  professional: "rounded-lg border border-border bg-card shadow-sm",
  conversational: "rounded-2xl border border-border bg-card shadow-sm",
  playful: "rounded-3xl border-2 border-border bg-card shadow-md",
};

export function SurveyRunner({ survey, onAnswer, onComplete, onStart, className }: Props) {
  const [stage, setStage] = useState<RunnerStage>("welcome");
  const [currentId, setCurrentId] = useState<string | null>(
    () => [...survey.questions].sort((a, b) => a.order - b.order)[0]?.id ?? null,
  );
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [path, setPath] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sortedQuestions = useMemo(
    () => [...survey.questions].sort((a, b) => a.order - b.order),
    [survey.questions],
  );
  const current = sortedQuestions.find((q) => q.id === currentId) ?? null;
  const questionIndex = current ? sortedQuestions.findIndex((q) => q.id === current.id) : -1;
  const progressPct = sortedQuestions.length
    ? Math.round(((questionIndex + 1) / sortedQuestions.length) * 100)
    : 0;

  const playful = survey.experienceMode === "playful";
  const conversational = survey.experienceMode === "conversational";

  async function handleStart() {
    await onStart?.();
    setStage("question");
  }

  async function handleNext() {
    if (!current) return;
    const value = answers[current.id] ?? null;
    if (current.required && (value === null || value === "" || (Array.isArray(value) && value.length === 0))) {
      return;
    }
    setSaving(true);
    try {
      await onAnswer?.(current.id, value);
      const nextPath = [...path, current.id];
      setPath(nextPath);

      const nextId = resolveNextQuestionId(survey, current, value);
      if (nextId) {
        setCurrentId(nextId);
      } else {
        await onComplete?.(nextPath);
        setStage("thanks");
      }
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (path.length === 0) return;
    const prevId = path[path.length - 1];
    setPath(path.slice(0, -1));
    setCurrentId(prevId);
  }

  const value = current ? answers[current.id] ?? null : null;
  const canContinue =
    current &&
    (!current.required ||
      (value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)));

  return (
    <div className={cn("w-full max-w-lg mx-auto", className)}>
      {stage === "welcome" && (
        <div className={cn("p-8 text-center", CARD_STYLES[survey.experienceMode])}>
          <h2 className={cn("font-heading text-2xl font-medium", playful && "text-3xl")}>
            {survey.welcomeScreen.heading}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {survey.welcomeScreen.body}
          </p>
          <Button size="lg" className="mt-6 gap-2" onClick={handleStart}>
            Start
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {stage === "question" && current && (
        <div>
          <div className="mb-4">
            <Progress value={progressPct} className="h-1" />
            <p className="mt-1.5 text-[11px] font-mono text-muted-foreground">
              {questionIndex + 1} / {sortedQuestions.length}
            </p>
          </div>
          <div className={cn("p-6", CARD_STYLES[survey.experienceMode])}>
            <p className={cn("font-medium leading-snug", conversational || playful ? "text-xl" : "text-base")}>
              {current.text}
              {!current.required && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">optional</span>
              )}
            </p>
            {current.helpText && (
              <p className="mt-1 text-sm text-muted-foreground">{current.helpText}</p>
            )}
            <div className="mt-5">
              <QuestionInput
                question={current}
                value={value}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))}
                experienceMode={survey.experienceMode}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} disabled={path.length === 0} className="gap-1">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canContinue || saving} className="gap-1.5">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {questionIndex === sortedQuestions.length - 1 ? "Finish" : "Next"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {stage === "thanks" && (
        <div className={cn("p-8 text-center", CARD_STYLES[survey.experienceMode])}>
          <h2 className="font-heading text-2xl font-medium">{survey.thankYouScreen.heading}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {survey.thankYouScreen.body}
          </p>
        </div>
      )}
    </div>
  );
}
