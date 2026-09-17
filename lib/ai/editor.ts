// Survey Editor: current survey + a natural-language instruction -> updated
// survey, plus a short human-readable summary of what changed (for the chat
// panel to narrate back to the user).
import { generateStructured } from "@/lib/llm/client";
import { EditResultSchema } from "@/lib/llm/schemas";
import { QUESTION_TYPES, type Survey } from "@/lib/survey/types";

const SYSTEM = `You are the Survey Editor inside an AI research copilot.
You receive the current survey (as JSON) and a plain-language instruction
from the user. Apply the instruction precisely and return the FULL updated
survey (not a diff) plus a one-sentence changeSummary describing what you
changed. Preserve every question's "id" unless the instruction removes that
question. Renumber "order" contiguously after any add/remove/move. Only use
these question types: ${QUESTION_TYPES.join(", ")}. A "slider" question must
have EXACTLY 2 options representing [min, max] only — never one option per
step; use "nps" or "rating" instead for a discrete scale. Keep unrelated
questions/screens exactly as they were — do not rewrite things the
instruction didn't ask about.

If asked to add one of the richer V2 types, set its "extraConfig"
correctly: "matrix" needs extraConfig.matrixRows (options is the shared
scale); "categorize" needs extraConfig.categorizeItems + extraConfig.categories;
"pairwise_comparison" needs extraConfig.comparisonItems; "swipe_card" is a
2-option yes_no-shaped question; "card_choice" is a visual single/multi
choice (extraConfig.allowMultiple for multi-select); "emoji_scale" is a
visual rating.

If asked to personalize a question so it references an earlier answer
naturally (e.g. "reference what they said about shipping"), set
extraConfig.personalized: true and embed exactly one
{{previousAnswer:<earlierQuestionId>}} token in its text — e.g. "You
mentioned {{previousAnswer:q3}} was difficult. What specifically should we
improve?" Only reference a question that appears earlier in the survey.

Examples of instructions you must handle correctly:
- "Make the survey shorter" -> remove the least essential questions.
- "Make the language casual" -> rewrite question text/help text, keep meaning.
- "Add a pricing question" -> append a new well-formed question about pricing.
- "Remove question 4" -> delete it, renumber order.
- "Make question 5 optional" -> set required=false on that question.
- "Add an NPS question" -> append a type:"nps" question with 0-10 options.
- "Move question X (before/after/to position N)" -> reorder, renumber.
- "Add branching" -> add a "branching" array to the relevant question.
- "Rewrite a biased/leading question" -> reword it neutrally, same id.

Survey Optimization commands (broader instructions covering multiple
questions/screens at once) you must also handle correctly:
- "Reduce this survey to under N minutes" -> cut to the ~4-5 highest-value
  questions for the research goal; roughly 45 seconds per question.
- "Make this suitable for B2B users" -> adjust tone to professional, swap
  consumer language for business/role-based framing.
- "Remove biased questions" -> find and reword every leading/loaded
  question in the survey, not just one.
- "Make this more suitable for Gen Z" -> casual, concise, direct tone;
  shorter question text; set experienceMode to "conversational" or
  "playful" unless the research is clearly serious/sensitive.
- "Improve response quality" -> tighten vague questions, add helpText where
  answers are likely to be low-effort, ensure open-text questions ask for
  something specific rather than generic ("what could be better?").
- "Add useful follow-ups" -> for the 1-2 most important open-text questions,
  set "allowAdaptiveFollowUp": true (do not fabricate the follow-up text
  here — that happens live per-respondent).
- "Create separate paths for new and existing users" -> add an early
  single_choice/yes_no segmenting question if one doesn't exist, then add
  "branching" rules on it so new vs. existing users see different
  downstream questions.
- "Optimize this for mobile respondents" -> prefer single_choice/yes_no/
  rating over long_text/matrix where the research goal allows it, shorten
  question text, avoid options lists longer than ~5 items.`;

export async function editSurvey(
  survey: Survey,
  instruction: string,
): Promise<{ survey: Survey; changeSummary: string }> {
  return generateStructured({
    system: SYSTEM,
    user: `Current survey:
${JSON.stringify(survey, null, 2)}

Instruction: "${instruction}"

Return JSON: { "survey": <full updated Survey>, "changeSummary": string }`,
    schema: EditResultSchema,
    temperature: 0.3,
    maxTokens: 2400,
  });
}
