import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateInsight } from "@/lib/ai/insight-generator";
import { insightFromRow } from "@/lib/survey/db-mapping";
import { computeDashboardStats, computeQuestionStats } from "@/lib/survey/stats";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await prisma.insight.findMany({ where: { studyId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ insights: rows.map(insightFromRow) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const focusHint = typeof body?.focusHint === "string" ? body.focusHint : undefined;

  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: true },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const dashboardStats = computeDashboardStats(study.responses);
  if (dashboardStats.totalResponses === 0) {
    return NextResponse.json({ error: "No responses yet to generate an insight from." }, { status: 400 });
  }

  const nonPreviewIds = study.responses.filter((r) => !r.isPreview).map((r) => r.id);
  const answers = nonPreviewIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: nonPreviewIds } } })
    : [];
  const questionStats = computeQuestionStats(study.questions, answers, dashboardStats.totalResponses);

  const insight = await generateInsight({
    studyId: id,
    researchGoal: study.researchGoal,
    dashboardStats,
    questionStats,
    focusHint,
  });

  const row = await prisma.insight.create({
    data: {
      studyId: id,
      finding: insight.finding,
      evidence: JSON.stringify(insight.evidence),
      hypothesis: insight.hypothesis,
      recommendedAction: insight.recommendedAction,
      nextResearch: insight.nextResearch,
      evidenceStrength: insight.evidenceStrength,
      evidenceStrengthReason: insight.evidenceStrengthReason,
      relatedQuestionIds: JSON.stringify(insight.relatedQuestionIds),
    },
  });

  return NextResponse.json({ insight: insightFromRow(row) });
}
