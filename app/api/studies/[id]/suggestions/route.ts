import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateResearchSuggestions } from "@/lib/ai/suggestions";
import { researchPlanFromStudy, surveyFromStudy } from "@/lib/survey/db-mapping";

// GET returns persisted, still-open suggestions (no LLM call — fast).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rows = await prisma.researchSuggestion.findMany({
    where: { studyId: id, status: "open" },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({
    suggestions: rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      suggestedQuestion: r.suggestedQuestion ? JSON.parse(r.suggestedQuestion) : undefined,
      status: r.status,
    })),
  });
}

// POST runs the AI, replacing any previously-open suggestions with fresh
// ones (dismissed/applied history is preserved — only "open" rows are wiped).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const study = await prisma.study.findUnique({ where: { id }, include: { questions: true } });
  if (!study) return NextResponse.json({ error: "Study not found" }, { status: 404 });
  if (!study.questions.length) {
    return NextResponse.json({ error: "Generate a survey before requesting suggestions" }, { status: 400 });
  }

  const plan = researchPlanFromStudy(study);
  const survey = surveyFromStudy(study, study.questions);
  const suggestions = await generateResearchSuggestions(study.researchGoal, plan, survey);

  await prisma.$transaction([
    prisma.researchSuggestion.deleteMany({ where: { studyId: id, status: "open" } }),
    ...(suggestions.length
      ? [
          prisma.researchSuggestion.createMany({
            data: suggestions.map((s) => ({
              studyId: id,
              category: s.category,
              title: s.title,
              description: s.description,
              suggestedQuestion: s.suggestedQuestion ? JSON.stringify(s.suggestedQuestion) : null,
              status: "open",
            })),
          }),
        ]
      : []),
  ]);

  const rows = await prisma.researchSuggestion.findMany({
    where: { studyId: id, status: "open" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    suggestions: rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      suggestedQuestion: r.suggestedQuestion ? JSON.parse(r.suggestedQuestion) : undefined,
      status: r.status,
    })),
  });
}
