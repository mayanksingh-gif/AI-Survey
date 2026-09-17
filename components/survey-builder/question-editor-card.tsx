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

const OPTION_TYPES = new Set([
  "single_choice",
  "multiple_choice",
  "card_choice",
  "emoji_scale",
  "matrix",
]);
const BRANCHABLE_TYPES = new Set(["single_choice", "yes_no", "swipe_card", "card_choice"]);
const MATRIX_ROWS_TYPES = new Set(["matrix"]);
const CATEGORIZE_TYPES = new Set(["categorize"]);
const PAIRWISE_TYPES = new Set(["pairwise_comparison"]);

export function QuestionEditorCard({ question, index, total, allQuestions, onChange, onDelete, onMove }: Props) {
  const [expanded, setExpanded] = useState(false);
  const branchOptions =
    (question.type === "yes_no" || question.type === "swipe_card") && !question.options.length
      ? [{ label: "No", value: "no" }, { label: "Yes", value: "yes" }]
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

              {MATRIX_ROWS_TYPES.has(question.type) && (
                <StringListEditor
                  label="Rows"
                  items={question.extraConfig?.matrixRows ?? []}
                  placeholder="New row"
                  onChange={(matrixRows) =>
                    onChange({ ...question, extraConfig: { ...question.extraConfig, matrixRows } })
                  }
                />
              )}

              {CATEGORIZE_TYPES.has(question.type) && (
                <>
                  <StringListEditor
                    label="Items to sort"
                    items={question.extraConfig?.categorizeItems ?? []}
                    placeholder="New item"
                    onChange={(categorizeItems) =>
                      onChange({ ...question, extraConfig: { ...question.extraConfig, categorizeItems } })
                    }
                  />
                  <StringListEditor
                    label="Categories"
                    items={question.extraConfig?.categories ?? []}
                    placeholder="New category"
                    onChange={(categories) =>
                      onChange({ ...question, extraConfig: { ...question.extraConfig, categories } })
                    }
                  />
                </>
              )}

              {PAIRWISE_TYPES.has(question.type) && (
                <StringListEditor
                  label="Items to compare"
                  items={question.extraConfig?.comparisonItems ?? []}
                  placeholder="New item"
                  onChange={(comparisonItems) =>
                    onChange({ ...question, extraConfig: { ...question.extraConfig, comparisonItems } })
                  }
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

/** Generic editable list of plain strings — used for matrix rows,
 * categorize items/categories, and pairwise comparison items, which are all
 * just string[] in extraConfig rather than {label,value} option pairs. */
function StringListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="h-8 text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="size-3" />
        {placeholder}
      </Button>
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
