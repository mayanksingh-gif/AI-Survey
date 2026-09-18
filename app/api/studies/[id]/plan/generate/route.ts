import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResearchPlan } from "@/lib/ai/strategist";
import { followUpsFromStudy } from "@/lib/survey/db-mapping";
import { estimateQuestionCountFromDuration, extractStatedDurationMinutes } from "@/lib/survey/plan-utils";
import type { FollowUpQA } from "@/lib/survey/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const incomingFollowUps: FollowUpQA[] = Array.isArray(body?.followUps) ? body.followUps : [];

  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const followUps = incomingFollowUps.length ? incomingFollowUps : followUpsFromStudy(study);
  const plan = await generateResearchPlan(study.researchGoal, followUps);

  // The model treats durationMinutes and questionCount as two independent
  // guesses, so "30 minutes" can come back paired with only ~10 questions.
  // If the respondent explicitly stated a duration in their follow-up
  // answers, that's ground truth — override both fields deterministically
  // so the plan is actually internally consistent.
  const statedDuration = extractStatedDurationMinutes(followUps);
  if (statedDuration) {
    plan.durationMinutes = statedDuration;
    plan.questionCount = estimateQuestionCountFromDuration(statedDuration);
  }

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
