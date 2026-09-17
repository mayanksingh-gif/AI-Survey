import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStorageProvider } from "@/lib/storage/provider";
import { analyzeMediaContent, describeImage, transcribeMedia } from "@/lib/ai/multimedia";

// Runs transcription (audio/video) or vision description (image) + theme/
// sentiment extraction for one Media row, caching the result on that row.
// This is a real subprocess call to a local model — slower than the main
// chat calls, so it's triggered on demand (creator clicks "Analyze") rather
// than blocking the upload response.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const media = await prisma.media.findFirst({ where: { storageKey: key } });
  if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

  const provider = getStorageProvider();
  const localPath = provider.localPathFor(media.storageKey);

  let question: { text: string } | null = null;
  if (media.questionId) {
    question = await prisma.question.findUnique({ where: { id: media.questionId } });
  }

  try {
    if (media.kind === "audio" || media.kind === "video") {
      const transcript = await transcribeMedia(localPath);
      const analysis = await analyzeMediaContent(transcript, "transcript");
      const updated = await prisma.media.update({
        where: { id: media.id },
        data: { transcript, aiAnalysis: JSON.stringify(analysis) },
      });
      return NextResponse.json({ media: updated, transcript, analysis });
    }

    if (media.kind === "image") {
      const description = await describeImage(localPath, question?.text);
      const analysis = await analyzeMediaContent(description, "image_description");
      const updated = await prisma.media.update({
        where: { id: media.id },
        data: { aiAnalysis: JSON.stringify({ ...analysis, description }) },
      });
      return NextResponse.json({ media: updated, description, analysis });
    }

    return NextResponse.json({ error: `Unsupported media kind: ${media.kind}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Media analysis failed" },
      { status: 500 },
    );
  }
}
