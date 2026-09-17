"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QuestionTypeBadge } from "@/components/survey-builder/question-type-badge";
import type { BranchingRule, SurveyQuestion } from "@/lib/survey/types";

interface Props {
  question: SurveyQuestion;
  index: number;
  total: number;
  allQuestions: SurveyQuestion[];
  onChange: (next: SurveyQuestion) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

const OPTION_TYPES = new Set(["single_choice", "multiple_choice"]);
const BRANCHABLE_TYPES = new Set(["single_choice", "yes_no"]);

export function QuestionEditorCard({ question, index, total, allQuestions, onChange, onDelete, onMove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const branchOptions =
    question.type === "yes_no"
      ? [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
      : question.options;

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 p-3">
        <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <GripVertical className="size-3.5 text-muted-foreground/50" />
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs text-muted-foreground w-5">{index + 1}</span>
            <QuestionTypeBadge type={question.type} />
            {!question.required && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">optional</span>
            )}
          </div>
          <Textarea
            value={question.text}
            onChange={(e) => onChange({ ...question, text: e.target.value })}
            rows={1}
            className="resize-none text-sm font-medium border-0 shadow-none p-0 focus-visible:ring-0 min-h-0"
          />

          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {expanded ? "Hide details" : "Edit options & logic"}
          </button>

          {expanded && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              {OPTION_TYPES.has(question.type) && (
                <OptionsEditor
                  options={question.options}
                  onChange={(options) => onChange({ ...question, options })}
                />
              )}

              {BRANCHABLE_TYPES.has(question.type) && (
                <BranchingEditor
                  branching={question.branching ?? []}
                  branchOptions={branchOptions}
                  allQuestions={allQuestions.filter((q) => q.id !== question.id)}
                  onChange={(branching) => onChange({ ...question, branching })}
                />
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={question.required}
                  onCheckedChange={(required) => onChange({ ...question, required })}
                />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
            </div>
          )}
        </div>

        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground shrink-0" onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function OptionsEditor({
  options,
  onChange,
}: {
  options: SurveyQuestion["options"];
  onChange: (options: SurveyQuestion["options"]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Options</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={opt.label}
            onChange={(e) => {
              const next = [...options];
              next[i] = { label: e.target.value, value: e.target.value };
              onChange(next);
            }}
            className="h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={() => onChange(options.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => onChange([...options, { label: "New option", value: `option-${options.length + 1}` }])}
      >
        <Plus className="size-3" />
        Add option
      </Button>
    </div>
  );
}

function BranchingEditor({
  branching,
  branchOptions,
  allQuestions,
  onChange,
}: {
  branching: BranchingRule[];
  branchOptions: { label: string; value: string }[];
  allQuestions: SurveyQuestion[];
  onChange: (branching: BranchingRule[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Branching</p>
      {branching.map((rule, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">If</span>
          <select
            value={rule.when}
            onChange={(e) => {
              const next = [...branching];
              next[i] = { ...rule, when: e.target.value };
              onChange(next);
            }}
            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
          >
            {branchOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground">go to</span>
          <select
            value={rule.goTo}
            onChange={(e) => {
              const next = [...branching];
              next[i] = { ...rule, goTo: e.target.value };
              onChange(next);
            }}
            className="h-7 rounded-md border border-border bg-background px-1.5 text-xs flex-1 min-w-0"
          >
            <option value="end">Thank-you screen</option>
            {allQuestions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.text.slice(0, 40)}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground"
            onClick={() => onChange(branching.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() =>
          onChange([...branching, { when: branchOptions[0]?.value ?? "", goTo: "end" }])
        }
        disabled={!branchOptions.length}
      >
        <Plus className="size-3" />
        Add rule
      </Button>
    </div>
  );
}
