// Survey Generator: research plan -> a full structured survey.
import { z } from "zod";
import { generateStructured } from "@/lib/llm/client";
import { SurveySchema, SurveyQuestionSchema } from "@/lib/llm/schemas";
import { QUESTION_TYPES, type FollowUpQA, type ResearchPlan, type Survey } from "@/lib/survey/types";

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

// Local 4B models get noticeably less reliable (slower, more likely to
// truncate/emit invalid JSON) the more questions they're asked to produce
// in one completion. Rather than requesting a large plan.questionCount in
// a single call, the initial call is capped here and any remainder is
// filled via generateAdditionalQuestions in bounded-size batches — several
// smaller reliable calls beat one large unreliable one.
const INITIAL_BATCH_MAX = 12;
const TOPUP_BATCH_MAX = 10;

export async function generateSurvey(
  researchGoal: string,
  plan: ResearchPlan,
  followUps: FollowUpQA[] = [],
): Promise<Survey> {
  // The follow-up Q&A gathered before the plan was approved (who the
  // respondents are, what decision this informs, specifics about the
  // product/flow/team being researched) often carries content the
  // questions themselves should reflect — not just the plan's compressed
  // summary fields. Passing it through here is what makes "the answers
  // given before building the survey actually affect the survey" true,
  // rather than only affecting the plan's metadata (audience/duration/
  // etc.) while the generated questions stay generic.
  const followUpContext = followUps.length
    ? `\n\nContext gathered from the user before this plan was approved — use
these specifics (product/flow/feature names, team, timeframe, prior
findings, etc.) to make the generated questions concrete and specific
rather than generic:\n${followUps
        .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
        .join("\n")}`
    : "";

  const initialCount = Math.min(plan.questionCount, INITIAL_BATCH_MAX);

  const survey = await generateStructured({
    system: SYSTEM,
    user: `Research goal: "${researchGoal}"${followUpContext}

Approved research plan:
${JSON.stringify(plan, null, 2)}

Generate exactly ${initialCount} questions${
      initialCount < plan.questionCount
        ? ` (this is the first batch of the plan's full ${plan.questionCount} — more will be requested separately, so just cover the most important ground first)`
        : ""
    }. Set "experienceMode" to
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
    maxTokens: Math.min(3200, 900 + initialCount * 220),
  });

  // Set deterministically from the approved plan rather than trusting the
  // model to copy it through — this is a study-level setting, not something
  // the survey-generation call should be free to reinterpret.
  let questions = survey.questions;

  // Fill any remainder — both what the batch cap above intentionally left
  // out, and any shortfall from the model under-delivering even within
  // that batch — in further bounded-size chunks rather than one big call.
  while (questions.length < plan.questionCount) {
    const missing = Math.min(TOPUP_BATCH_MAX, plan.questionCount - questions.length);
    const topUp = await generateAdditionalQuestions(researchGoal, plan, questions, missing, followUpContext);
    if (topUp.length === 0) break; // avoid an infinite loop if the model returns nothing
    questions = [...questions, ...topUp];
  }
  questions = questions.map((q, i) => ({ ...q, order: i }));

  return {
    ...survey,
    questions,
    interactionLevel: plan.interactionLevel,
    interactionLevelRationale: plan.interactionLevelRationale,
  };
}

const AdditionalQuestionsSchema = z.object({
  questions: z.array(SurveyQuestionSchema).min(1),
});

/** Requests exactly `count` more questions that extend an already-generated
 * survey, so a model that under-delivered on the first pass still ends up
 * at the plan's actual questionCount instead of silently shipping a
 * shorter survey than the user asked for. */
async function generateAdditionalQuestions(
  researchGoal: string,
  plan: ResearchPlan,
  existing: Survey["questions"],
  count: number,
  followUpContext: string,
) {
  // Only pass the existing questions' text/type/id as context, not their
  // full JSON (options, branching, etc.) — keeps this call's prompt size
  // (and therefore latency) roughly flat regardless of how many batches
  // have already run, instead of growing every round.
  const existingSummary = existing.map((q) => `- (${q.type}) ${q.text}`).join("\n");

  const result = await generateStructured({
    system: `You are the Survey Generator inside an AI research copilot,
continuing a survey that already has some questions — you are adding MORE
questions to reach the plan's required total, not replacing anything.
Use ONLY these question types: ${QUESTION_TYPES.join(", ")}. Follow the same
option/extraConfig rules as any other question of these types (e.g. slider
needs exactly 2 [min,max] options, matrix needs extraConfig.matrixRows,
etc.). Never duplicate the topic of an existing question — cover genuinely
new ground relevant to the research goal. Assign each new question a short
unique id not already used (e.g. "q_extra1", "q_extra2").`,
    user: `Research goal: "${researchGoal}"${followUpContext}

Research plan: ${JSON.stringify(plan, null, 2)}

Questions already in the survey:
${existingSummary}

Generate exactly ${count} additional questions to append. Return JSON:
{ "questions": [{ "id": string, "order": number, "type": string, "text": string, "helpText"?: string, "options": [{"label": string, "value": string}], "required": boolean }] }`,
    schema: AdditionalQuestionsSchema,
    temperature: 0.5,
    maxTokens: Math.min(2600, 400 + count * 220),
  });
  return result.questions;
}
