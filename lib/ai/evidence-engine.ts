// Evidence Engine: pure, deterministic scoring of how strong the evidence
// behind a candidate insight is — NOT an LLM call. The Insight Generator
// asks the LLM for a finding/hypothesis/action, but the evidence-strength
// verdict itself must never be something the model asserts about its own
// output; it's computed from the same ground-truth data everything else in
// this app uses, per "do not invent statistical certainty."
import type { QuestionStats } from "@/lib/survey/stats";
import type { EvidenceItem, EvidenceStrength } from "@/lib/survey/types";

const MIN_FOR_EARLY_SIGNAL = 5;
const MIN_FOR_MODERATE = 20;
const MIN_FOR_STRONG = 50;

export interface EvidenceAssessment {
  strength: EvidenceStrength;
  reason: string;
}

/**
 * Scores evidence strength from concrete signals:
 * - sample size backing the relevant question(s)
 * - whether both quantitative and qualitative evidence support the claim
 * - consistency: for a quantitative claim, how lopsided the distribution is
 *   (a near-even split is weaker evidence than a strong majority)
 */
export function assessEvidenceStrength(args: {
  relatedQuestionStats: QuestionStats[];
  evidence: EvidenceItem[];
}): EvidenceAssessment {
  const { relatedQuestionStats, evidence } = args;

  const sampleSize = Math.max(0, ...relatedQuestionStats.map((q) => q.responseCount), 0);
  const hasQuantitative = evidence.some((e) => e.kind === "quantitative");
  const hasQualitative = evidence.some((e) => e.kind === "qualitative");
  const bothKinds = hasQuantitative && hasQualitative;

  if (sampleSize < MIN_FOR_EARLY_SIGNAL) {
    return {
      strength: "insufficient_data",
      reason: `Only ${sampleSize} response${sampleSize === 1 ? "" : "s"} back this — too few to draw a conclusion.`,
    };
  }

  // Consistency check: for choice/option-based questions, how concentrated
  // is the top answer? A near-even split undermines an otherwise large N.
  let maxShare = 1;
  for (const q of relatedQuestionStats) {
    if (!q.optionCounts?.length) continue;
    const total = q.optionCounts.reduce((sum, o) => sum + o.count, 0);
    if (!total) continue;
    const top = Math.max(...q.optionCounts.map((o) => o.count));
    maxShare = Math.min(maxShare, top / total);
  }
  const consistent = maxShare >= 0.5; // top answer is at least a plurality-plus

  if (sampleSize >= MIN_FOR_STRONG && bothKinds && consistent) {
    return {
      strength: "strong",
      reason: `${sampleSize} responses, supported by both quantitative data and open-text feedback, with a consistent pattern.`,
    };
  }

  if (sampleSize >= MIN_FOR_MODERATE && (bothKinds || consistent)) {
    return {
      strength: "moderate",
      reason: `${sampleSize} responses` + (bothKinds ? ", with both quantitative and qualitative support." : "."),
    };
  }

  if (sampleSize >= MIN_FOR_EARLY_SIGNAL) {
    return {
      strength: "early_signal",
      reason: `${sampleSize} responses is a real but small sample — treat this as a signal worth investigating further, not a settled conclusion.`,
    };
  }

  return {
    strength: "insufficient_data",
    reason: `Sample size (${sampleSize}) is too small to support a confident claim.`,
  };
}
