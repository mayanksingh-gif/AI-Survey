import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// V2 Segmentation: coarse device classification from the User-Agent header
// (server-derived, not client-reported, so it can't be spoofed by a form
// field and needs no client code). Good enough for "mobile vs desktop"
// segment comparisons — not attempting precise device/browser detection.
function classifyDevice(userAgent: string | null): string {
  if (!userAgent) return "unknown";
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return "tablet";
  if (/mobile|iphone|android/.test(ua)) return "mobile";
  return "desktop";
}

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
      deviceType: classifyDevice(req.headers.get("user-agent")),
    },
  });

  return NextResponse.json({ responseId: response.id });
}
