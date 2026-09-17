// Research Suggestions: continuously evaluates a survey against its
// research goal/plan and proposes concrete, actionable improvements.
// Distinct from the Reviewer (which checks wording/structure quality) —
// this looks at research completeness: missing objectives, uncovered
// questions, weak sequencing, segment/sample-size/experience recommendations.
import { generateStructured } from "@/lib/llm/client";
import { ResearchSuggestionsResultSchema } from "@/lib/llm/schemas";
import { QUESTION_TYPES, type ResearchPlan, type ResearchSuggestionItem, type Survey } from "@/lib/survey/types";

const SYSTEM = `You are the Research Strategist's continuous-improvement
module inside an AI research copilot. Given a research goal, the approved
research plan, and the current survey, identify concrete opportunities to
make the research better. Categories, use exactly these values:
- missing_objective: a stated research goal isn't actually addressed by any question
- uncovered_question: an important question the research goal implies is missing entirely
- low_value_question: a question unlikely to produce actionable signal
- too_long: the survey has more questions than its purpose needs
- poor_sequencing: illogical or biasing question order
- weak_options: choice/rating/likert/nps options that are incomplete or unbalanced
- biased_wording: leading or loaded phrasing
- branching_opportunity: a place where conditional logic would improve relevance
- segment_recommendation: a respondent segment worth targeting or comparing
- sample_size_recommendation: the current plan's sample size looks off for its purpose
- experience_recommendation: the experience mode or interaction level doesn't fit the research

Be specific and actionable — reference the actual question or gap, not
generic advice. Only include "suggestedQuestion" (a complete, ready-to-add
SurveyQuestion) for missing_objective / uncovered_question suggestions,
so the user can click "Add Suggested Question". Use ONLY these question
types for any suggestedQuestion: ${QUESTION_TYPES.join(", ")}. Do not
invent problems that aren't really there — an empty list is a valid,
good outcome for a well-designed survey.`;

export async function generateResearchSuggestions(
  researchGoal: string,
  plan: ResearchPlan | null,
  survey: Survey,
): Promise<ResearchSuggestionItem[]> {
  const result = await generateStructured({
    system: SYSTEM,
    user: `Research goal: "${researchGoal}"

${plan ? `Approved research plan:\n${JSON.stringify(plan, null, 2)}\n` : "(No research plan on file.)\n"}

Current survey:
${JSON.stringify(survey, null, 2)}

Return JSON: { "suggestions": [{ "id": string, "category": string,
"title": string, "description": string, "suggestedQuestion"?: <SurveyQuestion> }] }`,
    schema: ResearchSuggestionsResultSchema,
    temperature: 0.4,
    maxTokens: 2000,
  });
  return result.suggestions.map((s) => ({ ...s, status: "open" as const }));
}
