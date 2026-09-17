import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Starts a new response (respondent clicked "Start" on the welcome screen,
// or the creator entered preview mode). No auth — anyone with the link can
// respond, per the PRD's "no account required for respondents."
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  const isPreview = body?.isPreview === true;

  const study = await prisma.study.findUnique({ where: { slug } });
  if (!study) return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  if (study.status === "draft" && !isPreview) {
    return NextResponse.json({ error: "Survey not published" }, { status: 403 });
  }

  const response = await prisma.response.create({
    data: {
      studyId: study.id,
      surveyVersion: study.surveyVersion,
      isPreview,
      status: "in_progress",
    },
  });

  return NextResponse.json({ responseId: response.id });
}
