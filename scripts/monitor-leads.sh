#!/bin/bash

# ============================================================
# LEAD MONITOR — Real-time tracking
# Watch leads as they come in from all channels
# ============================================================

PROJECT_DIR="$HOME/handy-friend-landing-v6"
cd "$PROJECT_DIR" || exit 1

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[MONITOR]${NC} $1"; }
warn() { echo -e "${YELLOW}[MONITOR]${NC} $1"; }
err() { echo -e "${RED}[MONITOR]${NC} $1"; }
info() { echo -e "${BLUE}[MONITOR]${NC} $1"; }

# Clear screen and show header
clear
echo ""
echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║          LEAD MONITOR — Real-time Dashboard               ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to show current stats
show_stats() {
    echo -e "${CYAN}📊 CURRENT STATS${NC}"
    echo "─────────────────────────────────────────────────────────"

    # Run stats command
    bash exo.sh leads stats 2>/dev/null || echo "Stats unavailable"

    echo ""
}

# Function to show recent leads
show_leads() {
    echo -e "${CYAN}📍 RECENT LEADS${NC}"
    echo "─────────────────────────────────────────────────────────"

    bash exo.sh leads list 2>/dev/null || echo "No leads yet"

    echo ""
}

# Function to show health
show_health() {
    echo -e "${CYAN}⚙️  SYSTEM HEALTH${NC}"
    echo "─────────────────────────────────────────────────────────"

    bash exo.sh leads health 2>/dev/null | tail -10

    echo ""
}

# Function to watch logs in real-time
watch_logs() {
    echo -e "${CYAN}📝 LIVE LOGS${NC}"
    echo "─────────────────────────────────────────────────────────"
    echo "Watching: ops/hunter.log (last 20 lines)"
    echo ""

    tail -f ops/hunter.log 2>/dev/null
}

# Main monitoring loop
main_loop() {
    while true; do
        # Clear and refresh
        clear

        echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${MAGENTA}║          LEAD MONITOR — Real-time Dashboard               ║${NC}"
        echo -e "${MAGENTA}║  Updated: $(date '+%Y-%m-%d %H:%M:%S')                              ║${NC}"
        echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""

        show_stats
        show_leads
        show_health

        echo -e "${YELLOW}↻ Refreshing in 30 seconds... (Ctrl+C to exit)${NC}"
        sleep 30
    done
}

# Start monitoring
main_loop
