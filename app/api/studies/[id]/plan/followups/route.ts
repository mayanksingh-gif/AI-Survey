import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFollowUpQuestions } from "@/lib/ai/strategist";
import { followUpsFromStudy } from "@/lib/survey/db-mapping";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const followUps = followUpsFromStudy(study);
  const followUpQuestions = await getFollowUpQuestions(study.researchGoal, followUps);

  return NextResponse.json({ followUpQuestions });
}
