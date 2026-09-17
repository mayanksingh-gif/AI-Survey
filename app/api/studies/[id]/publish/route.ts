import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id }, include: { questions: true } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });
  if (!study.questions.length) {
    return NextResponse.json({ error: "Generate a survey before publishing" }, { status: 400 });
  }

  const updated = await prisma.study.update({ where: { id }, data: { status: "live" } });
  return NextResponse.json({ study: updated, publicUrl: `/s/${updated.slug}` });
}
