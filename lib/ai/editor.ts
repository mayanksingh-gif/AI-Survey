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

Examples of instructions you must handle correctly:
- "Make the survey shorter" -> remove the least essential questions.
- "Make the language casual" -> rewrite question text/help text, keep meaning.
- "Add a pricing question" -> append a new well-formed question about pricing.
- "Remove question 4" -> delete it, renumber order.
- "Make question 5 optional" -> set required=false on that question.
- "Add an NPS question" -> append a type:"nps" question with 0-10 options.
- "Move question X (before/after/to position N)" -> reorder, renumber.
- "Add branching" -> add a "branching" array to the relevant question.
- "Rewrite a biased/leading question" -> reword it neutrally, same id.`;

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
