import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage/provider";

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — generous for survey stimulus/response media
const ALLOWED_PREFIXES = ["image/", "audio/", "video/"];

function kindFromMime(mimeType: string): "image" | "audio" | "video" | null {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return null;
}

// Uploads a stimulus (attached to a question directly, via questionId) or a
// respondent-answer media file. For answers, pass either an existing
// answerId, or responseId+questionId — the latter finds-or-creates the
// Answer row (a media response may be the respondent's first interaction
// with this question, before any progressive-save PATCH has run).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  const questionIdField = form.get("questionId");
  const answerIdField = form.get("answerId");
  const responseIdField = form.get("responseId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const kind = kindFromMime(file.type);
  if (!kind || !ALLOWED_PREFIXES.some((p) => file.type.startsWith(p))) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
  }

  let mediaQuestionId: string | null = null;
  let mediaAnswerId: string | null = null;

  if (answerIdField) {
    const a = await prisma.answer.findUnique({ where: { id: String(answerIdField) }, include: { response: true } });
    if (!a || a.response.studyId !== id) return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    mediaAnswerId = a.id;
  } else if (responseIdField && questionIdField) {
    const response = await prisma.response.findUnique({ where: { id: String(responseIdField) } });
    if (!response || response.studyId !== id) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }
    const existing = await prisma.answer.findFirst({
      where: { responseId: response.id, questionId: String(questionIdField) },
    });
    const answer =
      existing ??
      (await prisma.answer.create({
        data: {
          responseId: response.id,
          questionId: String(questionIdField),
          value: JSON.stringify(null),
        },
      }));
    mediaAnswerId = answer.id;
  } else if (questionIdField) {
    const q = await prisma.question.findUnique({ where: { id: String(questionIdField) } });
    if (!q || q.studyId !== id) return NextResponse.json({ error: "Question not found" }, { status: 404 });
    mediaQuestionId = q.id;
  } else {
    return NextResponse.json(
      { error: "Provide answerId, (responseId + questionId), or questionId alone for a stimulus" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const provider = getStorageProvider();
  const { storageKey, url, sizeBytes } = await provider.upload({
    buffer,
    filename: file.name,
    mimeType: file.type,
  });

  const media = await prisma.media.create({
    data: {
      questionId: mediaQuestionId,
      answerId: mediaAnswerId,
      kind,
      storageProvider: "local",
      storageKey,
      url,
      mimeType: file.type,
      sizeBytes,
    },
  });

  // If this media answers a question, also set the Answer's value to the
  // media reference so stats/export see a consistent AnswerValue shape.
  if (mediaAnswerId) {
    await prisma.answer.update({
      where: { id: mediaAnswerId },
      data: { value: JSON.stringify({ mediaId: media.id, kind }) },
    });
  }

  return NextResponse.json({ media });
}
