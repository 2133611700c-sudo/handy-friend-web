#!/bin/bash
# REAL-TIME HUNTER DASHBOARD
# Amazon-level monitoring

clear
echo "🛠️  HANDY & FRIEND HUNTER DASHBOARD"
echo "=========================================="
echo "Last update: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

while true; do
  # SECTION 1: SYSTEM STATUS
  echo "📊 SYSTEM STATUS"
  echo "----------------"
  
  # Hunter processes
  HUNTER_PROCS=$(ps aux | grep -c "openclaw.*hunter\|openclaw.*agent.*hunter")
  echo "Hunter processes: $HUNTER_PROCS"
  
  # Browser status
  CHROME_PROCS=$(ps aux | grep -c "chrome.*openclaw")
  echo "Browser processes: $CHROME_PROCS"
  
  # API health
  API_STATUS=$(curl -s "https://handyandfriend.com/api/health" | grep -o '"ok":true' 2>/dev/null || echo "❌")
  if [ "$API_STATUS" = '"ok":true' ]; then
    echo "API: ✅ Healthy"
  else
    echo "API: ❌ Issues"
  fi
  
  # SECTION 2: TODAY'S PERFORMANCE
  echo ""
  echo "🎯 TODAY'S PERFORMANCE ($(date '+%Y-%m-%d'))"
  echo "--------------------------------"
  
  if [ -f "ops/leads.json" ]; then
    TODAY_LEADS=$(grep "$(date '+%Y-%m-%d')" ops/leads.json 2>/dev/null | grep -c '"platform"' || echo "0")
    TODAY_RESPONSES=$(grep "$(date '+%Y-%m-%d')" ops/leads.json 2>/dev/null | grep -c '"our_response"' || echo "0")
    
    echo "Leads found: $TODAY_LEADS"
    echo "Responses sent: $TODAY_RESPONSES"
    
    if [ "$TODAY_LEADS" -gt 0 ]; then
      CONVERSION=$((TODAY_RESPONSES * 100 / TODAY_LEADS))
      echo "Conversion rate: $CONVERSION%"
    else
      echo "Conversion rate: 0%"
    fi
  else
    echo "No data yet today"
  fi
  
  # SECTION 3: LAST ACTIVITY
  echo ""
  echo "⏰ LAST ACTIVITY"
  echo "----------------"
  
  LAST_LOG=$(tail -3 ops/hunter.log 2>/dev/null | grep -v "^$" | tail -1)
  if [ -n "$LAST_LOG" ]; then
    # Extract timestamp and message
    TIMESTAMP=$(echo "$LAST_LOG" | grep -o '\[[^]]*\]' | head -1 || echo "")
    MESSAGE=$(echo "$LAST_LOG" | sed 's/.*\]//' | cut -c1-60)
    echo "$TIMESTAMP"
    echo "$MESSAGE..."
  else
    echo "No recent activity"
  fi
  
  # SECTION 4: SERVICE DISTRIBUTION
  echo ""
  echo "🔧 SERVICE DISTRIBUTION (Today)"
  echo "--------------------------------"
  
  if [ -f "ops/leads.json" ] && [ "$TODAY_LEADS" -gt 0 ]; then
    grep "$(date '+%Y-%m-%d')" ops/leads.json 2>/dev/null | grep -o '"service_detected":"[^"]*"' | sort | uniq -c | sort -rn | while read line; do
      COUNT=$(echo "$line" | awk '{print $1}')
      SERVICE=$(echo "$line" | awk -F'"' '{print $4}')
      PERCENT=$((COUNT * 100 / TODAY_LEADS))
      BAR=$(printf "%${PERCENT}s" | tr ' ' '█')
      printf "%-20s %2d%% %s\n" "$SERVICE:" "$PERCENT" "$BAR"
    done
  else
    echo "No service data yet"
  fi
  
  # SECTION 5: PLATFORM PERFORMANCE
  echo ""
  echo "📱 PLATFORM PERFORMANCE"
  echo "-----------------------"
  
  if [ -f "ops/leads.json" ] && [ "$TODAY_LEADS" -gt 0 ]; then
    grep "$(date '+%Y-%m-%d')" ops/leads.json 2>/dev/null | grep -o '"platform":"[^"]*"' | sort | uniq -c | while read line; do
      COUNT=$(echo "$line" | awk '{print $1}')
      PLATFORM=$(echo "$line" | awk -F'"' '{print $4}')
      PERCENT=$((COUNT * 100 / TODAY_LEADS))
      echo "$PLATFORM: $COUNT leads ($PERCENT%)"
    done
  else
    echo "Nextdoor: 0 leads"
    echo "Facebook: 0 leads"
  fi
  
  # SECTION 6: RECOMMENDATIONS
  echo ""
  echo "💡 RECOMMENDATIONS"
  echo "------------------"
  
  CURRENT_HOUR=$(date +%H)
  if [[ "09 10 11 12 13 14 15 16 17 18" =~ $CURRENT_HOUR ]]; then
    echo "✅ Peak hours - optimal scanning"
  else
    echo "⚠️  Off-peak hours - reduced frequency"
  fi
  
  if [ "${TODAY_LEADS:-0}" -lt 5 ]; then
    echo "⚠️  Low lead volume - consider expanding keywords"
  fi
  
  if [ "${CHROME_PROCS:-0}" -lt 3 ]; then
    echo "⚠️  Browser processes low - may need restart"
  fi
  
  # SECTION 7: QUICK ACTIONS
  echo ""
  echo "⚡ QUICK ACTIONS"
  echo "----------------"
  echo "1. Manual scan   2. Check logs   3. Restart   4. Exit"
  echo ""
  echo -n "Select action (1-4) or Enter to refresh: "
  read -t 10 -n 1 action
  echo ""
  
  case $action in
    1)
      echo "🚀 Starting manual scan..."
      /opt/homebrew/bin/openclaw agent --agent main --message 'Run nextdoor-hunter skill.' >> ops/hunter.log 2>&1 &
      sleep 2
      ;;
    2)
      echo "📋 Last 5 log entries:"
      tail -5 ops/hunter.log 2>/dev/null || echo "No log file"
      echo ""
      echo -n "Press Enter to continue..."
      read
      ;;
    3)
      echo "🔄 Restarting hunter system..."
      pkill -f "openclaw.*hunter" 2>/dev/null || true
      sleep 2
      /opt/homebrew/bin/openclaw agent --agent main --message 'Run nextdoor-hunter skill.' >> ops/hunter.log 2>/dev/null &
      echo "✅ Restarted"
      sleep 2
      ;;
    4)
      echo "👋 Exiting dashboard..."
      exit 0
      ;;
    "")
      # Refresh
      clear
      echo "🛠️  HANDY & FRIEND HUNTER DASHBOARD"
      echo "=========================================="
      echo "Last update: $(date '+%Y-%m-%d %H:%M:%S')"
      echo ""
      continue
      ;;
    *)
      echo "❌ Invalid option"
      sleep 1
      ;;
  esac
  
  # Clear and refresh every 30 seconds
  sleep 30
  clear
  echo "🛠️  HANDY & FRIEND HUNTER DASHBOARD"
  echo "=========================================="
  echo "Last update: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
done