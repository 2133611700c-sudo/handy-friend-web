#!/bin/bash
# Copy Gem prompt to clipboard for pasting into Gemini
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
case "$1" in
  research|1) cat "$PROJECT_DIR/ops/gemini-gems/GEM1_RESEARCH.txt" | pbcopy && echo "Research Gem prompt copied to clipboard" ;;
  content|2)  cat "$PROJECT_DIR/ops/gemini-gems/GEM2_CONTENT.txt" | pbcopy && echo "Content Gem prompt copied to clipboard" ;;
  uiux|3)     cat "$PROJECT_DIR/ops/gemini-gems/GEM3_UIUX.txt" | pbcopy && echo "UI/UX Gem prompt copied to clipboard" ;;
  *) echo "Usage: bash scripts/gem-copy.sh [research|content|uiux]" ;;
esac
