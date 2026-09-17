import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { surveyFromStudy } from "@/lib/survey/db-mapping";

// Public, unauthenticated read of a study's survey — respondent-facing.
// Drafts are not reachable here (only live/closed), keeping unpublished
// surveys private without needing real auth.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const study = await prisma.study.findUnique({ where: { slug }, include: { questions: true } });
  if (!study || study.status === "draft") {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  return NextResponse.json({
    studyId: study.id,
    status: study.status,
    surveyVersion: study.surveyVersion,
    survey: surveyFromStudy(study, study.questions),
  });
}
