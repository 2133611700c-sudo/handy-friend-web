#!/usr/bin/env bash
# Usage: ./scripts/telegram-send.sh "message text" [source-name]
# Sends message via bot API and logs response to ops/telegram-sends.jsonl

set -euo pipefail

MSG="${1:?message text required}"
SRC="${2:-manual}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

: "${TELEGRAM_BOT_TOKEN:?TELEGRAM_BOT_TOKEN not set — source .env.production or .env.local}"
: "${TELEGRAM_CHAT_ID:?TELEGRAM_CHAT_ID not set}"

RESPONSE="$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=${MSG}")"

TELEGRAM_RESPONSE="$RESPONSE" TELEGRAM_SOURCE="$SRC" TELEGRAM_PREVIEW="$MSG" PYTHONPATH="$ROOT" \
python3 - <<'PY'
import json
import os

from lib.telegram_logger import log_send

resp = json.loads(os.environ["TELEGRAM_RESPONSE"])
entry = log_send(
    resp,
    os.environ.get("TELEGRAM_SOURCE", "manual"),
    os.environ.get("TELEGRAM_PREVIEW", ""),
)
print(f"msg_id={entry['msg_id']} ok={entry['ok']}")
PY
