import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { surveyFromStudy, researchPlanFromStudy, followUpsFromStudy } from "@/lib/survey/db-mapping";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, _count: { select: { responses: true } } },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  return NextResponse.json({
    study: {
      ...study,
      responseCount: study._count.responses,
      followUps: followUpsFromStudy(study),
      researchPlan: researchPlanFromStudy(study),
      survey: study.questions.length ? surveyFromStudy(study, study.questions) : null,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.experienceMode === "string") data.experienceMode = body.experienceMode;
  if (typeof body.adaptiveFollowUpMode === "string") data.adaptiveFollowUpMode = body.adaptiveFollowUpMode;
  if (typeof body.interactionLevel === "string") data.interactionLevel = body.interactionLevel;
  if (typeof body.interactionLevelRationale === "string") {
    data.interactionLevelRationale = body.interactionLevelRationale;
  }
  if (Array.isArray(body.followUps)) data.followUps = JSON.stringify(body.followUps);
  if (body.researchPlan) data.researchPlan = JSON.stringify(body.researchPlan);

  const study = await prisma.study.update({ where: { id }, data });
  return NextResponse.json({ study });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.study.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
