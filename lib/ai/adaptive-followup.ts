// Adaptive Follow-Up Agent: decides, after a respondent answers an open-text
// question, whether a further probe would meaningfully improve the research
// — and if so, generates it. Runs live during a response, not at survey-
// design time. Bounded by the study's adaptiveFollowUpMode
// (off/conservative/balanced/deep -> ADAPTIVE_FOLLOWUP_MAX probes).
import { generateStructured } from "@/lib/llm/client";
import { AdaptiveFollowUpDecisionSchema } from "@/lib/llm/schemas";
import { ADAPTIVE_FOLLOWUP_MAX, type AdaptiveFollowUpMode } from "@/lib/survey/types";

const SYSTEM = `You are the Adaptive Follow-Up Agent inside an AI research
copilot, embedded live in a survey a respondent is currently taking. You see
one base question, the respondent's answer, and any follow-ups already asked
in this chain. Decide whether ONE more follow-up would meaningfully deepen
the research, or whether enough detail has already been collected.

Ask a follow-up only when it would surface something genuinely useful and
not already covered — e.g. an answer that's vague, names a problem without
specifics, or contradicts something. Do NOT ask a follow-up when:
- the answer is already specific and complete
- the same ground would be covered again
- the respondent gave a short but complete answer to a simple question
- you've already probed this chain enough to get the useful detail

When you do ask, the follow-up must:
- stay tightly focused on what the respondent just said (not the original
  research objective in the abstract)
- be neutral — never lead the respondent toward a particular answer
- be a single, short, natural question
- never repeat a question already asked in this chain

Be conservative by default — most answers do not need a follow-up.`;

export async function decideAdaptiveFollowUp(args: {
  researchGoal: string;
  baseQuestionText: string;
  baseAnswer: string;
  priorFollowUps: { question: string; answer: string | null }[];
  mode: AdaptiveFollowUpMode;
}): Promise<{ shouldAsk: boolean; followUpQuestion?: string; reason: string }> {
  if (args.mode === "off") {
    return { shouldAsk: false, reason: "Adaptive follow-ups are turned off for this study." };
  }
  const maxProbes = ADAPTIVE_FOLLOWUP_MAX[args.mode];
  if (args.priorFollowUps.length >= maxProbes) {
    return {
      shouldAsk: false,
      reason: `Already asked the maximum ${maxProbes} follow-up(s) for mode "${args.mode}".`,
    };
  }

  const chainContext = args.priorFollowUps.length
    ? `\n\nFollow-ups already asked in this chain:\n${args.priorFollowUps
        .map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer ?? "(not yet answered)"}`)
        .join("\n")}`
    : "";

  const modeGuidance: Record<AdaptiveFollowUpMode, string> = {
    off: "",
    conservative: "Only ask if the answer is clearly vague or incomplete. Default to not asking.",
    balanced: "Ask when a follow-up would add real specificity, but don't probe simple/complete answers.",
    deep: "Be more willing to dig for detail, root causes, and specifics — but still never repeat ground already covered and still stop once genuinely enough detail exists.",
  };

  return generateStructured({
    system: `${SYSTEM}\n\nMode guidance for this study ("${args.mode}"): ${modeGuidance[args.mode]}`,
    user: `Research goal: "${args.researchGoal}"

Base question: "${args.baseQuestionText}"
Respondent's answer: "${args.baseAnswer}"${chainContext}

Return JSON: { "shouldAsk": boolean, "followUpQuestion"?: string, "reason": string }`,
    schema: AdaptiveFollowUpDecisionSchema,
    temperature: 0.3,
    maxTokens: 300,
  });
}
