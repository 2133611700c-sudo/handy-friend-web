#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-2133611700c-sudo/handy-friend-web}"
REF="${REF:-main}"
OUT_DIR="${OUT_DIR:-ops/reports/final-verification/$(date -u +%Y%m%dT%H%M%SZ)}"

mkdir -p "$OUT_DIR"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI 'gh' is required." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "ERROR: GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if command -v curl >/dev/null 2>&1; then
  echo "== Live health ==" | tee "$OUT_DIR/_summary.txt"
  curl -fsS https://handyandfriend.com/api/health | tee "$OUT_DIR/health.json" | tee -a "$OUT_DIR/_summary.txt" >/dev/null
  echo "" | tee -a "$OUT_DIR/_summary.txt"
fi

if [ -n "${SUPABASE_DATABASE_URL:-}" ]; then
  echo "== Set SUPABASE_DATABASE_URL secret ==" | tee -a "$OUT_DIR/_summary.txt"
  printf "%s" "$SUPABASE_DATABASE_URL" | gh secret set SUPABASE_DATABASE_URL --repo "$REPO"
else
  echo "WARN: SUPABASE_DATABASE_URL env var is not set. SQL workflow may fail if the secret is missing." | tee -a "$OUT_DIR/_summary.txt"
fi

run_and_watch() {
  local workflow_file="$1"
  local workflow_name="$2"
  echo "== Trigger ${workflow_name} ==" | tee -a "$OUT_DIR/_summary.txt"
  gh workflow run "$workflow_file" --repo "$REPO" --ref "$REF"
  sleep 8

  local run_id
  run_id="$(gh run list --repo "$REPO" --workflow "$workflow_file" --limit 1 --json databaseId --jq '.[0].databaseId')"
  echo "Run id for ${workflow_name}: ${run_id}" | tee -a "$OUT_DIR/_summary.txt"

  gh run watch "$run_id" --repo "$REPO" || true
  gh run view "$run_id" --repo "$REPO" --log > "$OUT_DIR/${workflow_file}.log" 2>&1 || true
  gh run view "$run_id" --repo "$REPO" --json conclusion,status,url > "$OUT_DIR/${workflow_file}.json" 2>&1 || true

  echo "Saved ${workflow_name} output to $OUT_DIR" | tee -a "$OUT_DIR/_summary.txt"
}

run_and_watch "alex-smoke.yml" "Alex Smoke"
run_and_watch "supabase-sql-reports.yml" "Supabase SQL Reports"

echo "== Download artifacts if present ==" | tee -a "$OUT_DIR/_summary.txt"
(
  cd "$OUT_DIR"
  gh run download --repo "$REPO" --name supabase-sql-reports || true
)

echo "== Latest runs ==" | tee -a "$OUT_DIR/_summary.txt"
gh run list --repo "$REPO" --limit 10 | tee -a "$OUT_DIR/_summary.txt"

echo "DONE. Final verification outputs are in: $OUT_DIR" | tee -a "$OUT_DIR/_summary.txt"
