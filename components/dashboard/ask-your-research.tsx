"use client";

import { useState } from "react";
import { ArrowUp, Loader2, MessageSquareText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiLabel } from "@/components/brand/signal-glyph";
import { DesignerJokes } from "@/components/brand/designer-jokes";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  evidence?: string[];
}

const SUGGESTIONS = [
  "Why are users unhappy?",
  "What are the biggest complaints?",
  "What surprised you?",
  "What should we investigate next?",
];

export function AskYourResearch({ studyId, className }: { studyId: string; className?: string }) {
  const [history, setHistory] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<number | null>(null);

  async function handleSend(question?: string) {
    const q = (question ?? input).trim();
    if (!q || sending) return;
    setInput("");
    setHistory((h) => [...h, { role: "user", content: q }]);
    setSending(true);
    try {
      const result = await api.askResearch(
        studyId,
        q,
        history.map((h) => ({ role: h.role, content: h.content })),
      );
      if ("error" in result) {
        setHistory((h) => [...h, { role: "assistant", content: result.error }]);
      } else {
        setHistory((h) => [...h, { role: "assistant", content: result.answer, evidence: result.evidence }]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not answer that";
      setHistory((h) => [...h, { role: "assistant", content: `⚠ ${message}` }]);
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card flex flex-col min-h-0", className)}>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <MessageSquareText className="size-4 text-muted-foreground" />
        <p className="text-sm font-medium">Ask Your Research</p>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-4 space-y-3">
        {history.length === 0 && (
          <div className="text-center py-6">
            <AiLabel className="justify-center mb-2">Grounded in your actual data</AiLabel>
            <p className="text-xs text-muted-foreground">
              Ask about themes, drop-off, segments, or what to investigate next.
            </p>
          </div>
        )}

        {history.map((entry, i) => (
          <div key={i}>
            <div
              className={cn(
                "text-sm rounded-lg px-3 py-2 max-w-[95%] leading-relaxed",
                entry.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto"
                  : "bg-accent/60 text-foreground",
              )}
            >
              {entry.content}
            </div>
            {entry.evidence && entry.evidence.length > 0 && (
              <div className="mt-1">
                <button
                  onClick={() => setExpandedEvidence(expandedEvidence === i ? null : i)}
                  className="text-[11px] text-signal hover:underline"
                >
                  {expandedEvidence === i ? "Hide" : "View"} Supporting Responses ({entry.evidence.length})
                </button>
                {expandedEvidence === i && (
                  <ul className="mt-1.5 space-y-1">
                    {entry.evidence.map((e, ei) => (
                      <li key={ei} className="text-[11px] text-muted-foreground bg-muted/40 rounded px-2 py-1">
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="space-y-1.5 px-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Analyzing…
            </div>
            <DesignerJokes className="text-xs" intervalMs={2600} />
          </div>
        )}
      </div>

      <div className="p-3 border-t border-border space-y-2 shrink-0">
        {history.length === 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {SUGGESTIONS.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer text-[11px] hover:bg-accent/60"
                onClick={() => handleSend(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        )}
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your research…"
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
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowUp className="size-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
