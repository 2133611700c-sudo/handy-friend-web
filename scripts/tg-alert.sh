#!/bin/bash
# Usage: bash scripts/tg-alert.sh "message text"
source "$(dirname "$0")/../.env.production" 2>/dev/null
if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
  echo "ERROR: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set"
  exit 1
fi
MESSAGE="${1:-Test alert from Handy and Friend Lead Hunter}"
curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_CHAT_ID}" \
  -d text="${MESSAGE}" > /dev/null 2>&1
echo "Alert sent."
