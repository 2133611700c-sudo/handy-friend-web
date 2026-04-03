#!/bin/bash
set -euo pipefail

ROOT_DIR="/Users/sergiikuropiatnyk/handy-friend-landing-v6"
OPENCLAW_BIN="/opt/homebrew/bin/openclaw"
LOG_FILE="$ROOT_DIR/ops/hunter.log"
HUNTER_TIMEOUT_SECONDS="${HUNTER_TIMEOUT_SECONDS:-600}"

AGENT_KIND="${1:-nextdoor}"

case "$AGENT_KIND" in
  nextdoor)
    LOCK_NAME="nextdoor"
    PREFERRED_AGENT_ID="nextdoor"
    MESSAGE="Run nextdoor-hunter skill with service-specific templates and strict photo/text matching checks."
    ;;
  facebook)
    LOCK_NAME="facebook"
    PREFERRED_AGENT_ID="facebook"
    MESSAGE="Run facebook-hunter skill with service-specific templates and strict photo/text matching checks."
    ;;
  *)
    echo "Usage: $0 {nextdoor|facebook}"
    exit 2
    ;;
esac

export HOME="/Users/sergiikuropiatnyk"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [ ! -x "$OPENCLAW_BIN" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR openclaw not executable: $OPENCLAW_BIN" >> "$LOG_FILE"
  exit 1
fi

LOCK_DIR="/tmp/handyfriend-${LOCK_NAME}.lock"
LOCK_STALE_MINUTES="${LOCK_STALE_MINUTES:-180}"

if [ -d "$LOCK_DIR" ]; then
  NOW_EPOCH="$(date +%s)"
  LOCK_EPOCH="$(stat -f %m "$LOCK_DIR" 2>/dev/null || echo 0)"
  LOCK_AGE_MIN=$(( (NOW_EPOCH - LOCK_EPOCH) / 60 ))
  if [ "$LOCK_AGE_MIN" -gt "$LOCK_STALE_MINUTES" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN $LOCK_NAME: stale lock ${LOCK_AGE_MIN}m, removing" >> "$LOG_FILE"
    rmdir "$LOCK_DIR" 2>/dev/null || rm -rf "$LOCK_DIR" 2>/dev/null || true
  fi
fi

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SKIP $LOCK_NAME: lock exists (active), age<=${LOCK_STALE_MINUTES}m" >> "$LOG_FILE"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# Use dedicated agent if configured; otherwise fallback to main.
if "$OPENCLAW_BIN" agents list 2>/dev/null | grep -qE "^- ${PREFERRED_AGENT_ID} "; then
  OPENCLAW_AGENT_ID="$PREFERRED_AGENT_ID"
else
  OPENCLAW_AGENT_ID="main"
fi

cd "$ROOT_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] START $LOCK_NAME scan (agent=$OPENCLAW_AGENT_ID)" >> "$LOG_FILE"
if command -v timeout >/dev/null 2>&1; then
  timeout "$HUNTER_TIMEOUT_SECONDS" "$OPENCLAW_BIN" agent --agent "$OPENCLAW_AGENT_ID" --message "$MESSAGE" >> "$LOG_FILE" 2>&1 || {
    code=$?
    if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL $LOCK_NAME scan timeout=${HUNTER_TIMEOUT_SECONDS}s" >> "$LOG_FILE"
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL $LOCK_NAME scan exit=$code" >> "$LOG_FILE"
    fi
    exit "$code"
  }
else
  "$OPENCLAW_BIN" agent --agent "$OPENCLAW_AGENT_ID" --message "$MESSAGE" >> "$LOG_FILE" 2>&1 || {
    code=$?
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL $LOCK_NAME scan exit=$code" >> "$LOG_FILE"
    exit "$code"
  }
fi
echo "[$(date '+%Y-%m-%d %H:%M:%S')] DONE $LOCK_NAME scan" >> "$LOG_FILE"
