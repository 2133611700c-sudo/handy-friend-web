#!/usr/bin/env bash
# Usage: ./scripts/telegram-send.sh "message text" [source-name]
# Sends message via unified sender and logs in telegram_sends.

set -euo pipefail

MSG="${1:?message text required}"
SRC="${2:-manual}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RESULT="$(printf '%s' "$MSG" | node "$ROOT/scripts/send-telegram.mjs" \
  --source "$SRC" \
  --category manual_send \
  --actionable 0 \
  --stdin)"

if [ -n "$RESULT" ]; then
  echo "$RESULT"
fi
