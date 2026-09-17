import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reviewSurvey } from "@/lib/ai/reviewer";
import { surveyFromStudy } from "@/lib/survey/db-mapping";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id }, include: { questions: true } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });
  if (!study.questions.length) {
    return NextResponse.json({ error: "Generate a survey before reviewing it" }, { status: 400 });
  }

  const survey = surveyFromStudy(study, study.questions);
  const issues = await reviewSurvey(survey);

  return NextResponse.json({ issues });
}
