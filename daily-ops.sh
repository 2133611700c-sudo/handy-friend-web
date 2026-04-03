#!/bin/bash

# ============================================================
# DAILY OPERATIONS — Handy & Friend
# Run every morning at 8:00 AM
# Usage: bash daily-ops.sh [morning|afternoon|evening]
# ============================================================

PROJECT_DIR="$HOME/handy-friend-landing-v6"
cd "$PROJECT_DIR" || { echo "❌ Project dir not found"; exit 1; }

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[OPS]${NC} $1"; }
warn() { echo -e "${YELLOW}[OPS]${NC} $1"; }
err() { echo -e "${RED}[OPS]${NC} $1"; }
info() { echo -e "${BLUE}[OPS]${NC} $1"; }

# ─── MORNING (8am) ───
morning_routine() {
  log "🌅 MORNING STARTUP (8:00 AM)"
  echo ""

  # 1. System status
  log "System status:"
  bash exo.sh status 2>&1 | tail -8
  echo ""

  # 2. Lead hunter health
  log "Lead hunter health:"
  bash exo.sh leads health 2>&1 | tail -10
  echo ""

  # 3. Check for overnight leads
  log "Overnight leads summary:"
  bash exo.sh leads stats 2>&1
  echo ""

  # 4. Check git status
  log "Git status:"
  git status --short | head -5 || log "Clean"
  echo ""

  # 5. Show task for today
  info "TODAY'S TARGETS:"
  echo "  • Nextdoor: 5-7 responses"
  echo "  • Facebook Groups: 2-3 responses"
  echo "  • Check Messenger inquiries"
  echo "  • Log all responses with timestamps"
  echo ""

  log "✅ Morning routine complete. Start Nextdoor/FB scanning."
}

# ─── AFTERNOON (1pm) ───
afternoon_routine() {
  log "☀️  AFTERNOON CHECK (1:00 PM)"
  echo ""

  # 1. Current stats
  log "Current day stats:"
  bash exo.sh leads stats 2>&1 | grep -E "Nextdoor|Facebook|Total"
  echo ""

  # 2. Check hot leads
  log "Recent leads:"
  bash exo.sh leads list 2>&1 | head -10
  echo ""

  # 3. Reminder
  warn "⚠️  Reminder: Keep Nextdoor/FB Groups open for real-time responses"
  echo ""
}

# ─── EVENING (6pm) ───
evening_routine() {
  log "🌆 EVENING WRAP-UP (6:00 PM)"
  echo ""

  # 1. Daily summary
  log "Day's summary:"
  bash exo.sh leads stats 2>&1
  echo ""

  # 2. Check for errors
  log "Recent logs (last 5 errors):"
  tail -50 ops/hunter.log 2>/dev/null | grep -i "error\|fail" | tail -5 || log "No errors"
  echo ""

  # 3. Prep tomorrow
  info "TOMORROW'S PREP:"
  echo "  • Plan 1-2 Craigslist posts"
  echo "  • Review Nextdoor posts from today"
  echo "  • Check Facebook insights"
  echo ""

  log "✅ Evening routine complete."
}

# ─── SHOW HELP ───
show_help() {
  echo ""
  echo "${BLUE}Daily Operations Helper${NC}"
  echo ""
  echo "Usage: bash daily-ops.sh [morning|afternoon|evening]"
  echo ""
  echo "Commands:"
  echo "  bash daily-ops.sh morning    — 8:00 AM startup routine"
  echo "  bash daily-ops.sh afternoon  — 1:00 PM check-in"
  echo "  bash daily-ops.sh evening    — 6:00 PM summary"
  echo ""
  echo "Example:"
  echo "  bash daily-ops.sh morning"
  echo ""
}

# ─── ROUTER ───
case "${1:-help}" in
  morning)   morning_routine ;;
  afternoon) afternoon_routine ;;
  evening)   evening_routine ;;
  *)         show_help ;;
esac
