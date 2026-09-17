// Multimedia AI Analysis: transcribes audio/video (mlx-whisper) and
// describes images (mlx-vlm, Qwen2-VL-2B) via one-shot Python subprocesses
// — these run far less often than the main chat model, so a persistent
// server per model isn't worth the RAM/complexity. Transcripts/descriptions
// then feed the existing text-based theme/sentiment extraction (analyst.ts
// style prompting) rather than duplicating that logic here.
import { spawn } from "child_process";
import { generateStructured } from "@/lib/llm/client";
import { MediaAnalysisResultSchema } from "@/lib/llm/schemas";

// Built via string concatenation, not path.join(process.cwd(), ...) — that
// exact pattern is a heuristic Next.js/Turbopack uses to statically trace
// and bundle referenced files for serverless output. .venv-llm/bin/python3
// is a venv symlink pointing to the system Python (outside the project
// tree), which that tracer can't resolve and fails the build on. This is a
// runtime-only subprocess path, never meant to be bundled.
function resolvePath(...segments: string[]): string {
  return segments.join("/");
}

const PROJECT_ROOT = process.cwd();
const VENV_PYTHON = resolvePath(PROJECT_ROOT, ".venv-llm", "bin", "python3");

function runPython(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(VENV_PYTHON, [resolvePath(PROJECT_ROOT, "scripts", script), ...args]);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `${script} exited with code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });
    proc.on("error", (err) => reject(err));
  });
}

/** Transcribes an audio or video file via mlx-whisper. Video files work
 * too — mlx-whisper/ffmpeg extract the audio track automatically. */
export async function transcribeMedia(localFilePath: string): Promise<string> {
  const raw = await runPython("transcribe.py", [localFilePath]);
  const { text } = JSON.parse(raw);
  return text;
}

/** Describes an image via a small local vision-language model. Never
 * infers sensitive personal traits — enforced in the script's own prompt,
 * not just here, so it holds even if this function is bypassed. */
export async function describeImage(localFilePath: string, questionContext?: string): Promise<string> {
  const args = questionContext ? [localFilePath, questionContext] : [localFilePath];
  const raw = await runPython("analyze_image.py", args);
  const { description } = JSON.parse(raw);
  return description;
}

/** Given a transcript or image description, extracts themes/sentiment/key
 * points using the main text model — same analysis vocabulary as the
 * Research Analyst, just scoped to one piece of media rather than a whole
 * question's worth of answers. */
export async function analyzeMediaContent(
  content: string,
  contentKind: "transcript" | "image_description",
): Promise<{ themes: string[]; sentiment?: string; keyPoints: string[]; description?: string }> {
  return generateStructured({
    system: `You analyze ${contentKind === "transcript" ? "a transcribed audio/video response" : "an image description"}
from a survey respondent. Extract themes, sentiment, and key points —
grounded strictly in the given text, never inferring anything about the
respondent's identity or personal traits beyond what they explicitly said.`,
    user: `${contentKind === "transcript" ? "Transcript" : "Image description"}:
"${content}"

Return JSON: { "themes": string[], "sentiment"?: "positive"|"negative"|"neutral"|"mixed",
"keyPoints": string[], "description"?: string }`,
    schema: MediaAnalysisResultSchema,
    temperature: 0.3,
    maxTokens: 400,
  });
}
