#!/usr/bin/env bash
set -euo pipefail

EXPECTED_REMOTE_REGEX='2133611700c-sudo/handy-friend-web(\.git)?$'
EXPECTED_PROJECT='handy-friend-landing-v6'
EXPECTED_SCOPE='sergiis-projects-8a97ee0f'

say() { printf '%s\n' "$*"; }
fail() { printf 'BLOCKED: %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || fail 'git is not installed.'
command -v vercel >/dev/null 2>&1 || fail 'vercel CLI is not installed.'

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || true)
[ -n "$repo_root" ] || fail 'Not inside a git repository.'

branch=$(git -C "$repo_root" branch --show-current 2>/dev/null || echo '')
remote=$(git -C "$repo_root" remote get-url origin 2>/dev/null || echo '')

[ -n "$remote" ] || fail 'origin remote is missing.'
[[ "$remote" =~ $EXPECTED_REMOTE_REGEX ]] || fail "Wrong repo remote: $remote"

if [ -n "$branch" ] && [ "$branch" != "main" ]; then
  fail "Wrong branch: $branch (required: main for production operations)."
fi

if [ -d "$repo_root/.vercel" ] && [ -f "$repo_root/.vercel/project.json" ]; then
  project_name=$(python3 - <<'PY' "$repo_root/.vercel/project.json"
import json,sys
p=json.load(open(sys.argv[1]))
print(p.get('projectName',''))
PY
)
  [ "$project_name" = "$EXPECTED_PROJECT" ] || fail "Local .vercel points to '$project_name' (expected '$EXPECTED_PROJECT')."
else
  say 'WARN: .vercel/project.json not found. Relying on git integration checks only.'
fi

vercel project inspect "$EXPECTED_PROJECT" >/dev/null 2>&1 || fail "Expected project '$EXPECTED_PROJECT' not found or no access."

say 'PASS: Vercel preflight checks are green.'
say "repo=$repo_root"
say "branch=${branch:-unknown}"
say "remote=$remote"
say "expected_project=$EXPECTED_PROJECT"
