#!/bin/bash
# QUALITY CONTROL SYSTEM FOR HANDY & FRIEND HUNTER

set -u

echo "🔍 QUALITY CONTROL CHECK - $(date)"
echo "======================================"

TODAY_PT="$(TZ=America/Los_Angeles date +%Y-%m-%d)"
LEAD_COUNT=0
TODAY_LEADS=0
CHROME_COUNT=0
LAST_SCAN=""
CRON_JOBS=0

# 1. CHECK FOR TEMPLATE PLACEHOLDER VIOLATIONS
echo "1. Checking template placeholder violations..."
PLACEHOLDER_VIOLATIONS="$(
  rg -n "competitive pricing|starting at competitive rates" \
    openclaw-skills/ --glob "*.md" --glob "*.js" --glob "*.json" 2>/dev/null || true
)"
if [ -n "$PLACEHOLDER_VIOLATIONS" ]; then
  echo "❌ Placeholder pricing text found (must use real price templates):"
  echo "$PLACEHOLDER_VIOLATIONS"
else
  echo "✅ No placeholder pricing text found"
fi

# 2. CHECK HUNTER SYSTEM STATUS
echo ""
echo "2. Checking hunter system status..."
HUNTER_PROC_COUNT="$(ps aux | grep -E "openclaw agent --agent (nextdoor|facebook|main)" | grep -v grep | wc -l | tr -d ' ')"
if [ "$HUNTER_PROC_COUNT" -gt 0 ]; then
  echo "✅ Hunter processes running: $HUNTER_PROC_COUNT"
else
  echo "⚠️  No hunter processes found"
fi

# 3. CHECK LAST SCAN TIME
echo ""
echo "3. Checking last scan..."
if [ -f "ops/hunter.log" ]; then
  LAST_SCAN="$(tail -n 400 ops/hunter.log 2>/dev/null | grep -iE "scan complete|hunter done|new leads" | tail -1 || true)"
fi
if [ -n "$LAST_SCAN" ]; then
  echo "📅 Last activity: $LAST_SCAN"
else
  echo "⚠️  No recent scans found"
fi

# 4. CHECK LEADS COUNT
echo ""
echo "4. Checking leads database..."
if [ -f "ops/leads.json" ]; then
  LEAD_COUNT="$(grep -c '"platform"' ops/leads.json 2>/dev/null || true)"
  LEAD_COUNT="${LEAD_COUNT:-0}"
  TODAY_LEADS="$(grep "$TODAY_PT" ops/leads.json 2>/dev/null | grep -c '"platform"' || true)"
  TODAY_LEADS="${TODAY_LEADS:-0}"
  echo "📊 Total leads: $LEAD_COUNT"
  echo "📊 Today's leads: $TODAY_LEADS"
else
  echo "⚠️  leads.json not found"
fi

# 5. CHECK API HEALTH
echo ""
echo "5. Checking API health..."
API_HEALTH_RAW="$(curl -s "https://handyandfriend.com/api/health" || true)"
if echo "$API_HEALTH_RAW" | grep -q '"ok":[[:space:]]*true'; then
  API_HEALTH="ok"
  echo "✅ API healthy"
else
  API_HEALTH="fail"
  echo "❌ API issues detected"
fi

# 6. CHECK TELEGRAM CONFIG
echo ""
echo "6. Checking Telegram alerts..."
if grep -q "TELEGRAM_BOT_TOKEN" .env.production 2>/dev/null && grep -q "TELEGRAM_CHAT_ID" .env.production 2>/dev/null; then
  TELEGRAM_CONFIGURED="yes"
  echo "✅ Telegram configured"
else
  TELEGRAM_CONFIGURED="no"
  echo "⚠️  Telegram not configured in .env.production"
fi

# 7. CHECK CRON JOBS
echo ""
echo "7. Checking cron jobs..."
CRON_LINES="$(crontab -l 2>/dev/null | grep -E "run-hunter-agent\.sh|nextdoor-hunter|facebook-hunter|quality-control\.sh" || true)"
if [ -n "$CRON_LINES" ]; then
  CRON_JOBS="$(echo "$CRON_LINES" | wc -l | tr -d ' ')"
  echo "✅ $CRON_JOBS cron jobs configured"
  echo "$CRON_LINES"
else
  echo "⚠️  No hunter cron jobs found"
fi

# 8. CHECK BROWSER STATUS
echo ""
echo "8. Checking browser status..."
CHROME_COUNT="$(ps aux | grep -E "Google Chrome|chrome" | grep -v grep | wc -l | tr -d ' ')"
if [ "${CHROME_COUNT:-0}" -gt 0 ]; then
  echo "✅ Browser running"
  echo "   Chrome processes: $CHROME_COUNT"
else
  echo "⚠️  Browser not running"
fi

# 9. GENERATE DAILY REPORT
echo ""
echo "9. Generating daily report..."
REPORT_FILE="ops/daily-report-$(date +%Y-%m-%d).txt"
{
  echo "DAILY QUALITY REPORT - $(date)"
  echo "================================"
  echo "Placeholder pricing violations: $( [ -n "$PLACEHOLDER_VIOLATIONS" ] && echo yes || echo no )"
  echo "Hunter processes: $HUNTER_PROC_COUNT"
  echo "Last scan: ${LAST_SCAN:-none}"
  echo "Total leads: ${LEAD_COUNT:-0}"
  echo "Today's leads: ${TODAY_LEADS:-0}"
  echo "API health: $API_HEALTH"
  echo "Telegram configured: $TELEGRAM_CONFIGURED"
  echo "Cron jobs: ${CRON_JOBS:-0}"
  echo "Browser processes: ${CHROME_COUNT:-0}"
} > "$REPORT_FILE"
echo "📄 Report saved to: $REPORT_FILE"

# 10. RECOMMENDATIONS
echo ""
echo "10. Recommendations:"
if [ -n "$PLACEHOLDER_VIOLATIONS" ]; then
  echo "   🔧 Replace placeholder pricing strings in templates with real service prices"
fi
if [ "${CRON_JOBS:-0}" -eq 0 ]; then
  echo "   🔧 Install hunter cron schedule"
fi
if [ "${TODAY_LEADS:-0}" -eq 0 ]; then
  echo "   🔧 Run manual scan: ./scripts/run-hunter-agent.sh nextdoor"
fi

echo ""
echo "✅ Quality control check complete!"
echo "======================================"
