#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
REPORT_DIR="ops/reports"
DATE_PT="$(TZ=America/Los_Angeles date +%F)"
REPORT_PATH="${REPORT_DIR}/migration-drift-${DATE_PT}.md"

mkdir -p "$REPORT_DIR"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI is required" >&2
  exit 2
fi

if [[ -n "$PROJECT_REF" && -n "$DB_PASSWORD" ]]; then
  supabase link --project-ref "$PROJECT_REF" --password "$DB_PASSWORD" >/dev/null
fi

RAW="$(supabase migration list 2>&1 || true)"

# Parse rows like: 202603... | 202603... | timestamp
PARSED="$(printf '%s\n' "$RAW" | awk -F'|' '
  /[0-9]{14}/ {
    l=$1; r=$2;
    gsub(/^[ \t]+|[ \t]+$/, "", l);
    gsub(/^[ \t]+|[ \t]+$/, "", r);
    if (l ~ /^[0-9]{14}$/ || r ~ /^[0-9]{14}$/) print l "|" r;
  }
')"

LOCAL_ONLY=0
REMOTE_ONLY=0
MISMATCH=0
ROWS=0

while IFS='|' read -r L R; do
  [[ -z "${L}${R}" ]] && continue
  ROWS=$((ROWS+1))
  if [[ -n "$L" && -z "$R" ]]; then
    LOCAL_ONLY=$((LOCAL_ONLY+1))
  elif [[ -z "$L" && -n "$R" ]]; then
    REMOTE_ONLY=$((REMOTE_ONLY+1))
  elif [[ -n "$L" && -n "$R" && "$L" != "$R" ]]; then
    MISMATCH=$((MISMATCH+1))
  fi
done <<< "$PARSED"

{
  echo "# Migration Drift Report — ${DATE_PT}"
  echo
  echo "- Rows parsed: **${ROWS}**"
  echo "- Local-only: **${LOCAL_ONLY}**"
  echo "- Remote-only: **${REMOTE_ONLY}**"
  echo "- Mismatch rows: **${MISMATCH}**"
  echo
  echo "## Raw output"
  echo '```text'
  echo "$RAW"
  echo '```'
} > "$REPORT_PATH"

echo "Migration drift report written: $REPORT_PATH"

if [[ "$ROWS" -eq 0 ]]; then
  echo "No migration rows parsed; treat as failure" >&2
  exit 1
fi

if [[ "$LOCAL_ONLY" -gt 0 || "$REMOTE_ONLY" -gt 0 || "$MISMATCH" -gt 0 ]]; then
  echo "Migration drift detected" >&2
  exit 1
fi

echo "No migration drift detected"
