"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { ExperienceMode, SurveyQuestion } from "@/lib/survey/types";
import { GripVertical } from "lucide-react";

export type AnswerValue = string | string[] | number | null;

interface Props {
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  experienceMode: ExperienceMode;
}

/** Renders the answer control for exactly one of the ~10 supported question
 * types. Purely presentational/controlled — persistence happens in the
 * caller (builder preview vs. respondent runtime save differently). */
export function QuestionInput({ question, value, onChange, experienceMode }: Props) {
  const playful = experienceMode === "playful";

  switch (question.type) {
    case "short_text":
      return (
        <Input
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          className={cn(playful && "h-12 text-base rounded-xl")}
        />
      );

    case "long_text":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          rows={4}
          className={cn(playful && "rounded-xl text-base")}
        />
      );

    case "yes_no":
      return (
        <div className="flex gap-3">
          {["yes", "no"].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                "flex-1 rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors",
                value === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
                playful && "rounded-xl py-4 text-base",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      );

    case "single_choice":
      return (
        <RadioGroup value={(value as string) ?? ""} onValueChange={onChange} className="gap-2.5">
          {question.options.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm cursor-pointer transition-colors",
                value === opt.value ? "border-primary bg-accent/60" : "border-border hover:bg-accent/40",
                playful && "rounded-xl py-3.5 text-base",
              )}
            >
              <RadioGroupItem value={opt.value} />
              {opt.label}
            </label>
          ))}
        </RadioGroup>
      );

    case "multiple_choice": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="space-y-2.5">
          {question.options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm cursor-pointer transition-colors",
                  checked ? "border-primary bg-accent/60" : "border-border hover:bg-accent/40",
                  playful && "rounded-xl py-3.5 text-base",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) =>
                    onChange(c ? [...selected, opt.value] : selected.filter((v) => v !== opt.value))
                  }
                />
                {opt.label}
              </label>
            );
          })}
        </div>
      );
    }

    case "rating": {
      const max = question.options.length || 5;
      const current = typeof value === "number" ? value : 0;
      return (
        <div className="flex gap-2">
          {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                "flex-1 aspect-square max-w-14 rounded-lg border text-sm font-medium transition-colors",
                current === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
                playful && "rounded-full text-lg",
              )}
            >
              {playful ? EMOJI_SCALE[n - 1] ?? n : n}
            </button>
          ))}
        </div>
      );
    }

    case "likert": {
      const opts = question.options.length
        ? question.options
        : DEFAULT_LIKERT.map((l) => ({ label: l, value: l }));
      return (
        <RadioGroup value={(value as string) ?? ""} onValueChange={onChange} className="flex gap-2">
          {opts.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 rounded-lg border px-2 py-3 text-xs text-center cursor-pointer transition-colors",
                value === opt.value ? "border-primary bg-accent/60" : "border-border hover:bg-accent/40",
              )}
            >
              <RadioGroupItem value={opt.value} />
              <span>{opt.label}</span>
            </label>
          ))}
        </RadioGroup>
      );
    }

    case "nps": {
      const current = typeof value === "number" ? value : null;
      return (
        <div>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, i) => i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={cn(
                  "aspect-square rounded-md border text-xs font-mono font-medium transition-colors",
                  current === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>Not at all likely</span>
            <span>Extremely likely</span>
          </div>
        </div>
      );
    }

    case "slider": {
      const min = Number(question.options[0]?.value ?? 0);
      const max = Number(question.options[1]?.value ?? 100);
      const current = typeof value === "number" ? value : Math.round((min + max) / 2);
      return (
        <div className="pt-2">
          <Slider
            min={min}
            max={max}
            step={1}
            value={[current]}
            onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
          />
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{min}</span>
            <span className="font-mono font-medium text-base">{current}</span>
            <span className="text-muted-foreground">{max}</span>
          </div>
        </div>
      );
    }

    case "ranking":
      return (
        <RankingInput
          options={question.options}
          value={Array.isArray(value) ? (value as string[]) : question.options.map((o) => o.value)}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

const DEFAULT_LIKERT = [
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree",
];

const EMOJI_SCALE = ["😞", "🙁", "😐", "🙂", "😄"];

function RankingInput({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const labelByValue = new Map(options.map((o) => [o.value, o.label]));

  function move(from: number, to: number) {
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {value.map((v, i) => (
        <div
          key={v}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIndex !== null && dragIndex !== i) move(dragIndex, i);
            setDragIndex(null);
          }}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="size-4 text-muted-foreground shrink-0" />
          <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}</span>
          <span className="text-sm">{labelByValue.get(v) ?? v}</span>
        </div>
      ))}
    </div>
  );
}
