#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-2133611700c-sudo/handy-friend-web}"
REF="${REF:-main}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI 'gh' is required." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

echo "Repo: $REPO"
echo "Ref:  $REF"

echo "== Trigger Alex Smoke =="
gh workflow run alex-smoke.yml --repo "$REPO" --ref "$REF"

echo "== Trigger Supabase SQL Reports =="
echo "NOTE: this requires repository secret SUPABASE_DATABASE_URL."
gh workflow run supabase-sql-reports.yml --repo "$REPO" --ref "$REF"

echo "== Latest runs =="
gh run list --repo "$REPO" --limit 10

echo "DONE: workflows triggered. Use gh run watch --repo $REPO to watch progress."
