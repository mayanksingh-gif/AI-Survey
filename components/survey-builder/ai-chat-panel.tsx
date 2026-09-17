"use client";

import { useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AiLabel } from "@/components/brand/signal-glyph";
import { DesignerJokes } from "@/components/brand/designer-jokes";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Survey } from "@/lib/survey/types";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Make the survey shorter",
  "Make the language more casual",
  "Add an NPS question",
  "Make question 2 optional",
];

export function AiChatPanel({
  studyId,
  onSurveyUpdated,
}: {
  studyId: string;
  onSurveyUpdated: (survey: Survey) => void;
}) {
  const [history, setHistory] = useState<ChatEntry[]>([
    {
      role: "assistant",
      content:
        "I generated your survey — tell me what to change. Try \"make it shorter\", \"add a pricing question\", or \"rewrite question 3\".",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSend() {
    const instruction = input.trim();
    if (!instruction || sending) return;
    setInput("");
    setHistory((h) => [...h, { role: "user", content: instruction }]);
    setSending(true);
    try {
      const { survey, changeSummary } = await api.editSurvey(studyId, instruction);
      onSurveyUpdated(survey);
      setHistory((h) => [...h, { role: "assistant", content: changeSummary }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not apply that change";
      setHistory((h) => [...h, { role: "assistant", content: `⚠ ${message}` }]);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <AiLabel>AI Chat</AiLabel>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {history.map((entry, i) => (
          <div
            key={i}
            className={cn(
              "text-sm rounded-lg px-3 py-2 max-w-[92%] leading-relaxed",
              entry.role === "user"
                ? "bg-primary text-primary-foreground ml-auto"
                : "bg-accent/60 text-foreground",
            )}
          >
            {entry.content}
          </div>
        ))}
        {sending && (
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Updating survey…
            </div>
            <DesignerJokes className="text-xs" intervalMs={2600} />
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell the AI what to change…"
            rows={2}
            className="resize-none pr-10 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            size="icon"
            className="absolute bottom-2 right-2 size-7"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AiChatEmptyHint() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 text-muted-foreground text-sm gap-2">
      <Sparkles className="size-5" />
      Generate a survey from the Plan tab first.
    </div>
  );
}
