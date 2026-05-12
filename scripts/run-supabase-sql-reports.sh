#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required to run Supabase SQL reports." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is required. Use a secure server-side/admin connection string." >&2
  exit 1
fi

case "$DATABASE_URL" in
  postgres://*|postgresql://*) ;;
  *)
    echo "ERROR: DATABASE_URL must start with postgres:// or postgresql://. Current value is not a PostgreSQL connection URL." >&2
    exit 1
    ;;
esac

OUT_DIR="${OUT_DIR:-ops/reports/sql/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$OUT_DIR"

REPORTS=(
  "ops/sql/lead-engine-full-health-report.sql"
  "ops/sql/stale-leads-sla.sql"
  "ops/sql/telegram-proof-gap-report.sql"
  "ops/sql/source-attribution-gap-report.sql"
  "ops/sql/duplicate-leads-dedupe-report.sql"
  "ops/sql/paid-lead-escalation-report.sql"
  "ops/sql/follow-up-recovery-report.sql"
  "ops/sql/lead-quality-scoring-report.sql"
  "ops/sql/booked-revenue-attribution-report.sql"
  "ops/sql/weekly-ops-digest-report.sql"
  "ops/sql/supabase-rls-audit.sql"
)

echo "SQL report output: $OUT_DIR"

failures=0
missing=0
passed=0

for report in "${REPORTS[@]}"; do
  if [ ! -f "$report" ]; then
    echo "WARN: missing report file: $report" | tee -a "$OUT_DIR/_summary.txt"
    missing=$((missing + 1))
    continue
  fi

  base="$(basename "$report" .sql)"
  out="$OUT_DIR/${base}.txt"
  echo "=== RUN $report ===" | tee -a "$OUT_DIR/_summary.txt"

  if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$report" > "$out" 2>&1; then
    lines="$(wc -l < "$out" | tr -d ' ')"
    echo "PASS $report lines=$lines" | tee -a "$OUT_DIR/_summary.txt"
    passed=$((passed + 1))
  else
    echo "FAIL $report" | tee -a "$OUT_DIR/_summary.txt"
    tail -n 40 "$out" | tee -a "$OUT_DIR/_summary.txt"
    failures=$((failures + 1))
  fi

done

{
  echo "SUMMARY passed=$passed failed=$failures missing=$missing"
  echo "OUTPUT_DIR=$OUT_DIR"
} | tee -a "$OUT_DIR/_summary.txt"

if [ "$failures" -gt 0 ] || [ "$missing" -gt 0 ]; then
  echo "ERROR: SQL report run had failures or missing report files. Attach $OUT_DIR outputs to the related GitHub issue or ops report." >&2
  exit 1
fi

echo "DONE. All SQL reports passed. Attach $OUT_DIR outputs to the related GitHub issue or ops report."
