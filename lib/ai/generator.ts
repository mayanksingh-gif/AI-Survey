// Survey Generator: research plan -> a full structured survey.
import { generateStructured } from "@/lib/llm/client";
import { SurveySchema } from "@/lib/llm/schemas";
import { QUESTION_TYPES, type ResearchPlan, type Survey } from "@/lib/survey/types";

const SYSTEM = `You are the Survey Generator inside an AI research copilot.
Given an approved research plan, produce a complete, ready-to-review survey:
a title, a short welcome screen, a thank-you screen, and an ordered list of
questions. Questions must be neutral, short, and easy to understand — never
leading or double-barrelled. Use ONLY these question types: ${QUESTION_TYPES.join(
  ", ",
)}. Every choice/rating/likert/nps/ranking question must include appropriate
"options" (e.g. rating 1-5 as options with numeric labels, NPS 0-10, Likert
with agreement labels). A "slider" question must have EXACTLY 2 options
representing [min, max] only — e.g. [{"label":"0","value":"0"},{"label":"100","value":"100"}]
— never one option per step; if you want a 0-10 discrete scale, use "nps" or
"rating" instead of "slider". Mark questions optional only when
skipping them is genuinely reasonable. Add simple branching only where the
plan's survey type calls for it (e.g. "have you used X?" -> Yes/No branches).
Assign each question a short unique id like "q1", "q2".`;

export async function generateSurvey(
  researchGoal: string,
  plan: ResearchPlan,
): Promise<Survey> {
  return generateStructured({
    system: SYSTEM,
    user: `Research goal: "${researchGoal}"

Approved research plan:
${JSON.stringify(plan, null, 2)}

Generate exactly ${plan.questionCount} questions (a reasonable ±1 tolerance is
fine if it clearly improves the survey). Set "experienceMode" to
"${plan.experienceMode}". Return JSON matching the Survey shape:
{
  "title": string,
  "welcomeScreen": { "heading": string, "body": string },
  "thankYouScreen": { "heading": string, "body": string },
  "questions": [{
    "id": string, "order": number, "type": string, "text": string,
    "helpText"?: string, "options": [{"label": string, "value": string}],
    "required": boolean, "branching"?: [{"when": string, "goTo": string}]
  }],
  "experienceMode": string
}`,
    schema: SurveySchema,
    temperature: 0.5,
    maxTokens: 2200,
  });
}
