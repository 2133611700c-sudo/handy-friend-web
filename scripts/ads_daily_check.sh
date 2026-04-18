#!/usr/bin/env bash
# ads_daily_check.sh — daily Google Ads + leads metrics snapshot
# Usage: ./scripts/ads_daily_check.sh
# Output: ops/ads-monitoring/YYYY-MM-DD.md (appends if re-run same day)
#
# Thresholds trigger Telegram alert if TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID set.
# Baseline (2026-04-18): 174 impressions / 6 clicks / CTR 3.07% / CPC $3.86 / $23.12 spent / 30 days
# Budget cap: $6.40/day (~$192/month ≤ $200)

set -euo pipefail

cd "$(dirname "$0")/.."

TODAY=$(date -u +%Y-%m-%d)
OUT_DIR="ops/ads-monitoring"
OUT_FILE="$OUT_DIR/${TODAY}.md"
mkdir -p "$OUT_DIR"

# ── pull SUPABASE_SERVICE_ROLE_KEY for stats API ──
if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  if [[ -f ".env.production" ]]; then
    export SUPABASE_SERVICE_ROLE_KEY=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" .env.production | sed 's/^[^=]*=//' | tr -d '"')
  fi
fi
STATS_SECRET="${SUPABASE_SERVICE_ROLE_KEY:0:16}"

SITE="https://handyandfriend.com"

# ── fetch stats via API ──
stats7=$(curl -s "${SITE}/api/health?type=stats&key=${STATS_SECRET}&days=7")
stats30=$(curl -s "${SITE}/api/health?type=stats&key=${STATS_SECRET}&days=30")
outbox=$(curl -s "${SITE}/api/health?type=outbox")

parse() {
  local json="$1"; local key="$2"
  echo "$json" | python3 -c "
import json, sys
try:
    d = json.load(sys.stdin)
    k = '$key'.split('.')
    for part in k:
        d = d[part]
    print(d)
except Exception as e:
    print('?')
"
}

L7=$(parse "$stats7" "data.leads_total")
R7=$(parse "$stats7" "data.revenue")
SRC7=$(parse "$stats7" "data.leads_by_source")
SVC7=$(parse "$stats7" "data.leads_by_service")

L30=$(parse "$stats30" "data.leads_total")
LP30=$(parse "$stats30" "data.leads_prev")
R30=$(parse "$stats30" "data.revenue")
J30=$(parse "$stats30" "data.jobs_completed")

OUTBOX_OK=$(parse "$outbox" "ok")
OUTBOX_SLO=$(parse "$outbox" "slo_breached")
OUTBOX_QD=$(parse "$outbox" "queue_depth")

# ── write report ──
{
  echo "# Ads Daily Check — ${TODAY}"
  echo ""
  echo "**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo ""
  echo "## Leads (from Supabase)"
  echo ""
  echo "| Window | Leads | Revenue | Jobs |"
  echo "|--------|-------|---------|------|"
  echo "| Last 7d | ${L7} | \$${R7} | — |"
  echo "| Last 30d | ${L30} | \$${R30} | ${J30} |"
  echo "| Prev 30d | ${LP30} | — | — |"
  echo ""
  echo "**Sources (7d):** ${SRC7}"
  echo ""
  echo "**Services (7d):** ${SVC7}"
  echo ""
  echo "## Outbox Health"
  echo ""
  echo "- ok=${OUTBOX_OK}, slo_breached=${OUTBOX_SLO}, queue_depth=${OUTBOX_QD}"
  echo ""
  echo "## Google Ads (manual — pull from kabinet UI)"
  echo ""
  echo "> Paste below from ads.google.com/aw/overview — campaign 23655774397:"
  echo "> "
  echo "> - Impressions (30d): ___"
  echo "> - Clicks (30d): ___"
  echo "> - CTR: ___%"
  echo "> - Avg CPC: \$___"
  echo "> - Spent: \$___"
  echo "> - Search IS: ___%"
  echo "> - Lost IS (rank): ___%"
  echo "> - Lost IS (budget): ___%"
  echo ""
  echo "## Alerts vs baseline"
  echo ""
  # Compare 7d leads trend vs prev
  if [[ "${L7}" =~ ^[0-9]+$ ]] && [[ "${L7}" -lt 1 ]]; then
    echo "- 🚨 ALERT: 0 leads in last 7d"
  fi
  if [[ "${OUTBOX_OK}" == "False" ]]; then
    echo "- 🚨 ALERT: outbox unhealthy (ok=${OUTBOX_OK})"
  fi
  if [[ "${OUTBOX_SLO}" == "True" ]]; then
    echo "- ⚠️  WARN: outbox SLO breached"
  fi
  echo ""
  echo "---"
  echo ""
  echo "_Run again: \`bash scripts/ads_daily_check.sh\`_"
} > "$OUT_FILE"

echo "✅ Report written: $OUT_FILE"
echo ""
cat "$OUT_FILE"

# ── Telegram alert if any critical threshold breached ──
ALERT_MSG=""
if [[ "${L7}" =~ ^[0-9]+$ ]] && [[ "${L7}" -eq 0 ]]; then
  ALERT_MSG="${ALERT_MSG}🚨 0 leads in last 7 days%0A"
fi
if [[ "${OUTBOX_OK}" == "False" ]]; then
  ALERT_MSG="${ALERT_MSG}🚨 Outbox unhealthy%0A"
fi

if [[ -n "$ALERT_MSG" ]] && [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]] && [[ -n "${TELEGRAM_CHAT_ID:-}" ]]; then
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=Ads daily check ${TODAY}:%0A${ALERT_MSG}Report: ${OUT_FILE}" > /dev/null
  echo "📢 Telegram alert sent"
fi
