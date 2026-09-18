import { NextRequest, NextResponse } from "next/server";
import { SurveySchema } from "@/lib/llm/schemas";
import { persistSurvey } from "@/lib/survey/persist";
import { surveyFromStudy } from "@/lib/survey/db-mapping";

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
  // Return the survey as reconstructed from the persisted rows, not the
  // client's submitted payload — a newly-created question's client-side
  // synthetic id (or an AI-assigned "q1") never matches the real database
  // id, so echoing the input back would hand the client stale ids it would
  // then use for the next upload/edit, right back into the bug this was
  // fixing.
  return NextResponse.json({ survey: surveyFromStudy(study, questions), study, questions });
}
