"use client";

import { useState } from "react";
import { Loader2, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { ADAPTIVE_FOLLOWUP_MODES, ADAPTIVE_FOLLOWUP_MAX, type AdaptiveFollowUpMode } from "@/lib/survey/types";

const LABELS: Record<AdaptiveFollowUpMode, string> = {
  off: "Off",
  conservative: "Conservative",
  balanced: "Balanced",
  deep: "Deep",
};

const DESCRIPTIONS: Record<AdaptiveFollowUpMode, string> = {
  off: "The survey asks exactly the questions you built — no live probing.",
  conservative: "Probes only when an open-text answer is clearly vague.",
  balanced: "Probes when a follow-up would add real specificity.",
  deep: "Digs for root causes and specifics on open-text answers.",
};

export function AdaptiveFollowUpSetting({
  studyId,
  value,
}: {
  studyId: string;
  value: AdaptiveFollowUpMode;
}) {
  const [mode, setMode] = useState<AdaptiveFollowUpMode>(value);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: AdaptiveFollowUpMode) {
    setMode(next);
    setSaving(true);
    try {
      await api.updateStudy(studyId, { adaptiveFollowUpMode: next });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save setting");
      setMode(value);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <MessageCircleQuestion className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Adaptive AI Follow-ups</p>
        </div>
        {saving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Let the AI ask a live follow-up when an open-text answer is vague — up to{" "}
        {mode === "off" ? "0" : ADAPTIVE_FOLLOWUP_MAX[mode]} per question. Never leading, never repeated.
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {ADAPTIVE_FOLLOWUP_MODES.map((m) => (
          <button
            key={m}
            onClick={() => handleChange(m)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
              mode === m
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent/60",
            )}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{DESCRIPTIONS[mode]}</p>
    </div>
  );
}
