import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeCrossQuestion } from "@/lib/survey/cross-question";
import { questionFromRow } from "@/lib/survey/db-mapping";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const filterQuestionId = typeof body?.filterQuestionId === "string" ? body.filterQuestionId : "";
  const filterValue = typeof body?.filterValue === "string" ? body.filterValue : "";
  const targetQuestionId = typeof body?.targetQuestionId === "string" ? body.targetQuestionId : "";
  if (!filterQuestionId || !filterValue || !targetQuestionId) {
    return NextResponse.json(
      { error: "filterQuestionId, filterValue, and targetQuestionId are required" },
      { status: 400 },
    );
  }

  const targetRow = await prisma.question.findUnique({ where: { id: targetQuestionId } });
  if (!targetRow || targetRow.studyId !== id) {
    return NextResponse.json({ error: "Target question not found" }, { status: 404 });
  }

  const responses = await prisma.response.findMany({ where: { studyId: id, isPreview: false } });
  const responseIds = responses.map((r) => r.id);
  const answers = responseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: responseIds } } })
    : [];

  const result = computeCrossQuestion(answers, filterQuestionId, filterValue, questionFromRow(targetRow));
  return NextResponse.json({ result });
}
