import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Progressive save: called after each answered question (so partial/dropped
// responses are still captured), and again with complete:true on the last
// question. questionPath accumulates the ids actually shown, respecting
// branching, per the PRD's "question path" storage requirement.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; responseId: string }> },
) {
  const { responseId } = await params;
  const body = await req.json().catch(() => ({}));

  const response = await prisma.response.findUnique({ where: { id: responseId } });
  if (!response) return NextResponse.json({ error: "Response not found" }, { status: 404 });

  if (body?.answer?.questionId) {
    const { questionId, value } = body.answer;
    const existing = await prisma.answer.findFirst({ where: { responseId, questionId } });
    if (existing) {
      await prisma.answer.update({ where: { id: existing.id }, data: { value: JSON.stringify(value) } });
    } else {
      await prisma.answer.create({
        data: { responseId, questionId, value: JSON.stringify(value) },
      });
    }
  }

  const data: Record<string, unknown> = {};
  if (Array.isArray(body?.questionPath)) data.questionPath = JSON.stringify(body.questionPath);
  if (body?.complete === true) {
    data.status = "completed";
    data.completedAt = new Date();
  }

  const updated = Object.keys(data).length
    ? await prisma.response.update({ where: { id: responseId }, data })
    : response;

  return NextResponse.json({ response: updated });
}
