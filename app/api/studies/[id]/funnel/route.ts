import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeFunnel } from "@/lib/survey/stats";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: true },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const nonPreviewResponseIds = study.responses.filter((r) => !r.isPreview).map((r) => r.id);
  const answers = nonPreviewResponseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: nonPreviewResponseIds } } })
    : [];

  const funnel = computeFunnel(study.questions, study.responses, answers);
  return NextResponse.json({ funnel });
}
