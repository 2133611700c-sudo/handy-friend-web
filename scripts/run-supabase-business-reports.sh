#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_ROOT="${RUN_ROOT:-ops/reports/sql/${RUN_ID}}"
TMP_ROOT="${TMP_ROOT:-ops/reports/sql-tmp/${RUN_ID}}"
mkdir -p "${TMP_ROOT}/business"

INFRA_STATUS="${INFRA_STATUS:-PASS}"
SCHEMA_STATUS="${SCHEMA_STATUS:-PASS}"

if [ "${INFRA_STATUS}" != "PASS" ] || [ "${SCHEMA_STATUS}" != "PASS" ]; then
  echo "ERROR: business reports cannot run unless infra/schema are PASS." >&2
  exit 1
fi

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

status="PASS"
started_at="$(date -u +%FT%TZ)"
passed=0
failed=0
degraded=0
reports_count=0

for report in "${REPORTS[@]}"; do
  base="$(basename "${report}" .sql)"
  out="${TMP_ROOT}/business/${base}.txt"
  err="${TMP_ROOT}/business/${base}.err.txt"
  reports_count=$((reports_count + 1))

  if [ ! -f "${report}" ]; then
    echo "FAIL missing report file ${report}" >> "${TMP_ROOT}/business/_run.log"
    failed=$((failed + 1))
    status="FAIL"
    continue
  fi

  set +e
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${report}" > "${out}" 2> "${err}"
  rc=$?
  set -e

  if [ ${rc} -eq 0 ]; then
    passed=$((passed + 1))
    echo "PASS ${report}" >> "${TMP_ROOT}/business/_run.log"
    rm -f "${err}"
    continue
  fi

  if grep -Eiq "column .* does not exist|relation .* does not exist|permission denied" "${err}"; then
    degraded=$((degraded + 1))
    [ "${status}" = "PASS" ] && status="DEGRADED"
    echo "DEGRADED ${report}" >> "${TMP_ROOT}/business/_run.log"
  else
    failed=$((failed + 1))
    status="FAIL"
    echo "FAIL ${report}" >> "${TMP_ROOT}/business/_run.log"
  fi
done

completed_at="$(date -u +%FT%TZ)"
mkdir -p "${RUN_ROOT}/business"
{
  echo "{"
  echo "  \"run_id\": \"${RUN_ID}\","
  echo "  \"status\": \"${status}\","
  echo "  \"started_at\": \"${started_at}\","
  echo "  \"completed_at\": \"${completed_at}\","
  echo "  \"reports_count\": ${reports_count},"
  echo "  \"passed_reports_count\": ${passed},"
  echo "  \"failed_reports_count\": ${failed},"
  echo "  \"degraded_reports_count\": ${degraded}"
  echo "}"
} > "${TMP_ROOT}/business/summary.json"

{
  echo "# Business Reports Summary"
  echo
  echo "- status: \`${status}\`"
  echo "- reports_count: ${reports_count}"
  echo "- passed_reports_count: ${passed}"
  echo "- failed_reports_count: ${failed}"
  echo "- degraded_reports_count: ${degraded}"
  echo
  echo "## Report Log"
  echo '```text'
  cat "${TMP_ROOT}/business/_run.log"
  echo '```'
} > "${TMP_ROOT}/business/summary.md"

find "${TMP_ROOT}/business" -name '*.err.txt' -type f -maxdepth 1 -print0 | while IFS= read -r -d '' f; do
  sed -E -i.bak 's#(postgres(ql)?://)[^[:space:]]+#\1***REDACTED***#g;s/(password|service_role|token|jwt)[^[:space:]]*/\1=***REDACTED***/Ig' "${f}" || true
  rm -f "${f}.bak"
done

cp -R "${TMP_ROOT}/business/." "${RUN_ROOT}/business/"
echo "status=${status}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "run_id=${RUN_ID}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "run_root=${RUN_ROOT}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "reports_count=${reports_count}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "failed_reports_count=${failed}" >> "${GITHUB_OUTPUT:-/dev/null}" || true

if [ "${status}" = "PASS" ] || [ "${status}" = "DEGRADED" ]; then
  exit 0
fi
exit 1
