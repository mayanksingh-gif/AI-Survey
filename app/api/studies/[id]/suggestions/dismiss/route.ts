import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const suggestionId = typeof body?.suggestionId === "string" ? body.suggestionId : "";
  if (!suggestionId) return NextResponse.json({ error: "suggestionId is required" }, { status: 400 });

  const suggestion = await prisma.researchSuggestion.findUnique({ where: { id: suggestionId } });
  if (!suggestion || suggestion.studyId !== id) {
    return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
  }

  await prisma.researchSuggestion.update({ where: { id: suggestionId }, data: { status: "dismissed" } });
  return NextResponse.json({ ok: true });
}
