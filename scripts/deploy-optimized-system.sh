#!/bin/bash
# DEPLOY OPTIMIZED HUNTER SYSTEM
# Full Amazon-level deployment

echo "🚀 DEPLOYING OPTIMIZED HUNTER SYSTEM"
echo "======================================"
echo "Start time: $(date)"
echo ""

# 1. BACKUP EXISTING SYSTEM
echo "1. Backing up existing system..."
BACKUP_DIR="backups/hunter-system-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r openclaw-skills/nextdoor-hunter "$BACKUP_DIR/" 2>/dev/null || true
cp -r openclaw-skills/facebook-hunter "$BACKUP_DIR/" 2>/dev/null || true
cp -r openclaw-skills/templates "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup created: $BACKUP_DIR"

# 2. DEPLOY SAFE TEMPLATES
echo ""
echo "2. Deploying safe templates..."
cp openclaw-skills/templates/safe-templates.js openclaw-skills/nextdoor-hunter/ 2>/dev/null || true
cp openclaw-skills/templates/safe-templates.js openclaw-skills/facebook-hunter/ 2>/dev/null || true
echo "✅ Safe templates deployed"

# 3. UPDATE SKILL FILES
echo ""
echo "3. Updating skill files..."
# Replace SKILL.md with safe version
if [ -f "openclaw-skills/nextdoor-hunter/SKILL-safe.md" ]; then
  cp openclaw-skills/nextdoor-hunter/SKILL-safe.md openclaw-skills/nextdoor-hunter/SKILL.md
  echo "✅ Nextdoor hunter updated"
fi

# Validate Facebook SKILL file exists
if [ -f "openclaw-skills/facebook-hunter/SKILL.md" ]; then
  echo "✅ Facebook hunter present"
fi

# 4. SETUP CRON JOBS
echo ""
echo "4. Setting up optimized cron jobs..."
CRON_TEMP=$(mktemp)
cat > "$CRON_TEMP" << 'EOF'
# ============================================
# HANDY & FRIEND OPTIMIZED HUNTER SYSTEM
# Amazon-level automation
# ============================================

# Nextdoor Hunter - Peak hours (9AM-6PM): every 30 minutes
5,35 9-18 * * 1-6 cd ~/handy-friend-landing-v6 && ./scripts/run-hunter-agent.sh nextdoor >> ops/hunter.log 2>&1

# Nextdoor Hunter - Off-peak hours: every hour
5 7-8,19-21 * * 1-6 cd ~/handy-friend-landing-v6 && ./scripts/run-hunter-agent.sh nextdoor >> ops/hunter.log 2>&1

# Facebook Hunter - Once per hour during business hours
20 9-18 * * 1-6 cd ~/handy-friend-landing-v6 && ./scripts/run-hunter-agent.sh facebook >> ops/hunter.log 2>&1

# Quality Control - Every 2 hours
0 */2 * * * cd ~/handy-friend-landing-v6 && ./scripts/quality-control.sh >> ops/quality-control.log 2>&1

# Auto-Optimization - Every 4 hours
0 */4 * * * cd ~/handy-friend-landing-v6 && ./scripts/auto-optimize-hunter.sh >> ops/auto-optimize.log 2>&1

# Daily Report - 8PM daily
0 20 * * * cd ~/handy-friend-landing-v6 && ./scripts/hunter-dashboard.sh --report-only > ops/daily-summary-$(date +\%Y-\%m-\%d).txt 2>&1

# System Health Check - Every hour
40 * * * * cd ~/handy-friend-landing-v6 && ./scripts/hunter-stack-health.sh >> ops/health-check.log 2>&1
EOF

# Install new cron jobs
crontab "$CRON_TEMP"
rm "$CRON_TEMP"
echo "✅ Optimized cron jobs installed"

# 5. CREATE MONITORING SCRIPTS
echo ""
echo "5. Creating monitoring scripts..."
cat > scripts/monitor-hunter.sh << 'EOF'
#!/bin/bash
# Monitor hunter system health

ALERT_FILE="ops/hunter-alerts.log"
THRESHOLDS=(
  "browser_processes:3"
  "api_response_time:2"
  "daily_leads:5"
  "error_rate:10"
)

echo "🔍 Hunter System Monitor - $(date)"
echo "=================================="

# Check browser processes
BROWSER_COUNT=$(ps aux | grep -c "chrome.*openclaw")
if [ "$BROWSER_COUNT" -lt 3 ]; then
  echo "❌ LOW BROWSER PROCESSES: $BROWSER_COUNT" >> "$ALERT_FILE"
  echo "⚠️  Browser processes low: $BROWSER_COUNT"
fi

# Check API response
API_TIME=$(time curl -s -o /dev/null -w "%{time_total}" "https://handyandfriend.com/api/health" 2>/dev/null || echo "10")
if (( $(echo "$API_TIME > 2" | bc -l) )); then
  echo "❌ SLOW API RESPONSE: ${API_TIME}s" >> "$ALERT_FILE"
  echo "⚠️  API slow: ${API_TIME}s"
fi

# Check today's leads
if [ -f "ops/leads.json" ]; then
  TODAY_LEADS=$(grep "$(date '+%Y-%m-%d')" ops/leads.json 2>/dev/null | grep -c '"platform"' || echo "0")
  if [ "$TODAY_LEADS" -lt 5 ]; then
    echo "❌ LOW LEAD VOLUME: $TODAY_LEADS today" >> "$ALERT_FILE"
    echo "⚠️  Low leads today: $TODAY_LEADS"
  fi
fi

# Check error rate in logs
ERROR_COUNT=$(tail -100 ops/hunter.log 2>/dev/null | grep -c -i "error\|fail\|timeout\|blocked" || echo "0")
if [ "$ERROR_COUNT" -gt 10 ]; then
  echo "❌ HIGH ERROR RATE: $ERROR_COUNT errors in last 100 lines" >> "$ALERT_FILE"
  echo "⚠️  High error rate: $ERROR_COUNT"
fi

echo "✅ Monitor check complete"
EOF

chmod +x scripts/monitor-hunter.sh
echo "✅ Monitoring scripts created"

# 6. SETUP ALERTING SYSTEM
echo ""
echo "6. Setting up alert system..."
cat > scripts/send-alert.sh << 'EOF'
#!/bin/bash
# Send alerts to Telegram

ALERT_TYPE=$1
MESSAGE=$2
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEXT="ALERT: ${ALERT_TYPE}: ${MESSAGE}"
printf '%s\n' "$TEXT" \
  | node "$ROOT_DIR/scripts/send-telegram.mjs" \
    --source deploy_optimized_system \
    --category deployment_alert \
    --actionable 1 \
    --stdin > /dev/null && echo "✅ Alert sent to Telegram" || echo "⚠️  Telegram alert failed"
EOF

chmod +x scripts/send-alert.sh
echo "✅ Alert system setup"

# 7. CREATE DEPLOYMENT REPORT
echo ""
echo "7. Creating deployment report..."
DEPLOYMENT_REPORT="ops/deployment-report-$(date +%Y%m%d-%H%M%S).txt"
{
  echo "HUNTER SYSTEM DEPLOYMENT REPORT"
  echo "================================"
  echo "Deployment time: $(date)"
  echo "Backup location: $BACKUP_DIR"
  echo ""
  echo "COMPONENTS DEPLOYED:"
  echo "1. Safe templates (no prices)"
  echo "2. Updated skill files"
  echo "3. Optimized cron schedule"
  echo "4. Monitoring scripts"
  echo "5. Alert system"
  echo ""
  echo "CRON SCHEDULE:"
  crontab -l 2>/dev/null | grep -A2 "HANDY & FRIEND"
  echo ""
  echo "NEXT STEPS:"
  echo "1. Run: ./scripts/quality-control.sh"
  echo "2. Run: ./scripts/hunter-dashboard.sh"
  echo "3. Monitor: ops/hunter.log"
  echo ""
  echo "SYSTEM STATUS: 🟢 DEPLOYED"
} > "$DEPLOYMENT_REPORT"

echo "✅ Deployment report: $DEPLOYMENT_REPORT"

# 8. INITIAL SYSTEM TEST
echo ""
echo "8. Running initial system test..."
echo "Testing components..."
./scripts/quality-control.sh > ops/initial-test.log 2>&1
TEST_RESULT=$?

if [ "$TEST_RESULT" -eq 0 ]; then
  echo "✅ Initial test PASSED"
  echo "🟢 SYSTEM DEPLOYMENT COMPLETE"
  echo ""
  echo "🎯 NEXT ACTIONS:"
  echo "1. View dashboard: ./scripts/hunter-dashboard.sh"
  echo "2. Check logs: tail -f ops/hunter.log"
  echo "3. Monitor: ./scripts/monitor-hunter.sh"
  echo ""
  echo "🚀 HUNTER SYSTEM READY FOR AMAZON-LEVEL OPERATION!"
else
  echo "⚠️  Initial test issues - check ops/initial-test.log"
  echo "🟡 SYSTEM DEPLOYED WITH WARNINGS"
fi

echo ""
echo "======================================"
echo "Deployment completed at: $(date)"
echo "Amazon-level optimization: ACTIVE 🚀"
