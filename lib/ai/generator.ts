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
)}.

Default to the simple, reliable core types (single_choice, multiple_choice,
yes_no, short_text, long_text, rating, likert, nps, slider, ranking) unless
the research goal or a stated interaction level genuinely calls for one of
the richer types below — do not use them just because they exist.

Every choice/rating/likert/nps/ranking question must include appropriate
"options" (e.g. rating 1-5 as options with numeric labels, NPS 0-10, Likert
with agreement labels). A "slider" question must have EXACTLY 2 options
representing [min, max] only — e.g. [{"label":"0","value":"0"},{"label":"100","value":"100"}]
— never one option per step; if you want a 0-10 discrete scale, use "nps" or
"rating" instead of "slider".

Richer V2 types and their required "extraConfig":
- "matrix": "options" is the shared scale (e.g. agreement labels); set
  extraConfig.matrixRows to the list of sub-statements being rated.
- "categorize": set extraConfig.categorizeItems (things to sort) and
  extraConfig.categories (the buckets); "options" unused.
- "pairwise_comparison": set extraConfig.comparisonItems to the full
  candidate list (each round shows 2 at a time); "options" unused.
- "swipe_card": same answer shape as yes_no — "options" is exactly 2 entries,
  first = negative/left swipe, last = positive/right swipe.
- "card_choice": visual variant of single_choice/multiple_choice — normal
  "options"; set extraConfig.allowMultiple: true only if multiple selection
  is wanted (defaults to single-select). Use this type when the research
  goal is fundamentally a visual comparison (e.g. "which design do
  respondents prefer", concept/screenshot A-vs-B testing) — the creator
  attaches the actual images to each option afterward in the builder, so
  never invent or guess an "imageUrl" value yourself; leave it unset and
  just get the option labels right (e.g. "Design A", "Design B", or the
  actual concept names from the research goal if given).
- "emoji_scale": visual variant of rating — "options" like rating, optionally
  set extraConfig.emojiSet to override the default emoji glyphs.

Mark questions optional only when skipping them is genuinely reasonable. Add
simple branching only where the plan's survey type calls for it (e.g. "have
you used X?" -> Yes/No branches). For NPS-style research, branch promoters
(9-10) and detractors (0-6) to different follow-up questions when that adds
real value (e.g. promoters -> "what do you like most?", detractors -> "what
would need to change?") rather than asking everyone the same generic
follow-up. Assign each question a short unique id like "q1", "q2".`;

export async function generateSurvey(
  researchGoal: string,
  plan: ResearchPlan,
): Promise<Survey> {
  const survey = await generateStructured({
    system: SYSTEM,
    user: `Research goal: "${researchGoal}"

Approved research plan:
${JSON.stringify(plan, null, 2)}

Generate exactly ${plan.questionCount} questions (a reasonable ±1 tolerance is
fine if it clearly improves the survey). Set "experienceMode" to
"${plan.experienceMode}". The plan's interactionLevel is "${plan.interactionLevel}"
(${plan.interactionLevelRationale}) — use richer V2 question types only to
the extent that level calls for it. Return JSON matching the Survey shape:
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

  // Set deterministically from the approved plan rather than trusting the
  // model to copy it through — this is a study-level setting, not something
  // the survey-generation call should be free to reinterpret.
  return {
    ...survey,
    interactionLevel: plan.interactionLevel,
    interactionLevelRationale: plan.interactionLevelRationale,
  };
}
