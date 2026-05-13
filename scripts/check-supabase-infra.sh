#!/usr/bin/env bash
set -euo pipefail

RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
RUN_ROOT="${RUN_ROOT:-ops/reports/sql/${RUN_ID}}"
TMP_ROOT="${TMP_ROOT:-ops/reports/sql-tmp/${RUN_ID}}"
mkdir -p "${TMP_ROOT}"

status="PASS"
reason="infra checks passed"
started_at="$(date -u +%FT%TZ)"

if ! command -v psql >/dev/null 2>&1; then
  status="BLOCKED"
  reason="psql client is not installed on runner"
fi

if [ "${status}" = "PASS" ] && [ -z "${DATABASE_URL:-}" ]; then
  status="BLOCKED"
  reason="Missing GitHub Actions secret SUPABASE_DATABASE_URL"
fi

if [ "${status}" = "PASS" ]; then
  case "${DATABASE_URL}" in
    postgres://*|postgresql://*) ;;
    *)
      status="FAIL"
      reason="DATABASE_URL must start with postgres:// or postgresql://"
      ;;
  esac
fi

if [ "${status}" = "PASS" ] && printf '%s' "$DATABASE_URL" | grep -Eq '<[^>]+>|\[[^]]+\]|YOUR_PASSWORD|REAL_PASSWORD|xxxxx|XXXX|REGION|PROJECT_REF|YOUR-PROJECT-REF'; then
  status="FAIL"
  reason="DATABASE_URL contains placeholder text"
fi

db_host_redacted="unknown"
db_name="unknown"
pg_version="unknown"
db_identity_redacted="postgres://***:***@***:***/***"

if [ "${status}" = "PASS" ]; then
  db_host_redacted="$(printf '%s' "${DATABASE_URL}" | sed -E 's#^[a-z]+://([^:@/]+)(:([^@/]*))?@([^:/]+)(:[0-9]+)?/([^?]+).*$#\4#I' | sed -E 's/^(.{2}).*(.{2})$/\1***\2/;t;s/.*/*** /' | tr -d ' ')"
  db_name="$(printf '%s' "${DATABASE_URL}" | sed -E 's#^[a-z]+://[^/]+/([^?]+).*$#\1#I')"
  db_identity_redacted="$(printf '%s' "${DATABASE_URL}" | sed -E 's#^([a-z]+://)([^:@/]+)(:([^@/]*))?@([^:/]+)(:[0-9]+)?/([^?]+).*$#\1\2:***@\5\6/\7#I' | sed -E 's#@([^:/]{2})[^:/]*([^:/]{2})(:[0-9]+)?/#@\1***\2\3/#')"
fi

raw_error_file="${TMP_ROOT}/infra-gate.error.txt"
if [ "${status}" = "PASS" ]; then
  set +e
  psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -Atc "select current_database(), current_user, version();" >"${TMP_ROOT}/infra-gate.query.txt" 2>"${raw_error_file}"
  rc=$?
  set -e
  if [ $rc -ne 0 ]; then
    status="FAIL"
    reason="DB connection failed"
  else
    pg_version="$(cut -d'|' -f3 "${TMP_ROOT}/infra-gate.query.txt" | head -n1 | sed 's/[[:space:]]\+/ /g')"
    db_name="$(cut -d'|' -f1 "${TMP_ROOT}/infra-gate.query.txt" | head -n1)"
  fi
fi

completed_at="$(date -u +%FT%TZ)"
mkdir -p "${RUN_ROOT}"

cat > "${TMP_ROOT}/infra-gate.json" <<JSON
{
  "run_id": "${RUN_ID}",
  "status": "${status}",
  "reason": "${reason}",
  "started_at": "${started_at}",
  "completed_at": "${completed_at}",
  "database_host_redacted": "${db_host_redacted}",
  "database_name": "${db_name}",
  "connection_identity_redacted": "${db_identity_redacted}",
  "postgres_version": "$(printf '%s' "${pg_version}" | sed 's/"/\\"/g')"
}
JSON

{
  echo "# Infra Gate"
  echo
  echo "- status: \`${status}\`"
  echo "- reason: ${reason}"
  echo "- run_id: \`${RUN_ID}\`"
  echo "- started_at: \`${started_at}\`"
  echo "- completed_at: \`${completed_at}\`"
  echo "- database_host_redacted: \`${db_host_redacted}\`"
  echo "- database_name: \`${db_name}\`"
  echo "- postgres_version: \`${pg_version}\`"
  if [ -s "${raw_error_file}" ]; then
    echo
    echo "## Raw Error (redacted-safe)"
    echo '```text'
    sed -E 's#(postgres(ql)?://)[^[:space:]]+#\1***REDACTED***#g;s/(password|service_role|token|jwt)[^[:space:]]*/\1=***REDACTED***/Ig' "${raw_error_file}" | tail -n 80
    echo '```'
  fi
} > "${TMP_ROOT}/infra-gate.md"

mv "${TMP_ROOT}/infra-gate.json" "${RUN_ROOT}/infra-gate.json"
mv "${TMP_ROOT}/infra-gate.md" "${RUN_ROOT}/infra-gate.md"
[ -f "${raw_error_file}" ] && mv "${raw_error_file}" "${RUN_ROOT}/infra-gate.error.txt" || true

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
