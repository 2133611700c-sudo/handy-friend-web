#!/bin/bash
# QUALITY CONTROL SYSTEM FOR HANDY & FRIEND

set -u

echo "QUALITY CONTROL CHECK - $(date)"
echo "======================================"

TODAY_PT="$(TZ=America/Los_Angeles date +%Y-%m-%d)"
LEAD_COUNT=0
TODAY_LEADS=0
CRON_JOBS=0

# 1. CHECK FOR TEMPLATE PLACEHOLDER VIOLATIONS
echo "1. Checking template placeholder violations..."
PLACEHOLDER_VIOLATIONS="$(
  rg -n "competitive pricing|starting at competitive rates" \
    openclaw-skills/ --glob "*.md" --glob "*.js" --glob "*.json" 2>/dev/null || true
)"
if [ -n "$PLACEHOLDER_VIOLATIONS" ]; then
  echo "FAIL Placeholder pricing text found (must use real price templates):"
  echo "$PLACEHOLDER_VIOLATIONS"
else
  echo "PASS No placeholder pricing text found"
fi

# 2. CHECK LEADS COUNT
echo ""
echo "2. Checking leads database..."
if [ -f "ops/leads.json" ]; then
  LEAD_COUNT="$(grep -c '"platform"' ops/leads.json 2>/dev/null || true)"
  LEAD_COUNT="${LEAD_COUNT:-0}"
  TODAY_LEADS="$(grep "$TODAY_PT" ops/leads.json 2>/dev/null | grep -c '"platform"' || true)"
  TODAY_LEADS="${TODAY_LEADS:-0}"
  echo "Total leads: $LEAD_COUNT"
  echo "Today's leads: $TODAY_LEADS"
else
  echo "WARN leads.json not found (normal — using Supabase)"
fi

# 3. CHECK API HEALTH
echo ""
echo "3. Checking API health..."
API_HEALTH_RAW="$(curl -s "https://handyandfriend.com/api/health" || true)"
if echo "$API_HEALTH_RAW" | grep -q '"ok":[[:space:]]*true'; then
  API_HEALTH="ok"
  echo "PASS API healthy"
else
  API_HEALTH="fail"
  echo "FAIL API issues detected"
fi

# 4. CHECK TELEGRAM CONFIG
echo ""
echo "4. Checking Telegram alerts..."
if grep -q "TELEGRAM_BOT_TOKEN" .env.production 2>/dev/null && grep -q "TELEGRAM_CHAT_ID" .env.production 2>/dev/null; then
  TELEGRAM_CONFIGURED="yes"
  echo "PASS Telegram configured"
else
  TELEGRAM_CONFIGURED="no"
  echo "WARN Telegram not configured in .env.production"
fi

# 5. CHECK ACTIVE CRON JOBS
echo ""
echo "5. Checking cron jobs..."
CRON_LINES="$(crontab -l 2>/dev/null | grep -v "^#" | grep -v "^$" || true)"
if [ -n "$CRON_LINES" ]; then
  CRON_JOBS="$(echo "$CRON_LINES" | wc -l | tr -d ' ')"
  echo "PASS $CRON_JOBS cron jobs active"
else
  echo "WARN No cron jobs found"
fi

# 6. GENERATE DAILY REPORT
echo ""
echo "6. Generating daily report..."
REPORT_FILE="ops/daily-report-$(date +%Y-%m-%d).txt"
{
  echo "DAILY QUALITY REPORT - $(date)"
  echo "================================"
  echo "Placeholder pricing violations: $( [ -n "$PLACEHOLDER_VIOLATIONS" ] && echo yes || echo no )"
  echo "Total leads: ${LEAD_COUNT:-0}"
  echo "Today's leads: ${TODAY_LEADS:-0}"
  echo "API health: $API_HEALTH"
  echo "Telegram configured: $TELEGRAM_CONFIGURED"
  echo "Cron jobs: ${CRON_JOBS:-0}"
} > "$REPORT_FILE"
echo "Report saved to: $REPORT_FILE"

echo ""
echo "Quality control check complete!"
echo "======================================"
