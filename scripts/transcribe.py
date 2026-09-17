#!/usr/bin/env python3
"""Transcribes an audio/video file to text via mlx-whisper.

Called as a one-shot subprocess from lib/ai/multimedia.ts (transcription is
rare relative to chat calls, so a persistent server isn't worth the
complexity) — invoked once per audio/video Media row needing a transcript,
not on a hot path.

Usage: python3 scripts/transcribe.py <path-to-audio-or-video-file>
Prints the transcript as plain text to stdout; errors go to stderr with a
non-zero exit code.
"""
import sys
import json
import os

# Silence huggingface_hub's download progress bars — they write to stderr
# but we want stderr reserved for actual error diagnostics that the calling
# Node process surfaces to the user.
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

def main():
    if len(sys.argv) != 2:
        print("Usage: transcribe.py <file>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    try:
        import mlx_whisper
    except ImportError:
        print("mlx_whisper not installed — run: pip install mlx-whisper", file=sys.stderr)
        sys.exit(1)

    try:
        result = mlx_whisper.transcribe(path, path_or_hf_repo="mlx-community/whisper-small-mlx")
        print(json.dumps({"text": result["text"].strip()}))
    except Exception as e:
        print(f"Transcription failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
