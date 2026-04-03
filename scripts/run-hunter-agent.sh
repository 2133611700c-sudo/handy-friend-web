#!/bin/bash
set -euo pipefail

ROOT_DIR="/Users/sergiikuropiatnyk/handy-friend-landing-v6"
OPENCLAW_BIN="/opt/homebrew/bin/openclaw"
LOG_FILE="$ROOT_DIR/ops/hunter.log"

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
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] SKIP $LOCK_NAME: lock exists (previous run active)" >> "$LOG_FILE"
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
"$OPENCLAW_BIN" agent --agent "$OPENCLAW_AGENT_ID" --message "$MESSAGE" >> "$LOG_FILE" 2>&1 || {
  code=$?
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] FAIL $LOCK_NAME scan exit=$code" >> "$LOG_FILE"
  exit "$code"
}
echo "[$(date '+%Y-%m-%d %H:%M:%S')] DONE $LOCK_NAME scan" >> "$LOG_FILE"
