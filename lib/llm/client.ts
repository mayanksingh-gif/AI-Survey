/**
 * Thin client for the local Qwen sidecar (mlx_lm.server), which speaks the
 * OpenAI chat-completions wire format. No API key — this only ever talks to
 * 127.0.0.1. The sidecar has no JSON-schema/grammar constraint support, so
 * structured output is enforced here: prompt for JSON -> extract -> validate
 * with the caller's Zod schema -> one repair retry on failure.
 */
import type { z } from "zod";

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? "http://127.0.0.1:8080/v1";
const LLM_MODEL =
  process.env.LLM_MODEL ?? "mlx-community/Qwen3-4B-Instruct-2507-4bit";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LlmUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(
      "Local LLM is unreachable. Start it with `./scripts/start-llm.sh` and retry.",
    );
    this.cause = cause;
  }
}

async function chat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 1200,
      }),
      // The sidecar is local and can be slow to cold-start; give it room.
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err) {
    throw new LlmUnavailableError(err);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM response missing message content");
  }
  return content;
}

/** Pull the first {...} or [...] JSON block out of a model response, tolerating
 * chatty preambles, markdown code fences, and trailing commentary. */
function extractJson(text: string): unknown {
  let candidate = text.trim();
  const fenced = candidate.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidate = fenced[1].trim();

  try {
    return JSON.parse(candidate);
  } catch {
    // fall through to brace/bracket scanning
  }

  const firstBrace = candidate.search(/[{[]/);
  if (firstBrace === -1) throw new Error("No JSON object found in LLM output");
  const opener = candidate[firstBrace];
  const closer = opener === "{" ? "}" : "]";
  let depth = 0;
  for (let i = firstBrace; i < candidate.length; i++) {
    if (candidate[i] === opener) depth++;
    else if (candidate[i] === closer) {
      depth--;
      if (depth === 0) {
        return JSON.parse(candidate.slice(firstBrace, i + 1));
      }
    }
  }
  throw new Error("Unbalanced JSON in LLM output");
}

/**
 * Ask the LLM for output matching `schema`, described to the model as a
 * JSON-only instruction. On a validation failure, re-prompts once with the
 * validation error appended so the model can self-correct — local 4B models
 * are noticeably less reliable at strict JSON than hosted frontier models.
 */
export async function generateStructured<T>(args: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const baseMessages: ChatMessage[] = [
    {
      role: "system",
      content: `${args.system}\n\nRespond with ONLY a single valid JSON value — no prose, no markdown fences, no explanation before or after it.`,
    },
    { role: "user", content: args.user },
  ];

  const attempt = async (messages: ChatMessage[]) => {
    const raw = await chat(messages, {
      temperature: args.temperature,
      maxTokens: args.maxTokens,
    });
    const json = extractJson(raw);
    const parsed = args.schema.safeParse(json);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }
    return { value: parsed.data, raw };
  };

  try {
    return (await attempt(baseMessages)).value;
  } catch (firstErr) {
    const repairMessages: ChatMessage[] = [
      ...baseMessages,
      {
        role: "user",
        content: `Your previous response was invalid JSON or did not match the required shape. Error: ${
          firstErr instanceof Error ? firstErr.message : String(firstErr)
        }\n\nReturn ONLY corrected valid JSON, nothing else.`,
      },
    ];
    const { value } = await attempt(repairMessages);
    return value;
  }
}

/** Plain text generation for narration (e.g. "Applied 3 changes: ...") where
 * strict JSON isn't required. */
export async function generateText(
  args: { system: string; user: string; temperature?: number; maxTokens?: number },
): Promise<string> {
  return chat(
    [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    { temperature: args.temperature, maxTokens: args.maxTokens },
  );
}
