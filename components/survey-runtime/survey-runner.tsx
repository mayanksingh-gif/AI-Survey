"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { AiLabel } from "@/components/brand/signal-glyph";
import { QuestionInput, type AnswerValue } from "@/components/survey-runtime/question-input";
import { MediaResponseUpload } from "@/components/survey-runtime/media-response-upload";
import { resolveNextQuestionId } from "@/lib/survey/branching";
import { personalizeQuestion } from "@/lib/survey/personalization";
import { cn } from "@/lib/utils";
import type { Survey } from "@/lib/survey/types";

export type RunnerStage = "welcome" | "question" | "adaptive-followup" | "thanks";

export interface AdaptiveFollowUpCheckResult {
  shouldAsk: boolean;
  followUp?: { id: string; question: string };
}

interface Props {
  survey: Survey;
  /** Called after every answered question — persist here (respondent flow),
   * or ignore (creator preview). */
  onAnswer?: (questionId: string, value: AnswerValue) => void | Promise<void>;
  /** Called once, with the final question path, when the respondent finishes. */
  onComplete?: (questionPath: string[]) => void | Promise<void>;
  /** Called when the respondent clicks Start. */
  onStart?: () => void | Promise<void>;
  /** V2 adaptive follow-ups: ask the agent whether to probe further after an
   * open-text answer. Omit to disable (e.g. builder live-preview with no
   * real response to attach follow-ups to). */
  onCheckAdaptiveFollowUp?: (
    questionId: string,
    answer: string,
  ) => Promise<AdaptiveFollowUpCheckResult>;
  /** Persist the respondent's answer to a shown adaptive follow-up. */
  onAnswerAdaptiveFollowUp?: (followUpId: string, answer: string) => void | Promise<void>;
  /** V2 multimedia: enables the "answer with a photo/recording" upload
   * control on questions with allowMediaResponse. Both required together;
   * omit to disable media responses entirely. */
  studyId?: string;
  responseId?: string | null;
  className?: string;
}

const CARD_STYLES: Record<Survey["experienceMode"], string> = {
  professional: "rounded-lg border border-border bg-card shadow-sm",
  conversational: "rounded-2xl border border-border bg-card shadow-sm",
  playful: "rounded-3xl border-2 border-border bg-card shadow-md",
};

export function SurveyRunner({
  survey,
  onAnswer,
  onComplete,
  onStart,
  onCheckAdaptiveFollowUp,
  onAnswerAdaptiveFollowUp,
  studyId,
  responseId,
  className,
}: Props) {
  const [stage, setStage] = useState<RunnerStage>("welcome");
  const [currentId, setCurrentId] = useState<string | null>(
    () => [...survey.questions].sort((a, b) => a.order - b.order)[0]?.id ?? null,
  );
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [path, setPath] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [checkingFollowUp, setCheckingFollowUp] = useState(false);
  const [activeFollowUp, setActiveFollowUp] = useState<{ id: string; question: string } | null>(
    null,
  );
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  // Remembers which base question a follow-up chain belongs to, so we can
  // keep re-checking (up to the study's mode cap) after each answer.
  const [followUpBaseQuestionId, setFollowUpBaseQuestionId] = useState<string | null>(null);

  const sortedQuestions = useMemo(
    () => [...survey.questions].sort((a, b) => a.order - b.order),
    [survey.questions],
  );
  const rawCurrent = sortedQuestions.find((q) => q.id === currentId) ?? null;
  // Resolve any {{previousAnswer:...}} tokens against answers given so far —
  // does not change branching, only the displayed copy.
  const current = rawCurrent ? personalizeQuestion(rawCurrent, answers) : null;
  const questionIndex = current ? sortedQuestions.findIndex((q) => q.id === current.id) : -1;
  const progressPct = sortedQuestions.length
    ? Math.round(((questionIndex + 1) / sortedQuestions.length) * 100)
    : 0;

  const playful = survey.experienceMode === "playful";
  const conversational = survey.experienceMode === "conversational";

  const adaptiveEligible = (q: typeof current, value: AnswerValue) =>
    !!onCheckAdaptiveFollowUp &&
    q &&
    (q.type === "short_text" || q.type === "long_text") &&
    q.allowAdaptiveFollowUp !== false &&
    survey.adaptiveFollowUpMode &&
    survey.adaptiveFollowUpMode !== "off" &&
    typeof value === "string" &&
    value.trim().length > 0;

  async function advanceAfterQuestion(question: NonNullable<typeof current>, value: AnswerValue) {
    const nextPath = [...path, question.id];
    setPath(nextPath);
    const nextId = resolveNextQuestionId(survey, question, value);
    if (nextId) {
      setCurrentId(nextId);
      setStage("question");
    } else {
      await onComplete?.(nextPath);
      setStage("thanks");
    }
  }

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

      if (adaptiveEligible(current, value)) {
        setCheckingFollowUp(true);
        try {
          const result = await onCheckAdaptiveFollowUp!(current.id, value as string);
          if (result.shouldAsk && result.followUp) {
            setFollowUpBaseQuestionId(current.id);
            setActiveFollowUp(result.followUp);
            setFollowUpAnswer("");
            setStage("adaptive-followup");
            return;
          }
        } finally {
          setCheckingFollowUp(false);
        }
      }

      await advanceAfterQuestion(current, value);
    } finally {
      setSaving(false);
    }
  }

  async function handleFollowUpNext() {
    if (!activeFollowUp || !followUpBaseQuestionId) return;
    const answerText = followUpAnswer.trim();
    setSaving(true);
    try {
      await onAnswerAdaptiveFollowUp?.(activeFollowUp.id, answerText);

      // Keep probing (bounded server-side by the study's mode) as long as
      // there's a meaningful answer to react to.
      if (answerText && onCheckAdaptiveFollowUp) {
        setCheckingFollowUp(true);
        try {
          const baseAnswer = answers[followUpBaseQuestionId];
          const result = await onCheckAdaptiveFollowUp(
            followUpBaseQuestionId,
            typeof baseAnswer === "string" ? baseAnswer : answerText,
          );
          if (result.shouldAsk && result.followUp) {
            setActiveFollowUp(result.followUp);
            setFollowUpAnswer("");
            return;
          }
        } finally {
          setCheckingFollowUp(false);
        }
      }

      const baseQuestion = sortedQuestions.find((q) => q.id === followUpBaseQuestionId);
      setActiveFollowUp(null);
      setFollowUpBaseQuestionId(null);
      if (baseQuestion) {
        await advanceAfterQuestion(baseQuestion, answers[baseQuestion.id] ?? null);
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
    setStage("question");
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
            <div className="mt-1.5 flex items-center justify-between">
              <p className="text-[11px] font-mono text-muted-foreground">
                {questionIndex + 1} / {sortedQuestions.length}
              </p>
              {/* Progress milestones: only for medium/high interaction levels
                  — decorative encouragement, never alters question meaning. */}
              {(survey.interactionLevel === "medium" || survey.interactionLevel === "high") &&
                progressPct >= 50 && (
                  <p className="text-[11px] text-signal font-medium animate-in fade-in">
                    {progressPct >= 90
                      ? "Almost there!"
                      : progressPct >= 75
                        ? "Great progress"
                        : "Halfway there"}
                  </p>
                )}
            </div>
          </div>
          <div className={cn("p-6", CARD_STYLES[survey.experienceMode])}>
            {current.stimulusMedia && current.stimulusMedia.length > 0 && (
              <StimulusMedia media={current.stimulusMedia} />
            )}
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
            {current.allowMediaResponse && studyId && (
              <MediaResponseUpload
                studyId={studyId}
                responseId={responseId ?? null}
                questionId={current.id}
                value={value}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [current.id]: v }))}
              />
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack} disabled={path.length === 0} className="gap-1">
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button onClick={handleNext} disabled={!canContinue || saving || checkingFollowUp} className="gap-1.5">
              {saving || checkingFollowUp ? (
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

      {stage === "adaptive-followup" && activeFollowUp && (
        <div>
          <div className="mb-4">
            <Progress value={progressPct} className="h-1" />
            <p className="mt-1.5 text-[11px] font-mono text-muted-foreground">
              {questionIndex + 1} / {sortedQuestions.length} · quick follow-up
            </p>
          </div>
          <div className={cn("p-6", CARD_STYLES[survey.experienceMode])}>
            <AiLabel className="mb-3">Quick follow-up</AiLabel>
            <p className={cn("font-medium leading-snug", conversational || playful ? "text-xl" : "text-base")}>
              {activeFollowUp.question}
            </p>
            <div className="mt-5">
              <Textarea
                autoFocus
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                placeholder="Type your answer…"
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                const baseQuestion = sortedQuestions.find((q) => q.id === followUpBaseQuestionId);
                setActiveFollowUp(null);
                setFollowUpBaseQuestionId(null);
                if (baseQuestion) await advanceAfterQuestion(baseQuestion, answers[baseQuestion.id] ?? null);
              }}
            >
              Skip
            </Button>
            <Button onClick={handleFollowUpNext} disabled={saving || checkingFollowUp} className="gap-1.5">
              {saving || checkingFollowUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {stage === "thanks" && (
        <div className={cn("p-8 text-center relative overflow-hidden", CARD_STYLES[survey.experienceMode])}>
          {(survey.interactionLevel === "medium" || survey.interactionLevel === "high") && (
            <ConfettiBurst intensity={survey.interactionLevel} />
          )}
          <div
            className={cn(
              "mx-auto mb-3 flex items-center justify-center rounded-full bg-sage/15 text-sage",
              survey.interactionLevel === "high" ? "size-14" : "size-10",
            )}
          >
            <Check className={cn(survey.interactionLevel === "high" ? "size-7" : "size-5")} />
          </div>
          <h2 className="font-heading text-2xl font-medium">{survey.thankYouScreen.heading}</h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {survey.thankYouScreen.body}
          </p>
        </div>
      )}
    </div>
  );
}

/** Subtle completion celebration (PRD: "smooth transitions, subtle
 * completion celebrations") — a handful of small dots drifting up and
 * fading, no external animation library. Respects the interaction level:
 * "high" gets more pieces than "medium". Purely decorative, unmounts on its
 * own without leaving timers running. */
function ConfettiBurst({ intensity }: { intensity: "medium" | "high" }) {
  // Lazy useState initializer, not useMemo: this is a one-time randomized
  // layout for a mount-only decorative burst, not a value derived from
  // props/state that should recompute on re-render — the initializer form
  // is the sanctioned escape hatch for that.
  const [pieces] = useState(() => {
    const count = intensity === "high" ? 18 : 9;
    const colors = ["var(--color-signal)", "var(--color-sage)", "var(--color-chart-3)"];
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      delay: Math.random() * 0.3,
      duration: 0.9 + Math.random() * 0.6,
      color: colors[i % colors.length],
    }));
  });

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-1/2 size-1.5 rounded-full animate-in fade-in"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animation: `confetti-rise ${p.duration}s ease-out ${p.delay}s forwards`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-rise {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translateY(-90px) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

/** V2 Multimedia: renders the image/video/audio a respondent views/listens
 * to before answering. Multiple entries render as a simple stacked list —
 * pairwise/concept-comparison layouts are handled by the question-type
 * renderer itself (card_choice with imageUrl per option), not here; this
 * is specifically for stimulus shown ABOVE the question. */
function StimulusMedia({ media }: { media: NonNullable<Survey["questions"][number]["stimulusMedia"]> }) {
  return (
    <div className="mb-4 space-y-2">
      {media.map((m) => {
        if (m.kind === "image") {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={m.id} src={m.url} alt="" className="w-full rounded-lg border border-border" />;
        }
        if (m.kind === "video") {
          return (
            <video key={m.id} src={m.url} controls className="w-full rounded-lg border border-border" />
          );
        }
        return <audio key={m.id} src={m.url} controls className="w-full" />;
      })}
    </div>
  );
}
