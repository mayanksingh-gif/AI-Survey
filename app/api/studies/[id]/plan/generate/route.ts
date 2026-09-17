import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResearchPlan } from "@/lib/ai/strategist";
import { followUpsFromStudy } from "@/lib/survey/db-mapping";
import type { FollowUpQA } from "@/lib/survey/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const incomingFollowUps: FollowUpQA[] = Array.isArray(body?.followUps) ? body.followUps : [];

  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const followUps = incomingFollowUps.length ? incomingFollowUps : followUpsFromStudy(study);
  const plan = await generateResearchPlan(study.researchGoal, followUps);

  const updated = await prisma.study.update({
    where: { id },
    data: {
      followUps: JSON.stringify(followUps),
      researchPlan: JSON.stringify(plan),
      experienceMode: plan.experienceMode,
      interactionLevel: plan.interactionLevel,
      interactionLevelRationale: plan.interactionLevelRationale,
    },
  });

  return NextResponse.json({ plan, study: updated });
}
