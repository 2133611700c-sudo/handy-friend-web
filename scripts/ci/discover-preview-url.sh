#!/usr/bin/env bash
# Task 1.7: Discover the Vercel preview deployment URL for the current SHA.
#
# In GH Actions pull_request runs, Vercel posts a commit status (context
# "Vercel – <project>") whose target_url points at the preview build.  This
# script polls that status for up to $MAX_WAIT_SEC and prints the URL on
# success, or exits non-zero with no output if it cannot discover a URL.
#
# Non-blocking by design: the caller should treat a non-zero exit as
# "fall back to prod audit" — we never want CI to fail solely because
# preview-URL discovery hit a race with Vercel.
#
# Required env:
#   GITHUB_REPOSITORY (e.g. owner/repo)     — provided by GH Actions
#   GITHUB_SHA        (current commit sha)  — provided by GH Actions
#   GH_TOKEN or GITHUB_TOKEN                — for `gh api` auth
#
# Optional env:
#   MAX_WAIT_SEC   — total poll budget in seconds (default 120)
#   POLL_INTERVAL  — seconds between polls      (default 5)
#   PROJECT_HINT   — substring of the Vercel project slug to match
#                    (default: canonical project from vercel-project-guard)

set -uo pipefail

MAX_WAIT_SEC="${MAX_WAIT_SEC:-120}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"
PROJECT_HINT="${PROJECT_HINT:-handy-friend-landing-v6}"

if [[ -z "${GITHUB_REPOSITORY:-}" || -z "${GITHUB_SHA:-}" ]]; then
  echo "[discover-preview-url] missing GITHUB_REPOSITORY or GITHUB_SHA" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "[discover-preview-url] gh CLI not available" >&2
  exit 2
fi

deadline=$(( $(date +%s) + MAX_WAIT_SEC ))

while :; do
  now=$(date +%s)
  if (( now >= deadline )); then
    echo "[discover-preview-url] timeout after ${MAX_WAIT_SEC}s with no preview URL" >&2
    exit 1
  fi

  # /repos/{owner}/{repo}/commits/{sha}/status aggregates commit statuses.
  # Vercel publishes one per linked project. We pick a SUCCESS state whose
  # context name contains "Vercel" and whose target_url is on vercel.com —
  # preferring the one whose project slug matches PROJECT_HINT.
  json=$(gh api "repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/status" 2>/dev/null || echo '{}')

  url=$(printf '%s' "$json" | python3 - "$PROJECT_HINT" <<'PY'
import json, sys
hint = sys.argv[1]
try:
    data = json.loads(sys.stdin.read() or '{}')
except Exception:
    sys.exit(0)
statuses = data.get('statuses') or []
vercel = [
    s for s in statuses
    if s.get('state') == 'success'
    and 'Vercel' in (s.get('context') or '')
    and 'vercel.com' not in (s.get('target_url') or '')
    and (s.get('target_url') or '').startswith('https://')
]
# Prefer statuses whose target_url host matches the project hint.
preferred = [s for s in vercel if hint and hint in (s.get('target_url') or '')]
pick = preferred[0] if preferred else (vercel[0] if vercel else None)
if pick:
    print(pick.get('target_url') or '')
PY
)

  # target_url from Vercel status can be either the preview URL directly
  # (https://<project>-<hash>.vercel.app) or the inspect page on vercel.com.
  # We filter out vercel.com above so we only keep preview URLs.
  if [[ -n "$url" && "$url" == https://*.vercel.app* ]]; then
    # Strip any path/query — audit.sh expects origin only.
    origin=$(printf '%s' "$url" | awk -F/ '{print $1"//"$3}')
    printf '%s' "$origin"
    exit 0
  fi

  sleep "$POLL_INTERVAL"
done
