#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-2133611700c-sudo/handy-friend-web}"
REF="${REF:-main}"
API="https://api.github.com/repos/${REPO}/actions/workflows"

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "ERROR: GITHUB_TOKEN is required with Actions workflow dispatch permission." >&2
  exit 1
fi

run_workflow() {
  local workflow_file="$1"
  echo "Dispatching ${workflow_file} on ref ${REF}"
  curl -fsS -X POST \
    -H "Accept: application/vnd.github+json" \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "${API}/${workflow_file}/dispatches" \
    -d "{\"ref\":\"${REF}\"}"
  echo "OK: ${workflow_file} dispatch requested"
}

run_workflow "alex-smoke.yml"
run_workflow "supabase-sql-reports.yml"

echo "DONE: workflow dispatch requests sent. Check GitHub Actions for run status."
