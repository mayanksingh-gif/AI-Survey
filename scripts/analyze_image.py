#!/usr/bin/env python3
"""Describes an image via a small local vision-language model (mlx-vlm).

Called as a one-shot subprocess from lib/ai/multimedia.ts. Produces a plain
description of the image content — used for image-based question responses
(e.g. "which concept do you prefer" screenshots) so the text model can then
extract themes/sentiment from the description alongside other answers.

Per the PRD constraint, this must never infer sensitive personal traits
(identity, race, health, etc.) from the image — the prompt below restricts
the model to describing neutral visual/design content only.

Usage: python3 scripts/analyze_image.py <path-to-image> ["<question context>"]
Prints {"description": "..."} as JSON to stdout.
"""
import sys
import json
import os

os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")

MODEL = "mlx-community/Qwen2-VL-2B-Instruct-4bit"

PROMPT_TEMPLATE = (
    "Describe what is shown in this image in 2-3 neutral sentences, "
    "focused on visual design, layout, content, and any text visible. "
    "Do not infer or speculate about any person's identity, age, race, "
    "gender, health, or other personal traits — describe only what is "
    "objectively visible.{context}"
)

def main():
    if len(sys.argv) < 2:
        print("Usage: analyze_image.py <file> [context]", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    context = f" Context: this image was shown for the question \"{sys.argv[2]}\"." if len(sys.argv) > 2 else ""

    try:
        from mlx_vlm import load, generate
        from mlx_vlm.prompt_utils import apply_chat_template
        from mlx_vlm.utils import load_config
    except ImportError:
        print("mlx_vlm not installed — run: pip install mlx-vlm", file=sys.stderr)
        sys.exit(1)

    try:
        model, processor = load(MODEL)
        config = load_config(MODEL)
        prompt = PROMPT_TEMPLATE.format(context=context)
        formatted = apply_chat_template(processor, config, prompt, num_images=1)
        result = generate(model, processor, formatted, [path], max_tokens=200, verbose=False)
        text = result.text if hasattr(result, "text") else str(result)
        print(json.dumps({"description": text.strip()}))
    except Exception as e:
        print(f"Image analysis failed: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
