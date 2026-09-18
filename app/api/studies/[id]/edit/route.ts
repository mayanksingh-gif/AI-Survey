import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { editSurvey } from "@/lib/ai/editor";
import { surveyFromStudy } from "@/lib/survey/db-mapping";
import { persistSurvey } from "@/lib/survey/persist";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const instruction = typeof body?.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  }

  const study = await prisma.study.findUnique({ where: { id }, include: { questions: true } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });
  if (!study.questions.length) {
    return NextResponse.json({ error: "Generate a survey before editing it" }, { status: 400 });
  }

  const currentSurvey = surveyFromStudy(study, study.questions);
  const { survey, changeSummary } = await editSurvey(currentSurvey, instruction);
  const { study: updatedStudy, questions } = await persistSurvey(id, survey);

  // Return the persisted shape, not the AI's output directly — a question
  // the AI kept unchanged carries its real id through fine, but any
  // question it added only has whatever placeholder id it invented, which
  // persistSurvey replaces with a real one on create.
  return NextResponse.json({
    survey: surveyFromStudy(updatedStudy, questions),
    changeSummary,
    study: updatedStudy,
    questions,
  });
}
