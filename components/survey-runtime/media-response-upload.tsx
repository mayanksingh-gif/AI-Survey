"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnswerValue } from "@/lib/survey/types";

/** V2 Multimedia: lets a respondent answer with an uploaded image/audio/
 * video file instead of (or alongside) the normal answer control, when the
 * question has allowMediaResponse set. The upload endpoint finds-or-creates
 * the Answer row for (responseId, questionId), so this works even before
 * any other answer has been progressively saved for this question. */
export function MediaResponseUpload({
  studyId,
  responseId,
  questionId,
  value,
  onChange,
}: {
  studyId: string;
  responseId: string | null;
  questionId: string;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = value && typeof value === "object" && "mediaId" in value ? value : null;

  async function handleFile(file: File) {
    if (!responseId) {
      setError("Start the survey first.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("responseId", responseId);
      form.append("questionId", questionId);
      const res = await fetch(`/api/studies/${studyId}/media`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Upload failed");
      }
      const { media } = await res.json();
      onChange({ mediaId: media.id, kind: media.kind });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs text-muted-foreground mb-2">Or answer with a photo/recording</p>
      {current ? (
        <div className="flex items-center gap-2 text-xs">
          <Mic className="size-3.5 text-sage" />
          <span className="text-sage">{current.kind} attached</span>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => onChange(null)}>
            <X className="size-3" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          Upload image/audio/video
        </Button>
      )}
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
      {error && <p className="mt-1 text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
