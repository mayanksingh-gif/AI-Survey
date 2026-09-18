"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, GripVertical, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { QUESTION_TYPE_LABELS } from "@/components/survey-builder/question-type-badge";
import { QUESTION_TYPES, type BranchingRule, type MediaRef, type SurveyQuestion } from "@/lib/survey/types";

interface Props {
  question: SurveyQuestion;
  index: number;
  total: number;
  allQuestions: SurveyQuestion[];
  studyId: string;
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

export function QuestionEditorCard({ question, index, total, allQuestions, studyId, onChange, onDelete, onMove }: Props) {
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
            <select
              value={question.type}
              onChange={(e) => {
                const type = e.target.value as SurveyQuestion["type"];
                // card_choice is the "compare 2+ images" type — seed two
                // blank options immediately so the image-upload slots this
                // change unlocks are visible right away, not hidden behind
                // an empty options list the user has to know to fill in.
                const options =
                  type === "card_choice" && question.options.length < 2
                    ? [
                        { label: "Option A", value: "option-a" },
                        { label: "Option B", value: "option-b" },
                      ]
                    : question.options;
                onChange({ ...question, type, options });
                if (type === "card_choice") setExpanded(true);
              }}
              className="h-5 rounded bg-secondary px-1.5 text-[10px] font-mono uppercase tracking-wide text-secondary-foreground border-0 cursor-pointer"
              title="Change question type"
            >
              {QUESTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
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
                  // Per-option images only make sense for the visual/
                  // comparison-style type — matrix/emoji_scale options are
                  // a shared scale (agreement labels, emoji), not distinct
                  // things being compared, so an image per option there
                  // wouldn't mean anything.
                  allowImages={question.type === "card_choice"}
                  studyId={studyId}
                  questionId={question.id}
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

              <StimulusMediaEditor
                studyId={studyId}
                questionId={question.id}
                media={question.stimulusMedia ?? []}
                onChange={(stimulusMedia) => onChange({ ...question, stimulusMedia })}
              />

              <div className="flex items-center gap-2">
                <Switch
                  checked={question.required}
                  onCheckedChange={(required) => onChange({ ...question, required })}
                />
                <span className="text-xs text-muted-foreground">Required</span>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={question.allowMediaResponse ?? false}
                  onCheckedChange={(allowMediaResponse) => onChange({ ...question, allowMediaResponse })}
                />
                <span className="text-xs text-muted-foreground">
                  Allow respondents to answer with a photo/recording
                </span>
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
  allowImages,
  studyId,
  questionId,
  onChange,
}: {
  options: SurveyQuestion["options"];
  /** card_choice only — see the caller for why. Requires studyId+questionId
   * to upload. */
  allowImages?: boolean;
  studyId?: string;
  questionId?: string;
  onChange: (options: SurveyQuestion["options"]) => void;
}) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  async function handleImageFile(i: number, file: File) {
    if (!studyId || !questionId) return;
    setUploadingIndex(i);
    try {
      const form = new FormData();
      form.append("file", file);
      // Reuses the question-stimulus upload path purely to get a stored
      // URL back — there's no per-option Media relation, so the option
      // just keeps the url string. The resulting Media row is attached to
      // this question like any stimulus upload; harmless since it's never
      // rendered unless also added to stimulusMedia.
      form.append("questionId", questionId);
      const res = await fetch(`/api/studies/${studyId}/media`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Upload failed");
      const { media } = await res.json();
      const next = [...options];
      next[i] = { ...next[i], imageUrl: media.url };
      onChange(next);
    } catch {
      // Swallow — same rationale as StimulusMediaEditor: no toast plumbing
      // reaches this deep, a failed upload just leaves imageUrl unset.
    } finally {
      setUploadingIndex(null);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">Options</p>
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-1.5">
          {allowImages && (
            <>
              <button
                type="button"
                onClick={() => inputRefs.current[i]?.click()}
                className="size-8 shrink-0 rounded-md border border-dashed border-border flex items-center justify-center overflow-hidden hover:border-foreground/40 transition-colors"
                title={opt.imageUrl ? "Replace image" : "Add image"}
              >
                {uploadingIndex === i ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : opt.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="size-3.5 text-muted-foreground" />
                )}
              </button>
              <input
                ref={(el) => {
                  inputRefs.current[i] = el;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageFile(i, file);
                }}
              />
            </>
          )}
          <Input
            value={opt.label}
            onChange={(e) => {
              const next = [...options];
              next[i] = { ...next[i], label: e.target.value, value: e.target.value };
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

/** V2 Multimedia: attach image/video/audio stimulus to a question — shown
 * to the respondent above the question text (see StimulusMedia in
 * survey-runner.tsx). */
function StimulusMediaEditor({
  studyId,
  questionId,
  media,
  onChange,
}: {
  studyId: string;
  questionId: string;
  media: MediaRef[];
  onChange: (media: MediaRef[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("questionId", questionId);
      const res = await fetch(`/api/studies/${studyId}/media`, { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || "Upload failed");
      const { media: created } = await res.json();
      onChange([...media, { id: created.id, kind: created.kind, url: created.url, mimeType: created.mimeType }]);
    } catch {
      // Swallow — a failed stimulus upload just means nothing gets added;
      // the builder toast layer is one level up and doesn't reach here.
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
        Stimulus media
      </p>
      {media.map((m) => (
        <div key={m.id} className="flex items-center gap-2 text-xs">
          <span className="capitalize">{m.kind}</span>
          <span className="text-muted-foreground truncate flex-1">{m.url}</span>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground"
            onClick={() => onChange(media.filter((x) => x.id !== m.id))}
          >
            <X className="size-3" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs gap-1"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
        Attach image/video/audio
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,audio/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
