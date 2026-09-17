import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/slug";
import { generateResearchPlan } from "@/lib/ai/strategist";
import { insightFromRow } from "@/lib/survey/db-mapping";

// "Create Follow-Up Study": spins up a brand-new Study whose research goal
// is derived from an existing Insight's finding/hypothesis/nextResearch, and
// immediately generates its research plan — so it lands straight on the
// Plan tab with a plan already grounded in the prior study's evidence,
// ready for the user to review and approve before generating a survey.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; insightId: string }> },
) {
  const { id, insightId } = await params;

  const insightRow = await prisma.insight.findUnique({ where: { id: insightId } });
  if (!insightRow || insightRow.studyId !== id) {
    return NextResponse.json({ error: "Insight not found" }, { status: 404 });
  }
  const insight = insightFromRow(insightRow);

  const parentStudy = await prisma.study.findUnique({ where: { id } });
  if (!parentStudy) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const researchGoal = `Follow-up research on: ${insight.finding} We hypothesize: ${insight.hypothesis} This study should specifically: ${insight.nextResearch} (Originating study: "${parentStudy.researchGoal}")`;

  const title = insight.nextResearch.length > 60 ? `${insight.nextResearch.slice(0, 57)}...` : insight.nextResearch;
  const slug = await uniqueSlug(title, async (candidate) => {
    const existing = await prisma.study.findUnique({ where: { slug: candidate } });
    return !!existing;
  });

  const followUps = [
    { question: "What prompted this research?", answer: `Finding: ${insight.finding}` },
    { question: "What decision will this research help make?", answer: insight.recommendedAction },
  ];

  const plan = await generateResearchPlan(researchGoal, followUps);

  const newStudy = await prisma.study.create({
    data: {
      slug: slug || slugify(title),
      title,
      researchGoal,
      status: "draft",
      followUps: JSON.stringify(followUps),
      researchPlan: JSON.stringify(plan),
      experienceMode: plan.experienceMode,
      interactionLevel: plan.interactionLevel,
      interactionLevelRationale: plan.interactionLevelRationale,
      parentInsightId: insight.id,
    },
  });

  await prisma.insight.update({ where: { id: insightId }, data: { followUpStudyId: newStudy.id } });

  return NextResponse.json({ study: newStudy });
}
