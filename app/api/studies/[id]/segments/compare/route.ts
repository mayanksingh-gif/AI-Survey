import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDashboardStats, computeQuestionStats } from "@/lib/survey/stats";
import { applySegmentFilter, type SegmentFilter } from "@/lib/survey/segments";

// Given two segment filters (A and B), returns dashboard + per-question
// stats scoped to each side, so the UI can render them side-by-side. Pure
// post-processing over already-fetched response/answer data — no new
// persistence, per the "ephemeral segments" decision.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const filterA = body?.filterA as SegmentFilter | undefined;
  const filterB = body?.filterB as SegmentFilter | undefined;
  if (!filterA || !filterB) {
    return NextResponse.json({ error: "filterA and filterB are required" }, { status: 400 });
  }

  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: true },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });
  const questions = study.questions;

  const nonPreview = study.responses.filter((r) => !r.isPreview);
  const responseIds = nonPreview.map((r) => r.id);
  const allAnswers = responseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: responseIds } } })
    : [];

  function scope(filter: SegmentFilter) {
    const scopedResponses = applySegmentFilter(nonPreview, allAnswers, filter);
    const scopedIds = new Set(scopedResponses.map((r) => r.id));
    const scopedAnswers = allAnswers.filter((a) => scopedIds.has(a.responseId));
    const dashboardStats = computeDashboardStats(scopedResponses);
    const questionStats = computeQuestionStats(questions, scopedAnswers, dashboardStats.totalResponses);
    return { dashboardStats, questionStats };
  }

  return NextResponse.json({ segmentA: scope(filterA), segmentB: scope(filterB) });
}
