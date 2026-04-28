#!/usr/bin/env bash
# OpenClaw Lead Reporter — env loader + Python launcher.
# Usage: openclaw_lead_report.sh {audit|daily|weekly|critical} [--dry-run]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.production"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: missing ${ENV_FILE}" >&2
  exit 3
fi

# Load env without echoing values (so service role key never lands in ps/logs).
set -a
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

LOG_DIR="${REPO_ROOT}/ops/openclaw/logs"
mkdir -p "${LOG_DIR}"

SUB="${1:-}"
shift || true
if [[ -z "${SUB}" ]]; then
  echo "usage: $0 {audit|daily|weekly|critical} [--dry-run]" >&2
  exit 2
fi

DATE_TAG="$(date +%Y-%m-%d)"
LOG_FILE="${LOG_DIR}/${SUB}-${DATE_TAG}.log"

# Run script. stderr+stdout both teed into log.
exec python3 "${REPO_ROOT}/scripts/openclaw_lead_report.py" "${SUB}" "$@" \
  >> "${LOG_FILE}" 2>&1
