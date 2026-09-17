import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeResponses } from "@/lib/ai/analyst";
import { computeDashboardStats, computeQuestionStats } from "@/lib/survey/stats";

// Runs the Research Analyst and caches the result on Study so re-visiting
// Results doesn't re-run the LLM every time. force=true (or a new response
// count since last run) re-computes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: true },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const dashboardStats = computeDashboardStats(study.responses);

  if (!force && study.analysisCache && study.analysisAt) {
    return NextResponse.json({ analysis: JSON.parse(study.analysisCache), cached: true });
  }

  if (dashboardStats.totalResponses === 0) {
    return NextResponse.json({ error: "No responses yet to analyze" }, { status: 400 });
  }

  const nonPreviewResponseIds = study.responses.filter((r) => !r.isPreview).map((r) => r.id);
  const answers = nonPreviewResponseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: nonPreviewResponseIds } } })
    : [];
  const questionStats = computeQuestionStats(study.questions, answers, dashboardStats.totalResponses);

  const analysis = await analyzeResponses(dashboardStats, questionStats);

  await prisma.study.update({
    where: { id },
    data: { analysisCache: JSON.stringify(analysis), analysisAt: new Date() },
  });

  return NextResponse.json({ analysis, cached: false });
}
