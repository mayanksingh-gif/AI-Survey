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

  return NextResponse.json({ survey, changeSummary, study: updatedStudy, questions });
}
