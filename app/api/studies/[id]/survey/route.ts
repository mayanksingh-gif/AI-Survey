import { NextRequest, NextResponse } from "next/server";
import { SurveySchema } from "@/lib/llm/schemas";
import { persistSurvey } from "@/lib/survey/persist";

// Direct, non-AI persistence path for manual edits made in the builder UI
// (reorder, toggle required, edit text/options, delete a question, add a
// branching rule by hand).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = SurveySchema.safeParse(body?.survey);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid survey payload" }, { status: 400 });
  }

  const { study, questions } = await persistSurvey(id, parsed.data);
  return NextResponse.json({ survey: parsed.data, study, questions });
}
