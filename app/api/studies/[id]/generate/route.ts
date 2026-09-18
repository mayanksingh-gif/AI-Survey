import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateSurvey } from "@/lib/ai/generator";
import { researchPlanFromStudy, surveyFromStudy, followUpsFromStudy } from "@/lib/survey/db-mapping";
import { persistSurvey } from "@/lib/survey/persist";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const plan = researchPlanFromStudy(study);
  if (!plan) {
    return NextResponse.json(
      { error: "Generate a research plan before generating the survey" },
      { status: 400 },
    );
  }

  const survey = await generateSurvey(study.researchGoal, plan, followUpsFromStudy(study));
  const { study: updatedStudy, questions } = await persistSurvey(id, survey);

  // Generation always replaces every question (there's no "existing" to
  // preserve on first generate), but return the persisted shape anyway for
  // consistency with every other write path — the AI's own "q1"/"q2" ids
  // never match real database ids, so the client needs the real ones back.
  return NextResponse.json({ survey: surveyFromStudy(updatedStudy, questions), study: updatedStudy, questions });
}
