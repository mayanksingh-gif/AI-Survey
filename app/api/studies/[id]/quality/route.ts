import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assessResponseQuality } from "@/lib/ai/quality-engine";

// Computes (and caches) a quality assessment for every non-preview response
// that doesn't have one yet, then returns the full set. Never deletes or
// excludes anything itself — purely advisory scoring the dashboard can
// filter by. Re-running (force=true) recomputes everything, e.g. after new
// responses arrive.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const force = req.nextUrl.searchParams.get("force") === "true";

  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: { include: { answers: true, quality: true } } },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const nonPreview = study.responses.filter((r) => !r.isPreview);
  const allAnswersForStudy = nonPreview.flatMap((r) => r.answers);
  const toAssess = force ? nonPreview : nonPreview.filter((r) => !r.quality);

  for (const response of toAssess) {
    const assessment = await assessResponseQuality({
      response,
      questionRows: study.questions,
      answers: response.answers,
      allResponsesForStudy: nonPreview,
      allAnswersForStudy,
    });
    await prisma.responseQuality.upsert({
      where: { responseId: response.id },
      create: {
        responseId: response.id,
        score: assessment.score,
        category: assessment.category,
        flags: JSON.stringify(assessment.flags),
        positiveIndicators: JSON.stringify(assessment.positiveIndicators),
      },
      update: {
        score: assessment.score,
        category: assessment.category,
        flags: JSON.stringify(assessment.flags),
        positiveIndicators: JSON.stringify(assessment.positiveIndicators),
        computedAt: new Date(),
      },
    });
  }

  const qualityRows = await prisma.responseQuality.findMany({
    where: { responseId: { in: nonPreview.map((r) => r.id) } },
  });

  return NextResponse.json({
    quality: qualityRows.map((q) => ({
      responseId: q.responseId,
      score: q.score,
      category: q.category,
      flags: JSON.parse(q.flags),
      positiveIndicators: JSON.parse(q.positiveIndicators),
    })),
  });
}
