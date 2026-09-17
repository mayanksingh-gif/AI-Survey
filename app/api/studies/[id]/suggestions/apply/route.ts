import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { surveyFromStudy } from "@/lib/survey/db-mapping";
import { persistSurvey } from "@/lib/survey/persist";
import { SurveyQuestionSchema } from "@/lib/llm/schemas";

// "Add Suggested Question": appends the suggestion's suggestedQuestion to
// the survey and marks the suggestion applied. No extra LLM call — the
// question was already generated when the suggestion was produced.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const suggestionId = typeof body?.suggestionId === "string" ? body.suggestionId : "";
  if (!suggestionId) return NextResponse.json({ error: "suggestionId is required" }, { status: 400 });

  const suggestion = await prisma.researchSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion || suggestion.studyId !== id) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }
  if (!suggestion.suggestedQuestion) {
    return NextResponse.json({ error: "This suggestion has no addable question" }, { status: 400 });
  }

  const parsed = SurveyQuestionSchema.safeParse(JSON.parse(suggestion.suggestedQuestion));
  if (!parsed.success) {
    return NextResponse.json({ error: "Stored suggested question is invalid" }, { status: 500 });
  }

  const study = await prisma.study.findUnique({ where: { id }, include: { questions: true } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const survey = surveyFromStudy(study, study.questions);
  survey.questions.push({ ...parsed.data, order: survey.questions.length });

  const { study: updatedStudy, questions } = await persistSurvey(id, survey);
  await prisma.researchSuggestion.update({ where: { id: suggestionId }, data: { status: "applied" } });

  return NextResponse.json({ survey: surveyFromStudy(updatedStudy, questions), study: updatedStudy });
}
