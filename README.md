# Copilot — AI Research Studio (V2)

An AI research copilot, not just a survey builder. Describe a research goal
and it plans the study, generates a survey, adapts live to respondents,
detects unreliable data, and turns results into evidence-backed findings and
next research — all the way to spinning up a follow-up study from an
insight.

Runs entirely on **local models** — no API key, no cloud calls. Text is
Qwen3-4B-Instruct (MLX), audio/video transcription is Whisper (mlx-whisper),
image understanding is Qwen2-VL-2B (mlx-vlm) — all on Apple Silicon.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui
- Prisma 6 · SQLite (file-based, zero infra)
- Zod (structured LLM output validation) · Recharts · qrcode.react
- `mlx_lm.server` sidecar — OpenAI-compatible local inference
- `mlx-whisper` + `mlx-vlm` — one-shot subprocesses for media analysis
- Local disk storage provider (`.media-storage/`) behind a swappable interface

## Setup

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
brew install ffmpeg      # required for audio/video transcription
```

**Start the local model sidecar** (separate terminal — must be running
before any AI feature works):

```bash
./scripts/start-llm.sh
```

First run creates a Python venv (`.venv-llm/`) and installs `mlx-lm`,
`mlx-whisper`, `mlx-vlm`. Serves `mlx-community/Qwen3-4B-Instruct-2507-4bit`
at `http://127.0.0.1:8080/v1`. Loads in a few seconds; each AI call typically
takes 5–35s (longer for richer prompts like Insight generation), since this
is a local 4B model, not a hosted frontier one. Whisper/vision calls run as
separate one-shot subprocesses (`scripts/transcribe.py`,
`scripts/analyze_image.py`) — no persistent server needed for those, they're
called far less often than chat.

**Start the app:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it's organized

```
app/
  page.tsx                     Home — new study + studies list
  studies/[id]/{plan,build,preview,share,results}   Study tabs
  s/[slug]/                    Public respondent-facing survey (no auth)
  api/studies/...              Study CRUD + AI service endpoints
  api/public/[slug]/...        Respondent-facing endpoints (incl. adaptive follow-ups)
  api/media/[key]/...          Media serving + analysis
lib/
  llm/client.ts                mlx_lm.server fetch wrapper, Zod JSON-mode + repair retry
  ai/                           strategist, generator, editor, reviewer, analyst,
                                adaptive-followup, suggestions, evidence-engine,
                                insight-generator, quality-engine, ask-research, multimedia
  survey/                       types, stats, charts, branching, persist, personalization,
                                segments, cross-question, db-mapping
  storage/                      provider abstraction + local disk implementation
components/
  study/            Shared tab shell, status badge, adaptive-followup setting
  survey-builder/   AI chat panel, flow editor, reviewer + suggestions panels
  survey-runtime/   Question renderers (16 types) + branching/personalization runner
  dashboard/        Stat tiles, charts, AI analysis, Ask Your Research, insights,
                    quality panel, funnel/trend charts, segment comparison
scripts/
  start-llm.sh        Local chat model sidecar
  transcribe.py       Whisper subprocess (audio/video -> text)
  analyze_image.py    Vision subprocess (image -> description)
```

### AI services (`lib/ai/*`)

Every service is a plain async function: goal/survey/responses in,
Zod-validated JSON out. All prompts request JSON-only output; on validation
failure the client re-prompts once with the error appended. Where a
"judgment call" shouldn't come from the model grading its own output
(evidence strength, quality score), that computation is pure code instead —
see `evidence-engine.ts` and `quality-engine.ts`.

- **Strategist** — goal (+ follow-ups) → research plan, incl. recommended
  interaction level (none/light/medium/high) with rationale
- **Generator** — plan → full survey (16 question types, branching, stimulus)
- **Editor** — survey + instruction → updated survey (also handles broader
  "optimize" commands: reduce to N minutes, B2B tone, remove bias, etc.)
- **Reviewer** — survey → quality issues, each with a ready-to-apply fix
- **Adaptive Follow-up Agent** — live, per-response: decides whether an
  open-text answer warrants a further probe, bounded by study setting
- **Research Suggestions** — survey vs. goal/plan → missing objectives,
  weak sequencing, segment/sample-size/experience recommendations
- **Analyst** — *computed* stats (never invented) → executive summary,
  findings, richer themes (pain point / feature request / contradiction /
  outlier, with subthemes and real mention percentages)
- **Evidence Engine** (pure code) — evidence strength verdict from real
  sample size + quant/qual corroboration + answer-distribution consistency
- **Insight Generator** — stats → Finding → Evidence → Hypothesis →
  Recommended Action → Next Research; evidence strength from the Evidence
  Engine, never self-graded
- **Quality Engine** — deterministic checks (speeding, straight-lining,
  gibberish, duplicates, low-effort text) + one narrow LLM contradiction
  check; score/category always computed in code
- **Ask Your Research** — grounded Q&A over a study's real data, with
  evidence citations
- **Multimedia** — Whisper transcription + Qwen2-VL image description, then
  theme/sentiment extraction on the result

### Data model

SQLite via Prisma (`prisma/schema.prisma`): `Study`, `Question`, `Response`,
`Answer`, plus V2 additions `AdaptiveFollowUp`, `ResearchSuggestion`,
`Insight`, `ResponseQuality`, `Media`. JSON-shaped fields are stored as
`String` (SQLite has no native JSON column) and parsed at the
`lib/survey/db-mapping.ts` boundary.

## End-to-end flow

Home → New Study → goal → AI follow-ups → AI research plan (incl.
interaction level) → Generate Survey → Build (AI chat, manual flow editor,
research suggestions, branching, review) → Preview (desktop/mobile) → Share
(publish, copy link, QR) → respondents complete `/s/[slug]` — with live
adaptive follow-ups probing vague open-text answers, personalized question
copy referencing earlier answers, and optional media stimulus/responses →
Results: research overview, response-quality flagging with analytics
filtering, AI executive summary + richer themes, Insight → Action cards with
"Create Follow-Up Study", response trend + survey funnel + time-per-question
charts, segment comparison, persistent "Ask Your Research" chat, per-question
drill-down, CSV export.

## V1 → V2

V1 answered "can AI create and analyze my survey?" V2 adds: adaptive live
follow-ups, 6 new interactive question types, personalized respondent paths,
research overview + funnel + trends + segments + cross-question analysis,
a grounded research-chat, the full Insight → Action pipeline with
follow-up-study generation, respondent quality detection with non-destructive
filtering, and multimedia stimulus/response support with local
transcription/vision analysis — all still fully local, still V1's core flow
intact underneath.

## Constraints (still out of scope)

No auth, single local workspace, no MaxDiff/conjoint/advanced statistical
testing, no team collaboration, no CRM/Figma integrations, no multilingual
support.
