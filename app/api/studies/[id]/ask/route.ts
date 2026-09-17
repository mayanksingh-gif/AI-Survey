import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { askResearch } from "@/lib/ai/ask-research";
import { computeDashboardStats, computeQuestionStats } from "@/lib/survey/stats";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const history = Array.isArray(body?.history) ? body.history : [];
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: true },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const dashboardStats = computeDashboardStats(study.responses);
  if (dashboardStats.totalResponses === 0) {
    return NextResponse.json({ error: "No responses yet — nothing to ask about." }, { status: 400 });
  }

  const nonPreviewResponseIds = study.responses.filter((r) => !r.isPreview).map((r) => r.id);
  const answers = nonPreviewResponseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: nonPreviewResponseIds } } })
    : [];
  const questionStats = computeQuestionStats(study.questions, answers, dashboardStats.totalResponses);
  const existingAnalysis = study.analysisCache ? JSON.parse(study.analysisCache) : null;

  const result = await askResearch({
    question,
    dashboardStats,
    questionStats,
    existingAnalysis,
    conversationHistory: history,
  });

  return NextResponse.json(result);
}
