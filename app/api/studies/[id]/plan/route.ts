import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { researchPlanFromStudy } from "@/lib/survey/db-mapping";
import { estimateQuestionCountFromDuration } from "@/lib/survey/plan-utils";
import { ResearchPlanSchema } from "@/lib/llm/schemas";

// Lets the user directly edit the AI-recommended research plan before
// generating the survey (method, audience, sample size, duration, question
// count, metric, distribution, experience/interaction level). A manual
// edit here is the user overriding the recommendation, so unlike plan
// generation this never silently recomputes questionCount out from under
// them — EXCEPT when the edit itself is to durationMinutes with no
// accompanying questionCount, in which case we keep the two consistent the
// same way generation does (see plan-utils.ts).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const study = await prisma.study.findUnique({ where: { id } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const currentPlan = researchPlanFromStudy(study);
  if (!currentPlan) {
    return NextResponse.json({ error: "No research plan to edit yet" }, { status: 400 });
  }

  const patch = body?.plan ?? {};
  const durationChanged =
    typeof patch.durationMinutes === "string" && patch.durationMinutes !== currentPlan.durationMinutes;
  const questionCountExplicitlySet =
    typeof patch.questionCount === "number" && patch.questionCount !== currentPlan.questionCount;

  const merged = { ...currentPlan, ...patch };
  if (durationChanged && !questionCountExplicitlySet) {
    merged.questionCount = estimateQuestionCountFromDuration(merged.durationMinutes);
  }

  const parsed = ResearchPlanSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid plan", details: parsed.error.message }, { status: 400 });
  }

  const updated = await prisma.study.update({
    where: { id },
    data: {
      researchPlan: JSON.stringify(parsed.data),
      experienceMode: parsed.data.experienceMode,
      interactionLevel: parsed.data.interactionLevel,
      interactionLevelRationale: parsed.data.interactionLevelRationale,
    },
  });

  return NextResponse.json({ plan: parsed.data, study: updated });
}
