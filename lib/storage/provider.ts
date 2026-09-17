// Storage provider abstraction (PRD requirement: "do not store large files
// directly in the database", "keep provider configuration separate from
// application logic"). V1-of-V2 ships a "local" provider — files live under
// a directory outside the DB, served via an API route — so swapping to
// S3/Cloudinary/Supabase later only means implementing this interface and
// changing STORAGE_PROVIDER, no caller changes.
import { localStorageProvider } from "@/lib/storage/local-provider";

export interface UploadResult {
  storageKey: string;
  url: string;
  sizeBytes: number;
}

export interface StorageProvider {
  upload(args: { buffer: Buffer; filename: string; mimeType: string }): Promise<UploadResult>;
  /** Absolute filesystem path for a stored key — only meaningful for
   * providers backed by local disk (used by transcription/vision analysis,
   * which need a real file path to hand to a Python subprocess). Providers
   * without local disk access should throw. */
  localPathFor(storageKey: string): string;
}

const PROVIDERS: Record<string, StorageProvider> = {
  local: localStorageProvider,
};

export function getStorageProvider(): StorageProvider {
  const name = process.env.STORAGE_PROVIDER ?? "local";
  const provider = PROVIDERS[name];
  if (!provider) throw new Error(`Unknown STORAGE_PROVIDER "${name}"`);
  return provider;
}
