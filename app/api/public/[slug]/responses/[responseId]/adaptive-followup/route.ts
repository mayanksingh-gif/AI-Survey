import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decideAdaptiveFollowUp } from "@/lib/ai/adaptive-followup";
import type { AdaptiveFollowUpMode } from "@/lib/survey/types";

// Called live, right after the respondent answers an open-text question.
// Returns either a new follow-up question to ask, or shouldAsk:false so the
// runner just moves on. Idempotent-ish: re-calling with the same
// baseQuestionId/baseAnswer after a chain is already at its cap short-
// circuits without an LLM call (see decideAdaptiveFollowUp's mode check).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; responseId: string }> },
) {
  const { responseId } = await params;
  const body = await req.json().catch(() => ({}));
  const baseQuestionId = typeof body?.baseQuestionId === "string" ? body.baseQuestionId : "";
  const baseAnswer = typeof body?.baseAnswer === "string" ? body.baseAnswer.trim() : "";
  if (!baseQuestionId || !baseAnswer) {
    return NextResponse.json({ error: "baseQuestionId and baseAnswer are required" }, { status: 400 });
  }

  const response = await prisma.response.findUnique({ where: { id: responseId } });
  if (!response) return NextResponse.json({ error: "Response not found" }, { status: 404 });

  const study = await prisma.study.findUnique({ where: { id: response.studyId } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const question = await prisma.question.findUnique({ where: { id: baseQuestionId } });
  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const mode = study.adaptiveFollowUpMode as AdaptiveFollowUpMode;
  if (mode === "off") {
    return NextResponse.json({ shouldAsk: false, reason: "Adaptive follow-ups are off." });
  }

  const priorRows = await prisma.adaptiveFollowUp.findMany({
    where: { responseId, baseQuestionId },
    orderBy: { order: "asc" },
  });

  const decision = await decideAdaptiveFollowUp({
    researchGoal: study.researchGoal,
    baseQuestionText: question.text,
    baseAnswer,
    priorFollowUps: priorRows.map((r) => ({ question: r.question, answer: r.answer })),
    mode,
  });

  if (!decision.shouldAsk || !decision.followUpQuestion) {
    return NextResponse.json({ shouldAsk: false, reason: decision.reason });
  }

  const created = await prisma.adaptiveFollowUp.create({
    data: {
      responseId,
      baseQuestionId,
      order: priorRows.length,
      question: decision.followUpQuestion,
    },
  });

  return NextResponse.json({ shouldAsk: true, followUp: created });
}

// Save the respondent's answer to a specific adaptive follow-up turn.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; responseId: string }> },
) {
  const { responseId } = await params;
  const body = await req.json().catch(() => ({}));
  const followUpId = typeof body?.followUpId === "string" ? body.followUpId : "";
  const answer = typeof body?.answer === "string" ? body.answer : "";
  if (!followUpId) return NextResponse.json({ error: "followUpId is required" }, { status: 400 });

  const followUp = await prisma.adaptiveFollowUp.findUnique({ where: { id: followUpId } });
  if (!followUp || followUp.responseId !== responseId) {
    return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
  }

  const updated = await prisma.adaptiveFollowUp.update({
    where: { id: followUpId },
    data: { answer },
  });

  return NextResponse.json({ followUp: updated });
}
