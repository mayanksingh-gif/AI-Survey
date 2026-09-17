// Survey Reviewer: survey -> quality issues, each carrying a complete
// pre-computed fixedSurvey so "Apply Fix" is a simple, deterministic write
// (no second LLM round-trip needed at fix time).
import { generateStructured } from "@/lib/llm/client";
import { ReviewResultSchema } from "@/lib/llm/schemas";
import type { ReviewIssue, Survey } from "@/lib/survey/types";

const SYSTEM = `You are the Survey Reviewer inside an AI research copilot.
Inspect the given survey for quality problems before it gets published:
- leading_question: wording nudges toward an answer
- confusing_wording: unclear, jargon-heavy, or ambiguous phrasing
- duplicate: two questions effectively asking the same thing
- double_barrelled: one question asking about two things at once
- too_long: the survey has more questions than its stated purpose needs
- poor_order: illogical ordering (e.g. sensitive question too early)
- missing_options: a choice/rating/likert/nps/ranking question lacking options

For each issue found, produce a complete "fixedSurvey" — the ENTIRE survey
JSON with just that one issue corrected, everything else identical. If the
survey has no issues, return an empty issues array. Do not invent issues that
aren't really there.`;

export async function reviewSurvey(survey: Survey): Promise<ReviewIssue[]> {
  const result = await generateStructured({
    system: SYSTEM,
    user: `Survey to review:
${JSON.stringify(survey, null, 2)}

Return JSON: { "issues": [{ "id": string, "severity": "low"|"medium"|"high",
"category": string, "questionId"?: string, "description": string,
"fixedSurvey": <full Survey> }] }`,
    schema: ReviewResultSchema,
    temperature: 0.3,
    maxTokens: 3000,
  });
  return result.issues;
}
