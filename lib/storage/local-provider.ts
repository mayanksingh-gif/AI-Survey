// Local disk storage provider — files live under .media-storage/ (outside
// the SQLite DB, gitignored), served back out via app/api/media/[key]/route.ts.
// This is the "S3-compatible storage" slot from the PRD, implemented locally
// for V1-of-V2; swapping to real S3/Cloudinary/Supabase later means adding a
// sibling provider module and flipping STORAGE_PROVIDER — nothing else in
// the app references the filesystem directly.
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { StorageProvider, UploadResult } from "@/lib/storage/provider";

const STORAGE_DIR = path.join(process.cwd(), ".media-storage");

async function ensureDir() {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function extensionFor(mimeType: string, filename: string): string {
  const fromName = path.extname(filename);
  if (fromName) return fromName;
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  };
  return map[mimeType] ?? "";
}

export const localStorageProvider: StorageProvider = {
  async upload({ buffer, filename, mimeType }): Promise<UploadResult> {
    await ensureDir();
    const key = `${randomUUID()}${extensionFor(mimeType, filename)}`;
    await writeFile(path.join(STORAGE_DIR, key), buffer);
    return { storageKey: key, url: `/api/media/${key}`, sizeBytes: buffer.length };
  },

  localPathFor(storageKey: string): string {
    return path.join(STORAGE_DIR, storageKey);
  },
};

export { STORAGE_DIR };
