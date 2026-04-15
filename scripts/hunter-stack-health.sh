#!/bin/bash
set -euo pipefail

ROOT_DIR="/Users/sergiikuropiatnyk/handy-friend-landing-v6"
cd "$ROOT_DIR"

echo "HUNTER STACK HEALTH CHECK"
echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "========================================"

echo "1) API health"
API_JSON="$(curl -sS https://handyandfriend.com/api/health || true)"
if echo "$API_JSON" | grep -q '"ok":[[:space:]]*true'; then
  echo "PASS api.health=ok"
else
  echo "FAIL api.health"
fi

echo ""
echo "2) Mac cron + local runtime"
CRON_VIEW="$(crontab -l 2>/dev/null || true)"
if echo "$CRON_VIEW" | grep -Eq "run-hunter-agent\.sh|fb-social-ingest\.sh|craigslist-social-ingest\.py"; then
  echo "PASS cron.entries.present"
else
  echo "WARN cron.entries.missing"
fi

if [ -f "ops/hunter.log" ]; then
  LAST_ACTIVITY="$(tail -n 500 ops/hunter.log | grep -iE "START (nextdoor|facebook) scan|DONE (nextdoor|facebook) scan|Hunter scan complete|Hunter done" | tail -1 || true)"
  if [ -n "$LAST_ACTIVITY" ]; then
    echo "PASS mac.last_activity: $LAST_ACTIVITY"
  else
    echo "WARN mac.last_activity: not found in recent logs"
  fi
  LAST_ERROR="$(tail -n 500 ops/hunter.log | grep -iE "env: node: No such file|session file locked|FailoverError" | tail -1 || true)"
  if [ -n "$LAST_ERROR" ]; then
    echo "WARN mac.recent_error: $LAST_ERROR"
  else
    echo "PASS mac.recent_error: none"
  fi
else
  echo "WARN mac.hunter.log missing"
fi

echo ""
echo "3) Supabase social_leads (local env)"
if [ -f ".env.local" ]; then
  # shellcheck disable=SC1091
  set -a; source ./.env.local; set +a
fi
if [ -n "${SUPABASE_URL:-}" ] && [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  URL="${SUPABASE_URL%/}/rest/v1/social_leads?select=id"
  RANGE="$(curl -sS "$URL" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Prefer: count=exact" -D - -o /dev/null | awk 'BEGIN{IGNORECASE=1} /^content-range:/ {print $2}' | tr -d '\r' || true)"
  if [ -n "$RANGE" ]; then
    echo "PASS supabase.social_leads.count_range=$RANGE"
  else
    echo "WARN supabase.social_leads.unavailable"
  fi
else
  echo "WARN supabase.env.missing"
fi

echo ""
echo "4) Dell scheduler runtime"
if ssh -o BatchMode=yes -o ConnectTimeout=5 dell "cmd /c echo ok" >/dev/null 2>&1; then
  echo "PASS dell.ssh=ok"
  DEL_TASK="$(ssh -o BatchMode=yes -o ConnectTimeout=8 dell "cmd /c chcp 65001>nul & schtasks /Query /TN \"\\HandyFriendScheduler\" /V /FO LIST" 2>/dev/null || true)"
  if echo "$DEL_TASK" | grep -q "HandyFriendScheduler"; then
    echo "PASS dell.task.exists"
    echo "$DEL_TASK" | grep -E "Status:|Last Run Time:|Last Result:" || true
  else
    echo "WARN dell.task.missing_or_inaccessible"
  fi
  DEL_LAST="$(ssh -o BatchMode=yes -o ConnectTimeout=8 dell "powershell -NoProfile -Command \"Get-Content -Path 'C:\cloud cod\scheduler.log' -Tail 40\"" 2>/dev/null | grep -E "Hunter scan complete|Hunter done" | tail -1 || true)"
  if [ -n "$DEL_LAST" ]; then
    echo "PASS dell.last_activity: $DEL_LAST"
  else
    echo "WARN dell.last_activity.not_found"
  fi
else
  echo "WARN dell.ssh=fail"
fi

echo "========================================"
echo "Health check finished."
