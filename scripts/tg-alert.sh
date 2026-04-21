#!/bin/bash
# Usage: bash scripts/tg-alert.sh "message text"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
source "$ROOT/.env.production" 2>/dev/null || true
source "$ROOT/.env.local" 2>/dev/null || true
MESSAGE="${1:-Test alert from Handy and Friend Lead Hunter}"
printf '%s\n' "$MESSAGE" \
  | node "$ROOT/scripts/send-telegram.mjs" --source tg_alert --category manual_alert --actionable 1 --stdin > /dev/null
echo "Alert sent."
