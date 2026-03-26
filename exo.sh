#!/bin/bash

# ============================================================
# AI EXOSKELETON — Mac Native Automation
# Handy & Friend Command Center
#
# Usage:
#   bash exo.sh setup          — первый запуск, расставить окна
#   bash exo.sh code "задача"  — отправить задачу в Codex CLI
#   bash exo.sh review         — Claude Code ревью текущего PR
#   bash exo.sh research "тема" — открыть Gemini с промптом
#   bash exo.sh post "текст"   — подготовить пост через OpenClaw
#   bash exo.sh status         — статус всех инструментов
#   bash exo.sh morning        — утренний запуск всего
# ============================================================

PROJECT_DIR="$HOME/handy-friend-landing-v6"
OPENCLAW_CMD="/opt/homebrew/bin/openclaw"
CODEX_LAST_OUTPUT_FILE="logs/codex-last-output.txt"

# Fallback to script directory when project was moved
if [ ! -d "$PROJECT_DIR" ]; then
  PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[EXO]${NC} $1"; }
warn() { echo -e "${YELLOW}[EXO]${NC} $1"; }
err() { echo -e "${RED}[EXO]${NC} $1"; }

# ─── SETUP ───
cmd_setup() {
  log "Launching workspace..."
  open -a "Codex" "$PROJECT_DIR" 2>/dev/null && log "Codex ✓" || warn "Codex not found"
  open -a "Claude Code" 2>/dev/null && log "Claude Code ✓" || warn "Claude Code not found"
  osascript <<'APPLESCRIPT'
tell application "Google Chrome"
  activate
  make new window
  set URL of active tab of front window to "https://claude.ai/new"
  tell front window to make new tab
  set URL of active tab of front window to "https://chatgpt.com"
  tell front window to make new tab
  set URL of active tab of front window to "https://gemini.google.com"
end tell
APPLESCRIPT
  osascript -e "tell application \"Terminal\" to do script \"cd $PROJECT_DIR && git status\""
  log "All tools launched"
}

# ─── MORNING ───
cmd_morning() {
  log "Morning startup..."
  cd "$PROJECT_DIR" || { err "Project dir not found"; exit 1; }
  echo ""
  log "Git:" && git status --short
  echo ""
  log "Tasks:" && grep -A 20 "## Active" ops/TASKS.md 2>/dev/null || warn "No TASKS.md"
  echo ""
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://handyandfriend.com)
  [ "$HTTP_CODE" = "200" ] && log "Site: ${GREEN}200 OK${NC}" || err "Site: ${RED}$HTTP_CODE${NC}"
  echo ""
  cmd_setup
}

# ─── CODE: Codex task ───
cmd_code() {
  local task="$*"
  [ -z "$task" ] && { err "Usage: bash exo.sh code \"task description\""; exit 1; }
  cd "$PROJECT_DIR" || exit 1
  mkdir -p logs
  if command -v codex &>/dev/null; then
    log "Sending to Codex CLI..."
    if codex exec --help &>/dev/null; then
      codex exec -C "$PROJECT_DIR" --output-last-message "$CODEX_LAST_OUTPUT_FILE" "$task"
      log "Codex response saved to $PROJECT_DIR/$CODEX_LAST_OUTPUT_FILE"
    else
      warn "codex exec unavailable, using interactive fallback"
      codex "$task"
    fi
  else
    echo "$task" | pbcopy
    open -a "Codex" "$PROJECT_DIR"
    log "Task copied to clipboard. Cmd+V in Codex app"
  fi
}

# ─── REVIEW: Claude Code ───
cmd_review() {
  cd "$PROJECT_DIR" || exit 1
  BRANCH=$(git branch --show-current)
  log "Branch: $BRANCH"
  if command -v claude &>/dev/null; then
    log "Claude Code reviewing..."
    claude "Review branch $BRANCH vs main. Check: no hardcoded prices, no new deps, no secrets, mobile-first, correct contacts. PASS/FAIL + issues."
  else
    git diff main..HEAD --stat 2>/dev/null || git log --oneline -5
    open -a "Claude Code"
    log "Diff shown above. Claude Code opened — paste review request."
  fi
}

# ─── RESEARCH: Gemini ───
cmd_research() {
  [ -z "$1" ] && { err "Usage: bash exo.sh research \"topic\""; exit 1; }
  PROMPT="Research Agent for Handy & Friend (handyman, LA). Research: $1. Cite sources. Separate FACTS from ESTIMATES."
  open "https://gemini.google.com"
  echo "$PROMPT" | pbcopy
  log "Gemini opened. Research prompt copied to clipboard. Cmd+V"
}

# ─── POST: marketing draft ───
cmd_post() {
  [ -z "$1" ] && { err "Usage: bash exo.sh post \"topic\""; exit 1; }
  DRAFT="Draft Nextdoor post for Handy & Friend (handyman LA). Topic: $1. Phone: (213) 361-1700. Site: handyandfriend.com. DRAFT ONLY — do NOT publish."
  if [ -x "$OPENCLAW_CMD" ]; then
    log "Sending to OpenClaw..."
    $OPENCLAW_CMD agent --message "$DRAFT" 2>/dev/null || { echo "$DRAFT" | pbcopy; warn "OpenClaw failed. Prompt copied to clipboard."; }
  else
    echo "$DRAFT" | pbcopy
    log "Prompt copied to clipboard. Paste in OpenClaw or ChatGPT."
  fi
}

# ─── STATUS ───
cmd_status() {
  log "Status check..."
  echo ""
  cd "$PROJECT_DIR" 2>/dev/null && echo -e "  Repo:         ${GREEN}OK${NC} ($(git branch --show-current))" || echo -e "  Repo:         ${RED}NOT FOUND${NC}"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" https://handyandfriend.com 2>/dev/null)
  [ "$HTTP" = "200" ] && echo -e "  Site:         ${GREEN}200 OK${NC}" || echo -e "  Site:         ${RED}$HTTP${NC}"
  pgrep -q "Codex" && echo -e "  Codex app:    ${GREEN}RUNNING${NC}" || echo -e "  Codex app:    ${YELLOW}STOPPED${NC}"
  command -v codex &>/dev/null && echo -e "  Codex CLI:    ${GREEN}OK${NC}" || echo -e "  Codex CLI:    ${YELLOW}N/A${NC}"
  command -v claude &>/dev/null && echo -e "  Claude CLI:   ${GREEN}OK${NC}" || echo -e "  Claude CLI:   ${YELLOW}N/A${NC}"
  [ -x "$OPENCLAW_CMD" ] && echo -e "  OpenClaw:     ${GREEN}OK${NC}" || echo -e "  OpenClaw:     ${YELLOW}N/A${NC}"
  [ -f "$PROJECT_DIR/AGENTS.md" ] && echo -e "  AGENTS.md:    ${GREEN}OK${NC}" || echo -e "  AGENTS.md:    ${RED}MISSING${NC}"
  [ -f "$PROJECT_DIR/ops/TASKS.md" ] && echo -e "  TASKS.md:     ${GREEN}OK${NC}" || echo -e "  TASKS.md:     ${RED}MISSING${NC}"
  echo ""
}

# ─── QUICK ───
cmd_quick() {
  cd "$PROJECT_DIR" 2>/dev/null
  case "$1" in
    tasks)     cat ops/TASKS.md 2>/dev/null ;;
    decisions) cat ops/DECISIONS.md 2>/dev/null ;;
    diff)      git diff --stat ;;
    pr)        BRANCH=$(git branch --show-current); gh pr create --fill --base main --head "$BRANCH" ;;
    deploy)    err "Blocked by policy: direct push to main is forbidden. Use PR + approved deploy flow." ;;
    site)      open "https://handyandfriend.com" ;;
    *)         echo "Options: tasks | decisions | diff | pr | deploy | site" ;;
  esac
}

# ─── ROUTER ───
case "${1:-help}" in
  setup)    cmd_setup ;;
  morning)  cmd_morning ;;
  code)     cmd_code "${@:2}" ;;
  review)   cmd_review ;;
  research) cmd_research "$2" ;;
  post)     cmd_post "$2" ;;
  status)   cmd_status ;;
  quick)    cmd_quick "$2" ;;
  *)
    echo ""
    echo "  AI EXOSKELETON v1.0"
    echo ""
    echo "  bash exo.sh morning              утренний запуск"
    echo "  bash exo.sh setup                открыть все инструменты"
    echo "  bash exo.sh status               проверить что работает"
    echo "  bash exo.sh code \"задача\"        Codex"
    echo "  bash exo.sh review               Claude Code ревью"
    echo "  bash exo.sh research \"тема\"      Gemini"
    echo "  bash exo.sh post \"тема\"          OpenClaw драфт"
    echo "  bash exo.sh quick tasks          показать задачи"
    echo "  bash exo.sh quick decisions      показать решения"
    echo "  bash exo.sh quick diff           git diff"
    echo "  bash exo.sh quick pr             create PR from current branch"
    echo "  bash exo.sh quick deploy         blocked (use PR + approved deploy)"
    echo "  bash exo.sh quick site           открыть сайт"
    echo ""
    ;;
esac
