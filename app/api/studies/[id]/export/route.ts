import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toCsv } from "@/lib/csv";
import { questionFromRow } from "@/lib/survey/db-mapping";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      responses: { include: { answers: true }, where: { isPreview: false } },
    },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const questions = study.questions.map(questionFromRow);
  const columns = [
    "responseId",
    "status",
    "startedAt",
    "completedAt",
    "surveyVersion",
    ...questions.map((q) => q.text),
  ];

  const rows = study.responses.map((response) => {
    const answersByQuestion = new Map(response.answers.map((a) => [a.questionId, a.value]));
    const row: Record<string, unknown> = {
      responseId: response.id,
      status: response.status,
      startedAt: response.startedAt.toISOString(),
      completedAt: response.completedAt?.toISOString() ?? "",
      surveyVersion: response.surveyVersion,
    };
    for (const q of questions) {
      const raw = answersByQuestion.get(q.id);
      row[q.text] = raw ? JSON.parse(raw) : "";
    }
    return row;
  });

  const csv = toCsv(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${study.slug}-responses.csv"`,
    },
  });
}
