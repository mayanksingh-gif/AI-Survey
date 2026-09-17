#!/usr/bin/env bash
# Starts the local Qwen3-4B model behind an OpenAI-compatible HTTP server
# (mlx_lm.server) so the Next.js app can call it like any other LLM API,
# with no cloud API key. Model weights are the ones already cached under
# ~/.cache/huggingface/hub — first run may re-verify/download if missing.
set -euo pipefail

cd "$(dirname "$0")/.."

MODEL="${LLM_MODEL:-mlx-community/Qwen3-4B-Instruct-2507-4bit}"
HOST="${LLM_HOST:-127.0.0.1}"
PORT="${LLM_PORT:-8080}"

if [ ! -d ".venv-llm" ]; then
  echo "Creating .venv-llm ..."
  python3 -m venv .venv-llm
  # shellcheck disable=SC1091
  source .venv-llm/bin/activate
  pip install --upgrade pip -q
  pip install mlx-lm -q
else
  # shellcheck disable=SC1091
  source .venv-llm/bin/activate
fi

echo "Starting mlx_lm.server with model=${MODEL} on ${HOST}:${PORT} ..."
exec python3 -m mlx_lm server \
  --model "${MODEL}" \
  --host "${HOST}" \
  --port "${PORT}"
