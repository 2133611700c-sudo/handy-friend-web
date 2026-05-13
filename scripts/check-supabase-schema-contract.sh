#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_ROOT="${RUN_ROOT:-ops/reports/sql/${RUN_ID}}"
TMP_ROOT="${TMP_ROOT:-ops/reports/sql-tmp/${RUN_ID}}"
CONTRACT_FILE="${CONTRACT_FILE:-ops/sql/contracts/lead_operational_view.v1.yaml}"
SQL_CHECK_FILE="${SQL_CHECK_FILE:-ops/sql/check-schema-contract.sql}"

mkdir -p "${TMP_ROOT}"

status="PASS"
reason="schema contract checks passed"
started_at="$(date -u +%FT%TZ)"

if [ -z "${DATABASE_URL:-}" ]; then
  status="BLOCKED"
  reason="Missing GitHub Actions secret SUPABASE_DATABASE_URL"
fi
if [ ! -f "${CONTRACT_FILE}" ]; then
  status="FAIL"
  reason="Contract file not found: ${CONTRACT_FILE}"
fi
if [ ! -f "${SQL_CHECK_FILE}" ]; then
  status="FAIL"
  reason="SQL checker not found: ${SQL_CHECK_FILE}"
fi

extract_list_csv() {
  local key="$1"
  awk -v section="$key" '
    $0 ~ "^  " section ":" {in_sec=1; next}
    in_sec && $0 ~ "^  [a-z_]+:" {in_sec=0}
    in_sec && $1=="-" {print $2}
  ' "${CONTRACT_FILE}" | paste -sd, -
}

extract_columns_json() {
  awk '
    $0 ~ "^  required_columns:" {in_cols=1; next}
    in_cols && $0 ~ "^  [a-z_]+:" {in_cols=0}
    in_cols && $0 ~ "^    [a-zA-Z0-9_]+:" {
      gsub(":","",$1); tbl=$1; next
    }
    in_cols && $1=="-" {
      printf "{\"table\":\"%s\",\"column\":\"%s\"}\n", tbl, $2
    }
  ' "${CONTRACT_FILE}"
}

required_tables_csv="$(extract_list_csv required_tables)"
required_views_csv="$(extract_list_csv required_views)"

missing_objects_file="${TMP_ROOT}/schema-missing-objects.txt"
missing_columns_file="${TMP_ROOT}/schema-missing-columns.txt"
raw_error_file="${TMP_ROOT}/schema-contract.error.txt"

if [ "${status}" = "PASS" ]; then
  set +e
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 \
    -v required_tables_csv="${required_tables_csv}" \
    -v required_views_csv="${required_views_csv}" \
    -f "${SQL_CHECK_FILE}" -At > "${missing_objects_file}" 2>"${raw_error_file}"
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    status="FAIL"
    reason="schema object probe failed"
  fi
fi

if [ "${status}" = "PASS" ]; then
  : > "${missing_columns_file}"
  while IFS= read -r row; do
    [ -z "${row}" ] && continue
    tbl="$(printf '%s' "${row}" | sed -E 's/.*"table":"([^"]+)".*/\1/')"
    col="$(printf '%s' "${row}" | sed -E 's/.*"column":"([^"]+)".*/\1/')"
    set +e
    exists="$(psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "select 1 from information_schema.columns where table_schema='public' and table_name='${tbl}' and column_name='${col}' limit 1;" 2>>"${raw_error_file}")"
    rc=$?
    set -e
    if [ $rc -ne 0 ]; then
      status="FAIL"
      reason="schema column probe failed"
      break
    fi
    if [ "${exists}" != "1" ]; then
      echo "${tbl}.${col}" >> "${missing_columns_file}"
    fi
  done < <(extract_columns_json)
fi

missing_objects_count=0
missing_columns_count=0
[ -f "${missing_objects_file}" ] && missing_objects_count="$(grep -c . "${missing_objects_file}" || true)"
[ -f "${missing_columns_file}" ] && missing_columns_count="$(grep -c . "${missing_columns_file}" || true)"

if [ "${status}" = "PASS" ] && { [ "${missing_objects_count}" -gt 0 ] || [ "${missing_columns_count}" -gt 0 ]; }; then
  status="FAIL"
  reason="schema contract missing required objects/columns"
fi

completed_at="$(date -u +%FT%TZ)"
mkdir -p "${RUN_ROOT}"

{
  echo "{"
  echo "  \"run_id\": \"${RUN_ID}\","
  echo "  \"status\": \"${status}\","
  echo "  \"reason\": \"${reason}\","
  echo "  \"started_at\": \"${started_at}\","
  echo "  \"completed_at\": \"${completed_at}\","
  echo "  \"contract_file\": \"${CONTRACT_FILE}\","
  echo "  \"missing_objects_count\": ${missing_objects_count},"
  echo "  \"missing_columns_count\": ${missing_columns_count}"
  echo "}"
} > "${TMP_ROOT}/schema-contract.json"

{
  echo "# Schema Contract Gate"
  echo
  echo "- status: \`${status}\`"
  echo "- reason: ${reason}"
  echo "- contract_file: \`${CONTRACT_FILE}\`"
  echo "- missing_objects_count: ${missing_objects_count}"
  echo "- missing_columns_count: ${missing_columns_count}"
  if [ "${missing_objects_count}" -gt 0 ]; then
    echo
    echo "## Missing Required Objects"
    echo '```text'
    cat "${missing_objects_file}"
    echo '```'
  fi
  if [ "${missing_columns_count}" -gt 0 ]; then
    echo
    echo "## Missing Required Columns"
    echo '```text'
    cat "${missing_columns_file}"
    echo '```'
  fi
  if [ -s "${raw_error_file}" ]; then
    echo
    echo "## Raw Error (redacted-safe)"
    echo '```text'
    sed -E 's#(postgres(ql)?://)[^[:space:]]+#\1***REDACTED***#g;s/(password|service_role|token|jwt)[^[:space:]]*/\1=***REDACTED***/Ig' "${raw_error_file}" | tail -n 120
    echo '```'
  fi
} > "${TMP_ROOT}/schema-contract.md"

mv "${TMP_ROOT}/schema-contract.json" "${RUN_ROOT}/schema-contract.json"
mv "${TMP_ROOT}/schema-contract.md" "${RUN_ROOT}/schema-contract.md"
[ -f "${missing_objects_file}" ] && mv "${missing_objects_file}" "${RUN_ROOT}/schema-missing-objects.txt" || true
[ -f "${missing_columns_file}" ] && mv "${missing_columns_file}" "${RUN_ROOT}/schema-missing-columns.txt" || true
[ -f "${raw_error_file}" ] && mv "${raw_error_file}" "${RUN_ROOT}/schema-contract.error.txt" || true

echo "status=${status}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "reason=${reason}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "run_id=${RUN_ID}" >> "${GITHUB_OUTPUT:-/dev/null}" || true
echo "run_root=${RUN_ROOT}" >> "${GITHUB_OUTPUT:-/dev/null}" || true

if [ "${status}" = "PASS" ]; then
  exit 0
fi
if [ "${status}" = "BLOCKED" ]; then
  exit 3
fi
exit 1
