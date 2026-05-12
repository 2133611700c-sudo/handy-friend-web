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

if [ -n "${SUPABASE_DATABASE_URL:-}" ]; then
  echo "Setting GitHub repository secret SUPABASE_DATABASE_URL"
  printf "%s" "$SUPABASE_DATABASE_URL" | gh secret set SUPABASE_DATABASE_URL --repo "$REPO"
else
  echo "WARN: SUPABASE_DATABASE_URL env var is not set. Supabase SQL Reports may fail until the secret is configured." >&2
fi

echo "Triggering Alex Smoke workflow"
gh workflow run alex-smoke.yml --repo "$REPO" --ref "$REF"

echo "Triggering Supabase SQL Reports workflow"
gh workflow run supabase-sql-reports.yml --repo "$REPO" --ref "$REF"

echo "Latest workflow runs"
gh run list --repo "$REPO" --limit 10

echo "Next: watch runs with: gh run watch --repo $REPO"
