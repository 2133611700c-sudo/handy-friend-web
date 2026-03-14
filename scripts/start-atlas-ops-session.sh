#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ATLAS_APP="ChatGPT Atlas"
stamp="$(date +%Y-%m-%d)"
time_pt="$(TZ=America/Los_Angeles date '+%Y-%m-%d %H:%M:%S %Z')"
run_ts="$(date +%Y%m%d-%H%M%S)"
snapshot_md="ops/snapshots/${stamp}-session-start.md"
run_log="ops/snapshots/${stamp}-atlas-session-${run_ts}.log"
shot_png="ops/snapshots/${stamp}-atlas-session-${run_ts}.png"

mkdir -p ops/snapshots
touch "$run_log"

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*" | tee -a "$run_log" >/dev/null
}

urls=(
  "https://github.com/2133611700c-sudo/handy-friend-web"
  "https://handyandfriend.com/?lang=en"
  "https://supabase.com/dashboard/project/taqlarevwifgfnjxilfh"
  "https://vercel.com/dashboard"
  "https://analytics.google.com"
  "https://ads.google.com"
)

log "Launching apps"
open -a "$ATLAS_APP" || true
open -a "ChatGPT" || true
open -a "Codex" || true
sleep 0.4

count_open=0
count_failed=0
status_lines=()

for url in "${urls[@]}"; do
  # Run in background to avoid occasional blocking on specific URLs.
  if (open -a "$ATLAS_APP" "$url" >/dev/null 2>&1 &) ; then
    count_open=$((count_open + 1))
    status_lines+=("  - [OPEN_QUEUED] $url")
    log "Queued open in Atlas: $url"
  else
    count_failed=$((count_failed + 1))
    status_lines+=("  - [FAILED_QUEUE] $url")
    log "Failed to queue open in Atlas: $url"
  fi
  sleep 0.15
done

# Bring Atlas to front without System Events automation (more stable).
open -a "$ATLAS_APP" >/dev/null 2>&1 || true
frontmost_process="not-verified (System Events check disabled for stability)"
log "Atlas re-activated via open -a (frontmost check disabled)"

# Capture screenshot evidence (best-effort)
if command -v screencapture >/dev/null 2>&1; then
  if screencapture -x "$shot_png" >/dev/null 2>&1; then
    log "Screenshot captured: $shot_png"
  else
    log "Screenshot capture failed"
    shot_png=""
  fi
else
  log "screencapture command not found"
  shot_png=""
fi

{
  echo "# Session Start Snapshot"
  echo
  echo "- Time (PT): $time_pt"
  echo "- Repo: $REPO_ROOT"
  echo "- Branch: $(git branch --show-current)"
  echo "- Remote: $(git remote get-url origin)"
  echo "- Atlas launch: attempted"
  echo "- ChatGPT launch: attempted"
  echo "- Codex launch: attempted"
  echo "- Frontmost process at end: $frontmost_process"
  echo "- Atlas URL open summary: open=$count_open, failed=$count_failed"
  echo "- Run log: $run_log"
  if [[ -n "${shot_png:-}" ]]; then
    echo "- Screenshot: $shot_png"
  fi
  echo "- URL open details:"
  printf '%s\n' "${status_lines[@]}"
} > "$snapshot_md"

echo "Session initialized. Snapshot: $snapshot_md"
echo "Atlas URL open summary: open=$count_open failed=$count_failed"
echo "Run log: $run_log"
if [[ -n "${shot_png:-}" ]]; then
  echo "Screenshot: $shot_png"
fi
