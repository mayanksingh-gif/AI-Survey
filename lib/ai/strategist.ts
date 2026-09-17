// Research Strategist: research goal (+ follow-up answers) -> either more
// necessary follow-up questions, or a full research plan.
import { generateStructured } from "@/lib/llm/client";
import { FollowUpQuestionsSchema, ResearchPlanSchema } from "@/lib/llm/schemas";
import { INTERACTION_LEVELS, SURVEY_TYPES, type FollowUpQA, type ResearchPlan } from "@/lib/survey/types";

const SYSTEM = `You are the Research Strategist inside an AI research copilot.
Given a user's research goal (and any follow-up Q&A already gathered), decide
what — if anything — is still missing before a survey can be designed well.
Only ask about what is genuinely necessary: who the respondents are, what
decision the research informs, how many respondents are reachable, and how
long the survey should be. Never ask a question whose answer is already
implied by the goal or by previous answers. Be terse and concrete.`;

export async function getFollowUpQuestions(
  researchGoal: string,
  followUps: FollowUpQA[],
): Promise<string[]> {
  const context = followUps.length
    ? `\n\nAlready answered:\n${followUps
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n")}`
    : "";

  const result = await generateStructured({
    system: SYSTEM,
    user: `Research goal: "${researchGoal}"${context}

Return JSON: { "followUpQuestions": string[] }. Include ONLY questions that
are still unanswered and necessary (max 4). If nothing further is needed,
return an empty array.`,
    schema: FollowUpQuestionsSchema,
    temperature: 0.3,
  });

  return result.followUpQuestions;
}

export async function generateResearchPlan(
  researchGoal: string,
  followUps: FollowUpQA[],
): Promise<ResearchPlan> {
  const context = followUps.length
    ? `\n\nFollow-up answers:\n${followUps
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n")}`
    : "";

  return generateStructured({
    system: `${SYSTEM}

Now recommend a concrete research plan. Choose surveyType from exactly this
list: ${SURVEY_TYPES.join(", ")}. Pick experienceMode from: professional,
conversational, playful — do not over-gamify serious research (e.g. employee
feedback, churn, academic research should usually be professional or
conversational, not playful). Briefly justify the recommendation in
"rationale" (1-3 sentences).

Also recommend an interactionLevel from exactly: ${INTERACTION_LEVELS.join(", ")}
— how much interactive/gamified presentation (large cards, emoji scales,
sliders, drag ranking, progress celebrations) the survey should use on top
of its base questions. Guidance: academic research -> none or light;
employee feedback -> light; product feedback -> light or medium; marketing
quiz/consumer engagement -> high. Never recommend a level that would make
serious or sensitive research feel unserious. Explain the recommendation in
"interactionLevelRationale" (1-2 sentences).`,
    user: `Research goal: "${researchGoal}"${context}

Return JSON matching:
{
  "surveyType": string,
  "audience": string,
  "sampleSize": number,
  "durationMinutes": string (e.g. "3-4"),
  "questionCount": number,
  "metric": string,
  "distributionMethod": string,
  "experienceMode": "professional" | "conversational" | "playful",
  "rationale": string,
  "interactionLevel": "none" | "light" | "medium" | "high",
  "interactionLevelRationale": string
}`,
    schema: ResearchPlanSchema,
    temperature: 0.4,
  });
}
