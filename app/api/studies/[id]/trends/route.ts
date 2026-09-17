import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeResponseTrend } from "@/lib/survey/stats";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const granularityParam = req.nextUrl.searchParams.get("granularity");
  const granularity =
    granularityParam === "weekly" || granularityParam === "monthly" ? granularityParam : "daily";

  const study = await prisma.study.findUnique({ where: { id }, include: { responses: true } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });

  const trend = computeResponseTrend(study.responses, granularity);
  return NextResponse.json({ trend, granularity });
}
