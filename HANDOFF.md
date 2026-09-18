# Handoff — Copilot: AI Research Studio (V2)

Written 2026-09-18 to move this project from one laptop to another and
resume work with a fresh Claude Code session.

## What this project is

An AI research copilot (survey builder + live-adaptive respondent
experience + AI analysis), see [README.md](README.md) for the full feature
tour. Runs **entirely on local models** on Apple Silicon — no API keys, no
cloud calls:

- Chat/reasoning: Qwen3-4B-Instruct (MLX) via `mlx_lm.server`
- Audio/video transcription: `mlx-whisper`
- Image understanding: Qwen2-VL-2B (`mlx-vlm`)

## What's in the zip vs. what you must regenerate

The handoff zip (`AI-Survey-handoff.zip`) is the repo **minus**:

| Excluded | Why | How to restore |
|---|---|---|
| `node_modules/` | 895MB, reinstallable | `npm install` |
| `.next/` | build cache | `npm run dev` / `npm run build` |
| `.venv-llm/` | 1.5GB Python venv for the LLM sidecar | auto-recreated by `./scripts/start-llm.sh` |
| `.git/` | zip is a snapshot, not a git clone | see "Git" below |
| `.env` | **contains secrets/local config** — never zip this | recreate from `.env.example` |
| `prisma/dev.db`, `dev.db-journal` | local SQLite data (your survey responses) | recreate with `npx prisma migrate dev`, or copy the db file separately if you want the actual data |
| `tsconfig.tsbuildinfo`, `next-env.d.ts`, `.DS_Store` | build/OS junk | auto-regenerated |

**`.media-storage/`** (uploaded survey/response media, 1.7MB) **is included**
in the zip — if you want a truly clean start you can delete it after
extracting; if you want your existing uploaded media to keep working,
leave it.

## Setup on the new laptop

```bash
# 1. Unzip, cd in
unzip AI-Survey-handoff.zip
cd "AI Survey"

# 2. Recreate .env (copy .env.example, values already match local defaults)
cp .env.example .env

# 3. Install deps
npm install

# 4. Create the DB (fresh — you will NOT have your old responses unless
#    you separately copied prisma/dev.db over)
npx prisma migrate dev

# 5. ffmpeg is required for audio/video transcription
brew install ffmpeg

# 6. Start the local LLM sidecar (separate terminal, must stay running)
./scripts/start-llm.sh
# First run creates .venv-llm/ and installs mlx-lm, mlx-whisper, mlx-vlm.
# Serves Qwen3-4B-Instruct at http://127.0.0.1:8080/v1.

# 7. Start the app
npm run dev
# http://localhost:3000
```

## Git

This project's git history is being pushed to:
**https://github.com/mayanksingh-gif/AI-Survey**

On the new laptop, prefer cloning that repo directly over unzipping —
you'll get full history and can just `git pull` going forward:

```bash
git clone https://github.com/mayanksingh-gif/AI-Survey.git
cd AI-Survey
# then steps 2-7 above
```

The zip is a fallback for offline transfer / if you want the exact
uncommitted working-tree state at handoff time.

## State at handoff time

- Branch: `main`, working tree clean (last local change —
  `lib/survey/plan-utils.ts` — was committed before packaging).
- Last commits (newest first):
  - `chore: add plan-utils helper`
  - `Fix adaptive follow-up consistency and swipe-card drag interaction`
  - `fix: question IDs churning on every save broke the 2nd image upload`
  - `feat: make missing-image requirement much more visible in the Build tab`
  - `fix: local model emitting bare-string question options caused 500s across every AI call`
- No open/in-progress work-in-progress branches — everything is on `main`.
- The project is V2-complete per the README's feature list (adaptive
  follow-ups, 6 new question types, personalization, full analytics
  dashboard, Insight → Action pipeline, respondent quality detection,
  multimedia support).

## Known constraints / non-goals (unchanged)

No auth, single local workspace, no MaxDiff/conjoint/advanced statistical
testing, no team collaboration, no CRM/Figma integrations, no multilingual
support.

## Gotcha for whoever (including future-you) opens this in Claude Code

[AGENTS.md](AGENTS.md) / [CLAUDE.md](CLAUDE.md) note that this repo's
`next` package has **breaking changes from stock Next.js** — read
`node_modules/next/dist/docs/` before writing Next.js-specific code. This
doc only exists after `npm install`, so do that first.

## Things to double check after moving

- [ ] `.env` values still correct for the new machine (paths, ports)
- [ ] `brew install ffmpeg` done — required for transcription features
- [ ] Local LLM sidecar model downloads on first `start-llm.sh` run (needs
      network the first time; cached in `.venv-llm/` after)
- [ ] If you need your actual old survey data: copy `prisma/dev.db` from
      the old laptop separately (not in the zip, not in git) — it's your
      real local data, treat it like the secret it effectively is
