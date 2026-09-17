# Copilot — AI Research Studio (V1)

An AI-powered survey and research tool. Describe a research goal, and the
copilot plans the study, generates a survey, lets you edit it (manually or
via chat), publishes a public link, collects responses, and analyzes results
into a dashboard with charts and evidence-backed findings.

Runs entirely on a **local LLM** — no API key, no cloud calls. The model is
Qwen3-4B-Instruct, served via [MLX](https://github.com/ml-explore/mlx-lm) on
Apple Silicon.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 · shadcn/ui
- Prisma 6 · SQLite (file-based, zero infra)
- Zod (structured LLM output validation) · Recharts · qrcode.react
- `mlx_lm.server` sidecar — OpenAI-compatible local inference

## Setup

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db
```

**Start the local model** (separate terminal — must be running before any AI
feature works):

```bash
./scripts/start-llm.sh
```

First run creates a Python venv (`.venv-llm/`) and installs `mlx-lm`. It
serves `mlx-community/Qwen3-4B-Instruct-2507-4bit` at
`http://127.0.0.1:8080/v1` (already cached under
`~/.cache/huggingface/hub` if you've used it before — otherwise it downloads
on first request). Loads in a few seconds; each AI call typically takes
5–35s depending on output length, since this is a local 4B model, not a
hosted frontier one.

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
  api/public/[slug]/...        Respondent-facing endpoints
lib/
  llm/client.ts                mlx_lm.server fetch wrapper, Zod JSON-mode + repair retry
  ai/{strategist,generator,editor,reviewer,analyst}.ts   The 5 AI services
  survey/{types,stats,charts,branching,persist}.ts       Domain logic
components/
  study/            Shared tab shell, status badge
  survey-builder/   AI chat panel, flow editor, reviewer panel
  survey-runtime/   Question renderers (10 types) + branching runner
  dashboard/        Stat tiles, per-question-type charts, AI analysis panel
scripts/start-llm.sh   Local model sidecar
```

### AI services (`lib/ai/*`)

Each is a plain async function: goal/survey/responses in, Zod-validated JSON
out. All prompts request JSON-only output; on a validation failure the
client re-prompts once with the error appended (local 4B models are less
reliable at strict JSON than hosted models — this is the main mitigation).

- **Strategist** — research goal (+ follow-ups) → research plan
- **Generator** — research plan → full survey (title, screens, questions, branching)
- **Editor** — survey + natural-language instruction → updated survey
- **Reviewer** — survey → quality issues, each with a ready-to-apply fix
- **Analyst** — *computed* response stats (never invented) → executive summary, findings, themes

### Data model

SQLite via Prisma (`prisma/schema.prisma`): `Study`, `Question`, `Response`,
`Answer`. JSON-shaped fields are stored as `String` (SQLite has no native
JSON column) and parsed at the `lib/survey/db-mapping.ts` boundary.

## End-to-end flow

Home → New Study → goal → AI follow-ups → AI research plan → Generate
Survey → Build (edit via AI chat, manual flow editor, branching, run
review) → Preview (desktop/mobile, doesn't count toward results) → Share
(publish, copy link, QR) → respondents complete `/s/[slug]` → Results
(stat tiles, per-question charts, AI executive summary + findings + themes,
CSV export).

## Notes / V1 constraints

No auth, single local workspace, no voice/video/image responses, no AI
interviews, no MaxDiff/conjoint/advanced stats — matches the V1 PRD scope.
