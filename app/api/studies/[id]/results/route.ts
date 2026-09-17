import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDashboardStats, computeQuestionStats } from "@/lib/survey/stats";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: true },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const dashboardStats = computeDashboardStats(study.responses);

  const nonPreviewResponseIds = study.responses.filter((r) => !r.isPreview).map((r) => r.id);
  const answers = nonPreviewResponseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: nonPreviewResponseIds } } })
    : [];

  const questionStats = computeQuestionStats(study.questions, answers, dashboardStats.totalResponses);

  return NextResponse.json({
    dashboardStats,
    questionStats: questionStats.map((q) => ({
      question: q.question,
      chartKind: q.chartKind,
      responseCount: q.responseCount,
      skipCount: q.skipCount,
      optionCounts: q.optionCounts,
      numericValues: q.numericValues,
      npsBreakdown: q.npsBreakdown,
      rawTextAnswers: q.rawTextAnswers,
      rawAnswers: q.rawAnswers,
    })),
  });
}
