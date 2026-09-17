"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

const EXAMPLE =
  "We redesigned our checkout flow and want to understand where customers still struggle.";

export function NewStudyHero() {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = goal.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const { study } = await api.createStudy(trimmed);
      router.push(`/studies/${study.id}/plan`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start study");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center">
      <p className="mb-4 text-xs font-mono uppercase tracking-[0.18em] text-muted-foreground">
        New study
      </p>
      <h1 className="font-heading text-[2.5rem] sm:text-[3.25rem] leading-[1.05] tracking-tight font-medium">
        What do you want to learn?
      </h1>
      <p className="mt-4 text-base text-muted-foreground max-w-xl mx-auto">
        Describe the question in your own words. Copilot will ask only what it
        needs, then plan, build, and analyze the survey for you.
      </p>

      <div className="mt-10 text-left">
        <div className="relative rounded-xl border border-border bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring/40 transition-shadow">
          <Textarea
            autoFocus
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={EXAMPLE}
            rows={4}
            className="resize-none border-0 shadow-none text-base leading-relaxed p-5 pb-16 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
              ⌘ + Enter
            </span>
            <Button onClick={handleSubmit} disabled={!goal.trim() || submitting} size="sm" className="gap-1.5">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Start
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setGoal(EXAMPLE)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Try an example →
        </button>
      </div>
    </section>
  );
}
