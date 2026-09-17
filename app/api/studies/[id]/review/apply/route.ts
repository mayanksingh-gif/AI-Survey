import { NextRequest, NextResponse } from "next/server";
import { SurveySchema } from "@/lib/llm/schemas";
import { persistSurvey } from "@/lib/survey/persist";

// Applies a single review issue's pre-computed fixedSurvey — no extra LLM
// call needed, the Reviewer already produced the full corrected survey.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = SurveySchema.safeParse(body?.fixedSurvey);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fixedSurvey payload" }, { status: 400 });
  }

  const { study, questions } = await persistSurvey(id, parsed.data);
  return NextResponse.json({ survey: parsed.data, study, questions });
}
