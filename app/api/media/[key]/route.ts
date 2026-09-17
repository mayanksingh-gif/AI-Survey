import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { STORAGE_DIR } from "@/lib/storage/local-provider";
import path from "path";

// Serves locally-stored media by key. Looks up the Media row for the
// correct mimeType rather than guessing from the extension, since the
// local provider's filename extension is best-effort.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  // Path-traversal guard: storage keys are provider-generated UUIDs, never
  // user-supplied paths — reject anything that isn't a plain filename.
  if (key.includes("..") || key.includes("/") || key.includes("\\")) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const media = await prisma.media.findFirst({ where: { storageKey: key } });
  if (!media) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const buffer = await readFile(path.join(STORAGE_DIR, key));
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": media.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
