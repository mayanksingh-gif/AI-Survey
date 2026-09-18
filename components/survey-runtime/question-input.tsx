"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnswerValue, ExperienceMode, SurveyQuestion } from "@/lib/survey/types";
import { Check, ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";

// Re-exported for existing importers (survey-runner, branching, etc.) —
// AnswerValue's canonical definition now lives in lib/survey/types.ts since
// AI services and stats need it too, not just this component.
export type { AnswerValue };

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
      // Options may come as a 2-entry [min, max] range, or (if the model
      // emitted a full enumerated scale, e.g. NPS-style 0..10) as N options —
      // in either case the true bounds are the first and last option values.
      const opts = question.options;
      const min = Number(opts[0]?.value ?? 0);
      const max = Number(opts[opts.length - 1]?.value ?? (opts.length ? min : 100));
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

    // --- V2: Better Respondent Experience ---------------------------------

    case "swipe_card":
      return <SwipeCardInput options={question.options} value={value as string} onChange={onChange} />;

    case "card_choice":
      return (
        <CardChoiceInput
          options={question.options}
          value={value}
          allowMultiple={question.extraConfig?.allowMultiple ?? false}
          onChange={onChange}
        />
      );

    case "emoji_scale": {
      const emojis = question.extraConfig?.emojiSet ?? EMOJI_SCALE;
      const opts = question.options.length
        ? question.options
        : emojis.map((_, i) => ({ label: String(i + 1), value: String(i + 1) }));
      const current = value as string;
      return (
        <div className="flex gap-2">
          {opts.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-label={opt.label}
              className={cn(
                "flex-1 aspect-square max-w-16 rounded-full border text-2xl flex items-center justify-center transition-colors",
                current === opt.value ? "border-primary bg-accent" : "border-border hover:bg-accent/40",
              )}
            >
              {emojis[i] ?? "🙂"}
            </button>
          ))}
        </div>
      );
    }

    case "matrix": {
      const rows = question.extraConfig?.matrixRows ?? [];
      const answers = (value as Record<string, string>) ?? {};
      return (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left font-normal text-xs text-muted-foreground pb-2 pr-2" />
                {question.options.map((opt) => (
                  <th
                    key={opt.value}
                    className="text-center font-medium text-xs text-muted-foreground pb-2 px-1"
                  >
                    {opt.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row} className="border-t border-border">
                  <td className="py-2.5 pr-3 text-sm">{row}</td>
                  {question.options.map((opt) => (
                    <td key={opt.value} className="text-center py-2.5 px-1">
                      <button
                        type="button"
                        aria-label={`${row}: ${opt.label}`}
                        onClick={() => onChange({ ...answers, [row]: opt.value })}
                        className={cn(
                          "size-5 rounded-full border transition-colors inline-flex items-center justify-center",
                          answers[row] === opt.value
                            ? "border-primary bg-primary"
                            : "border-border hover:bg-accent",
                        )}
                      >
                        {answers[row] === opt.value && <Check className="size-3 text-primary-foreground" />}
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "categorize":
      return (
        <CategorizeInput
          items={question.extraConfig?.categorizeItems ?? []}
          categories={question.extraConfig?.categories ?? []}
          value={(value as Record<string, string[]>) ?? {}}
          onChange={onChange}
        />
      );

    case "pairwise_comparison":
      return (
        <PairwiseInput
          items={question.extraConfig?.comparisonItems ?? question.options.map((o) => o.value)}
          value={(value as Record<string, string>) ?? {}}
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
    if (to < 0 || to >= value.length) return;
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
          <GripVertical className="size-4 text-muted-foreground shrink-0" aria-hidden />
          <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}</span>
          <span className="text-sm flex-1">{labelByValue.get(v) ?? v}</span>
          {/* Keyboard-accessible alternative to the drag gesture above. */}
          <div className="flex gap-0.5 shrink-0">
            <button
              type="button"
              aria-label={`Move "${labelByValue.get(v) ?? v}" up`}
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
              className="size-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Move "${labelByValue.get(v) ?? v}" down`}
              disabled={i === value.length - 1}
              onClick={() => move(i, i + 1)}
              className="size-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/** swipe_card: same answer shape as yes_no (a single string, e.g. "yes"/"no")
 * but presented as a card with swipe gestures — plus fully keyboard/click
 * accessible left/right buttons, since not every respondent can swipe. */
const SWIPE_THRESHOLD = 80;

function SwipeCardInput({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const opts = options.length ? options : [{ label: "No", value: "no" }, { label: "Yes", value: "yes" }];
  const [left, right] = [opts[0], opts[opts.length - 1]];
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  function commit(choice: { label: string; value: string }) {
    onChange(choice.value);
    setDragX(0);
  }

  function endDrag(finalX: number) {
    setDragging(false);
    if (finalX > SWIPE_THRESHOLD) commit(right);
    else if (finalX < -SWIPE_THRESHOLD) commit(left);
    else setDragX(0);
  }

  const leaning = dragX > 12 ? "right" : dragX < -12 ? "left" : null;
  const pastThreshold = Math.abs(dragX) > SWIPE_THRESHOLD;

  return (
    <div>
      <div className="relative">
        {/* Directional hints revealed as the card leans past a small
            deadzone, so the respondent sees what a further swipe commits
            to before they let go — the un-fixed version gave no feedback
            at all until release. */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 flex items-center pl-3 text-destructive transition-opacity",
            leaning === "left" ? (pastThreshold ? "opacity-100" : "opacity-50") : "opacity-0",
          )}
        >
          <X className="size-5" />
        </div>
        <div
          className={cn(
            "absolute inset-y-0 right-0 flex items-center pr-3 text-sage transition-opacity",
            leaning === "right" ? (pastThreshold ? "opacity-100" : "opacity-50") : "opacity-0",
          )}
        >
          <Check className="size-5" />
        </div>
        <div
          ref={cardRef}
          className={cn(
            "relative rounded-xl border-2 bg-card p-8 text-center select-none touch-none",
            dragging ? "cursor-grabbing" : "cursor-grab",
            pastThreshold
              ? leaning === "right"
                ? "border-sage"
                : "border-destructive"
              : "border-border",
          )}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX / 20}deg)`,
            transition: dragging ? "none" : "transform 0.2s, border-color 0.15s",
          }}
          onPointerDown={(e) => {
            setDragging(true);
            startXRef.current = e.clientX;
            // Without capture, a fast drag that leaves the card's screen
            // bounds stops receiving pointermove/pointerup on this element
            // — the card was getting stuck mid-drag because of exactly
            // this, which read as "not working properly."
            cardRef.current?.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (dragging) setDragX(e.clientX - startXRef.current);
          }}
          onPointerUp={(e) => {
            cardRef.current?.releasePointerCapture(e.pointerId);
            endDrag(dragX);
          }}
          onPointerCancel={(e) => {
            cardRef.current?.releasePointerCapture(e.pointerId);
            endDrag(0);
          }}
        >
          <p className="text-base font-medium">
            {value ? opts.find((o) => o.value === value)?.label : "Drag left or right, or choose below"}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <Button
          type="button"
          variant={value === left.value ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={() => commit(left)}
        >
          <X className="size-4" />
          {left.label}
        </Button>
        <Button
          type="button"
          variant={value === right.value ? "default" : "outline"}
          className="flex-1 gap-1.5"
          onClick={() => commit(right)}
        >
          <Check className="size-4" />
          {right.label}
        </Button>
      </div>
    </div>
  );
}

/** card_choice: visual large-card variant of single_choice/multiple_choice —
 * same answer shape as those, just styled as a grid of cards. */
function CardChoiceInput({
  options,
  value,
  allowMultiple,
  onChange,
}: {
  options: { label: string; value: string; imageUrl?: string }[];
  value: AnswerValue;
  allowMultiple: boolean;
  onChange: (v: AnswerValue) => void;
}) {
  const selected = allowMultiple ? (Array.isArray(value) ? value : []) : value ? [value as string] : [];

  function toggle(optValue: string) {
    if (allowMultiple) {
      onChange(selected.includes(optValue) ? selected.filter((v) => v !== optValue) : [...selected, optValue]);
    } else {
      onChange(optValue);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const isSelected = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            aria-pressed={isSelected}
            className={cn(
              "rounded-xl border-2 p-4 text-left transition-colors",
              isSelected ? "border-primary bg-accent/60" : "border-border hover:bg-accent/30",
            )}
          >
            {opt.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opt.imageUrl} alt="" className="w-full aspect-video object-cover rounded-md mb-2" />
            )}
            <p className="text-sm font-medium">{opt.label}</p>
          </button>
        );
      })}
    </div>
  );
}

/** categorize: drag items into labeled buckets; each bucket also renders a
 * fully keyboard-usable <select> per item as the accessible alternative to
 * the drag gesture. */
function CategorizeInput({
  items,
  categories,
  value,
  onChange,
}: {
  items: string[];
  categories: string[];
  value: Record<string, string[]>;
  onChange: (v: Record<string, string[]>) => void;
}) {
  const assignment = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      for (const item of value[cat] ?? []) map.set(item, cat);
    }
    return map;
  }, [value, categories]);

  function assign(item: string, category: string) {
    const next: Record<string, string[]> = {};
    for (const cat of categories) next[cat] = (value[cat] ?? []).filter((i) => i !== item);
    next[category] = [...(next[category] ?? []), item];
    onChange(next);
  }

  const unassigned = items.filter((item) => !assignment.has(item));

  return (
    <div className="space-y-4">
      {unassigned.length > 0 && (
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
            To sort
          </p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((item) => (
              <div
                key={item}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", item)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm cursor-grab"
              >
                {item}
                <select
                  aria-label={`Assign "${item}" to a category`}
                  value=""
                  onChange={(e) => e.target.value && assign(item, e.target.value)}
                  className="text-xs bg-transparent border-l border-border pl-1.5 outline-none"
                >
                  <option value="" disabled>
                    Move to…
                  </option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div
            key={cat}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const item = e.dataTransfer.getData("text/plain");
              if (item) assign(item, cat);
            }}
            className="rounded-lg border border-dashed border-border p-3 min-h-24"
          >
            <p className="text-xs font-medium mb-2">{cat}</p>
            <div className="space-y-1.5">
              {(value[cat] ?? []).map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between gap-2 rounded-md bg-accent/50 px-2 py-1 text-xs"
                >
                  {item}
                  <select
                    aria-label={`Reassign "${item}"`}
                    value={cat}
                    onChange={(e) => assign(item, e.target.value)}
                    className="text-[11px] bg-transparent outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** pairwise_comparison: repeated forced-choice rounds between two items from
 * `items`, sequentially — value is { [itemA_vs_itemB]: winner } so partial
 * progress and every round's outcome is preserved. */
function PairwiseInput({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const rounds = useMemo(() => {
    const pairs: [string, string][] = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) pairs.push([items[i], items[j]]);
    }
    return pairs;
  }, [items]);

  const roundIndex = rounds.findIndex(([a, b]) => !(`${a}|${b}` in value));
  const current = roundIndex === -1 ? null : rounds[roundIndex];

  if (!current) {
    return (
      <p className="text-sm text-muted-foreground">
        All {rounds.length} comparisons complete — thank you.
      </p>
    );
  }

  const [a, b] = current;
  function pick(winner: string) {
    onChange({ ...value, [`${a}|${b}`]: winner });
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3 font-mono">
        Round {roundIndex + 1} / {rounds.length}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => pick(option)}
            className="rounded-xl border-2 border-border p-6 text-center font-medium hover:border-primary hover:bg-accent/40 transition-colors"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
