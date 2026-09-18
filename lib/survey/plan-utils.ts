// Deterministic helpers around ResearchPlan.durationMinutes /
// ResearchPlan.questionCount. The local 4B model is asked to fill in a
// research plan holistically, and in practice it treats "duration" and
// "question count" as two independent free-form guesses rather than doing
// the arithmetic to keep them consistent — so a user who says "30 minutes"
// can get a plan that still only has ~10 questions. Both the initial plan
// generation and any manual edit to the plan route duration changes through
// these helpers instead of trusting the model's (or a stale) questionCount.
import type { FollowUpQA } from "@/lib/survey/types";

/** Roughly how long a respondent spends per question, used to convert a
 * stated survey duration into a target question count. Matches the
 * assumption already used by the Survey Optimizer's "reduce to under N
 * minutes" command (lib/ai/editor.ts) for consistency. */
const SECONDS_PER_QUESTION = 45;
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 40;

/** Parses a duration string like "30", "20-30", "15 minutes" into an
 * average number of minutes. Falls back to 5 if nothing parseable is
 * found (keeps the caller's math well-defined rather than throwing). */
function averageMinutes(durationMinutes: string): number {
  const nums = durationMinutes.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (!nums.length) return 5;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Given a stated/approved duration, compute the question count that
 * actually fits it. Clamped to a sane range so a typo'd "300 minutes"
 * doesn't generate a 400-question survey. */
export function estimateQuestionCountFromDuration(durationMinutes: string): number {
  const minutes = averageMinutes(durationMinutes);
  const count = Math.round((minutes * 60) / SECONDS_PER_QUESTION);
  return Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, count));
}

/** Scans the respondent's own pre-plan follow-up answers for an explicit
 * stated duration (e.g. "30 minutes", "10-15 mins") and returns it
 * normalized (e.g. "30" or "10-15"), or null if none was stated. This is
 * the ground truth for duration — the LLM's own plan.durationMinutes guess
 * is only used as a fallback when the user never actually said. */
export function extractStatedDurationMinutes(followUps: FollowUpQA[]): string | null {
  for (const { answer } of followUps) {
    if (!answer) continue;
    const match = answer.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:min|minute)/i);
    if (match) return `${match[1]}-${match[2]}`;
    const single = answer.match(/(\d+)\s*(?:min|minute)/i);
    if (single) return single[1];
  }
  return null;
}
