import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { slugify, uniqueSlug } from "@/lib/slug";

export async function GET() {
  const studies = await prisma.study.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { responses: true } } },
  });

  const result = studies.map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    status: s.status,
    researchGoal: s.researchGoal,
    responseCount: s._count.responses,
    updatedAt: s.updatedAt,
    createdAt: s.createdAt,
  }));

  return NextResponse.json({ studies: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const researchGoal = typeof body?.researchGoal === "string" ? body.researchGoal.trim() : "";

  if (!researchGoal) {
    return NextResponse.json({ error: "researchGoal is required" }, { status: 400 });
  }

  const title = researchGoal.length > 60 ? `${researchGoal.slice(0, 57)}...` : researchGoal;
  const slug = await uniqueSlug(title, async (candidate) => {
    const existing = await prisma.study.findUnique({ where: { slug: candidate } });
    return !!existing;
  });

  const study = await prisma.study.create({
    data: {
      slug: slug || slugify(title),
      title,
      researchGoal,
      status: "draft",
    },
  });

  return NextResponse.json({ study }, { status: 201 });
}
