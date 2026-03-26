#!/bin/bash
# ============================================================
# PIPELINE — Codex → Claude Code → Human
# Direct automation: task → branch → code → PR → review
#
# Usage:
#   bash pipeline.sh "task description"
#
# What happens:
#   1. Creates feature branch
#   2. Codex writes code (sandbox: workspace-write)
#   3. Commits + pushes + creates PR
#   4. Claude Code reviews the PR
#   5. Prints PASS/FAIL — you decide to merge
# ============================================================

set -e

PROJECT_DIR="$HOME/handy-friend-landing-v6"
cd "$PROJECT_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[PIPELINE]${NC} $1"; }
warn() { echo -e "${YELLOW}[PIPELINE]${NC} $1"; }
err() { echo -e "${RED}[PIPELINE]${NC} $1"; }
step() { echo -e "${CYAN}[STEP $1]${NC} $2"; }

TASK="$1"
if [ -z "$TASK" ]; then
  err "Usage: bash pipeline.sh \"task description\""
  exit 1
fi

# Verify tools exist
command -v codex &>/dev/null || { err "codex CLI not installed"; exit 1; }
command -v claude &>/dev/null || { err "claude CLI not installed"; exit 1; }
command -v gh &>/dev/null || { err "gh CLI not installed"; exit 1; }

# ─── STEP 1: Create branch ───
BRANCH_SLUG=$(echo "$TASK" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | cut -c1-40 | sed 's/-$//')
BRANCH="feature/${BRANCH_SLUG}"

step 1 "Creating branch: $BRANCH"
git checkout main
git pull origin main
git checkout -b "$BRANCH"

# ─── STEP 2: Codex writes code ───
step 2 "Codex executing task..."
echo ""
log "Task: $TASK"
echo ""

# Run Codex with workspace-write sandbox, auto-approval
# Codex reads AGENTS.md automatically from repo root
codex exec \
  -s workspace-write \
  -a never \
  -C "$PROJECT_DIR" \
  "You are working on branch '$BRANCH' in repo handy-friend-landing-v6.
Read AGENTS.md first — follow all rules.

TASK: $TASK

RULES:
- Only modify files needed for the task
- No new dependencies
- No hardcoded prices (use price-registry.js)
- No secrets in code
- Mobile-first
- Do NOT run git commands — I will handle git
- Do NOT create PRs — I will handle that" 2>&1 | tee /tmp/codex-output.txt

# ─── STEP 3: Check if anything changed ───
CHANGED=$(git diff --name-only && git ls-files --others --exclude-standard)
if [ -z "$CHANGED" ]; then
  warn "Codex made no changes. Cleaning up branch."
  git checkout main
  git branch -D "$BRANCH"
  exit 0
fi

step 3 "Changes detected:"
git diff --stat
git ls-files --others --exclude-standard

# ─── STEP 4: Commit + Push + PR ───
step 4 "Committing and creating PR..."
git add -A
git commit -m "feat: $TASK

Automated via pipeline.sh → Codex exec
Branch: $BRANCH"

git push origin "$BRANCH"

PR_URL=$(gh pr create \
  --title "feat: $TASK" \
  --body "$(cat <<PRBODY
## What changed
Codex automated task: $TASK

## Codex output
See pipeline execution log.

## Definition of Done
- [ ] No prices hardcoded outside \`lib/price-registry.js\`
- [ ] No new dependencies or frameworks added
- [ ] No secrets, API keys, or tokens in code
- [ ] No \`console.log\` in production files
- [ ] Mobile responsive (tested at 375px)
- [ ] Contact info matches verified: (213) 361-1700
- [ ] Browser price registry rebuilt if needed
PRBODY
)" \
  --base main \
  --head "$BRANCH" 2>&1)

log "PR created: $PR_URL"

# ─── STEP 5: Claude Code reviews ───
step 5 "Claude Code reviewing PR..."
echo ""

PR_NUM=$(echo "$PR_URL" | grep -o '[0-9]*$')

REVIEW=$(claude -p "Review PR #$PR_NUM on branch $BRANCH in this repo.

Run: git diff main..$BRANCH

Check against AGENTS.md rules:
- [ ] No prices hardcoded outside price-registry.js
- [ ] No new dependencies or frameworks
- [ ] No secrets/keys in code
- [ ] No console.log in production files
- [ ] Mobile-first maintained
- [ ] Contact: only (213) 361-1700, handyandfriend.com
- [ ] Files under 300 lines

Output: PASS or CHANGES_REQUESTED with issues list." 2>&1)

echo ""
echo "$REVIEW"
echo ""

# ─── STEP 6: Summary ───
echo "============================================"
log "Pipeline complete"
log "Branch:  $BRANCH"
log "PR:      $PR_URL"
log "Review:  see above"
echo ""
log "Next: if PASS → merge PR manually"
log "  gh pr merge $PR_NUM --squash"
echo "============================================"

# Return to main
git checkout main
