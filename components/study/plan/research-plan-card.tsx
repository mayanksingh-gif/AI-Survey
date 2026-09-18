"use client";

import { useState } from "react";
import { Pencil, Loader2, Check, X } from "lucide-react";
import { AiLabel } from "@/components/brand/signal-glyph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  SURVEY_TYPES,
  EXPERIENCE_MODES,
  INTERACTION_LEVELS,
  type ResearchPlan,
} from "@/lib/survey/types";
import { estimateQuestionCountFromDuration } from "@/lib/survey/plan-utils";
import { toast } from "sonner";

const EXPERIENCE_LABEL: Record<string, string> = {
  professional: "Professional",
  conversational: "Conversational",
  playful: "Playful",
};

const INTERACTION_LABEL: Record<string, string> = {
  none: "None",
  light: "Light",
  medium: "Medium",
  high: "High",
};

type EditableField = Extract<
  keyof ResearchPlan,
  "surveyType" | "audience" | "sampleSize" | "durationMinutes" | "questionCount" | "metric" | "distributionMethod" | "experienceMode" | "interactionLevel"
>;

const FIELDS: { key: EditableField; label: string }[] = [
  { key: "surveyType", label: "Recommended method" },
  { key: "audience", label: "Audience" },
  { key: "sampleSize", label: "Suggested sample size" },
  { key: "durationMinutes", label: "Duration" },
  { key: "questionCount", label: "Questions" },
  { key: "metric", label: "Main metric" },
  { key: "distributionMethod", label: "Distribution" },
  { key: "experienceMode", label: "Experience" },
  { key: "interactionLevel", label: "Interaction level" },
];

export function ResearchPlanCard({
  plan,
  onSave,
}: {
  plan: ResearchPlan;
  /** When provided, an Edit affordance is shown and saves round-trip
   * through this callback (which should PATCH the plan and update local
   * state with the server's response — question count may get recomputed
   * server-side if duration changed). */
  onSave?: (patch: Partial<ResearchPlan>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ResearchPlan>(plan);
  const [saving, setSaving] = useState(false);

  function startEditing() {
    setDraft(plan);
    setEditing(true);
  }

  function updateDraft<K extends keyof ResearchPlan>(key: K, value: ResearchPlan[K]) {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      // Mirror the same duration -> question count consistency the server
      // enforces, so the field visibly updates as the user types rather
      // than only correcting itself after save.
      if (key === "durationMinutes" && typeof value === "string") {
        next.questionCount = estimateQuestionCountFromDuration(value);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      toast.success("Research plan updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-6 pt-6 flex items-center justify-between">
        <AiLabel>Recommended research plan</AiLabel>
        {onSave && !editing && (
          <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1.5 h-7 text-xs">
            <Pencil className="size-3.5" /> Edit
          </Button>
        )}
        {editing && (
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving} className="gap-1 h-7 text-xs">
              <X className="size-3.5" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1 h-7 text-xs">
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Save
            </Button>
          </div>
        )}
      </div>

      {!editing && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border mt-4">
          {FIELDS.map(({ key, label }) => (
            <div key={key} className="bg-card px-4 py-3">
              <dt className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="mt-1 text-sm font-medium">
                {key === "experienceMode"
                  ? EXPERIENCE_LABEL[plan.experienceMode] ?? plan.experienceMode
                  : key === "interactionLevel"
                    ? INTERACTION_LABEL[plan.interactionLevel] ?? plan.interactionLevel
                    : String(plan[key])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {editing && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border mt-4">
          <EditField label="Recommended method">
            <select
              value={draft.surveyType}
              onChange={(e) => updateDraft("surveyType", e.target.value as ResearchPlan["surveyType"])}
              className="w-full h-8 rounded-md bg-secondary px-2 text-sm border-0"
            >
              {SURVEY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </EditField>
          <EditField label="Audience">
            <Input value={draft.audience} onChange={(e) => updateDraft("audience", e.target.value)} className="h-8 text-sm" />
          </EditField>
          <EditField label="Suggested sample size">
            <Input
              type="number"
              min={1}
              value={draft.sampleSize}
              onChange={(e) => updateDraft("sampleSize", Math.max(1, Number(e.target.value) || 1))}
              className="h-8 text-sm"
            />
          </EditField>
          <EditField label="Duration (minutes)">
            <Input
              value={draft.durationMinutes}
              onChange={(e) => updateDraft("durationMinutes", e.target.value)}
              placeholder="e.g. 30 or 20-30"
              className="h-8 text-sm"
            />
          </EditField>
          <EditField label="Questions" hint="Auto-follows duration — override if needed">
            <Input
              type="number"
              min={1}
              value={draft.questionCount}
              onChange={(e) => updateDraft("questionCount", Math.max(1, Number(e.target.value) || 1))}
              className="h-8 text-sm"
            />
          </EditField>
          <EditField label="Main metric">
            <Input value={draft.metric} onChange={(e) => updateDraft("metric", e.target.value)} className="h-8 text-sm" />
          </EditField>
          <EditField label="Distribution">
            <Input
              value={draft.distributionMethod}
              onChange={(e) => updateDraft("distributionMethod", e.target.value)}
              className="h-8 text-sm"
            />
          </EditField>
          <EditField label="Experience">
            <select
              value={draft.experienceMode}
              onChange={(e) => updateDraft("experienceMode", e.target.value as ResearchPlan["experienceMode"])}
              className="w-full h-8 rounded-md bg-secondary px-2 text-sm border-0"
            >
              {EXPERIENCE_MODES.map((m) => (
                <option key={m} value={m}>{EXPERIENCE_LABEL[m]}</option>
              ))}
            </select>
          </EditField>
          <EditField label="Interaction level">
            <select
              value={draft.interactionLevel}
              onChange={(e) => updateDraft("interactionLevel", e.target.value as ResearchPlan["interactionLevel"])}
              className="w-full h-8 rounded-md bg-secondary px-2 text-sm border-0"
            >
              {INTERACTION_LEVELS.map((l) => (
                <option key={l} value={l}>{INTERACTION_LABEL[l]}</option>
              ))}
            </select>
          </EditField>
        </div>
      )}

      <div className="px-6 py-5 border-t border-border grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
            Why this method
          </p>
          {editing ? (
            <Textarea
              rows={3}
              value={draft.rationale}
              onChange={(e) => updateDraft("rationale", e.target.value)}
              className="resize-none text-sm"
            />
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed">{plan.rationale}</p>
          )}
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground mb-1.5">
            Why this interaction level
          </p>
          {editing ? (
            <Textarea
              rows={3}
              value={draft.interactionLevelRationale}
              onChange={(e) => updateDraft("interactionLevelRationale", e.target.value)}
              className="resize-none text-sm"
            />
          ) : (
            <p className="text-sm text-foreground/90 leading-relaxed">{plan.interactionLevelRationale}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-card px-4 py-3 space-y-1.5">
      <label className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground block">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
