import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDashboardStats, computeQuestionStats } from "@/lib/survey/stats";

// V2 Analytics Filtering: ?qualityFilter=all|high_and_normal|exclude_suspicious
// and/or ?excludeResponseIds=id1,id2 for a custom selection. Charts and AI
// analysis both recompute from whichever response set this returns —
// filtering never deletes ResponseQuality/Response/Answer rows, it just
// changes what computeDashboardStats/computeQuestionStats are run over.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qualityFilter = req.nextUrl.searchParams.get("qualityFilter") ?? "all";
  const excludeIds = new Set(
    (req.nextUrl.searchParams.get("excludeResponseIds") ?? "").split(",").filter(Boolean),
  );

  const study = await prisma.study.findUnique({
    where: { id },
    include: { questions: true, responses: { include: { quality: true } } },
  });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  let scopedResponses = study.responses;
  if (qualityFilter === "high_and_normal") {
    scopedResponses = scopedResponses.filter(
      (r) => r.isPreview || !r.quality || r.quality.category === "high_quality" || r.quality.category === "normal",
    );
  } else if (qualityFilter === "exclude_suspicious") {
    scopedResponses = scopedResponses.filter((r) => r.isPreview || !r.quality || r.quality.category !== "suspicious");
  }
  if (excludeIds.size) {
    scopedResponses = scopedResponses.filter((r) => !excludeIds.has(r.id));
  }

  const dashboardStats = computeDashboardStats(scopedResponses);

  const nonPreviewResponseIds = scopedResponses.filter((r) => !r.isPreview).map((r) => r.id);
  const answers = nonPreviewResponseIds.length
    ? await prisma.answer.findMany({ where: { responseId: { in: nonPreviewResponseIds } } })
    : [];

  const questionStats = computeQuestionStats(study.questions, answers, dashboardStats.totalResponses);

  return NextResponse.json({ dashboardStats, questionStats });
}
