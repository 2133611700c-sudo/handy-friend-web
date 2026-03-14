#!/usr/bin/env bash
set -euo pipefail

EXPECTED_PROJECT_ID="prj_cB1RFa7bfSuWpuhBZs76UiYvTLzg"
EXPECTED_ORG_ID="team_qRGWLc9kKWuiKWouVsOeO1P4"
EXPECTED_PROJECT_NAME="handy-friend-landing-v6"
PROJECT_FILE=".vercel/project.json"

echo "[vercel-guard] Validating Vercel project linkage..."

if [[ ! -f "$PROJECT_FILE" ]]; then
  echo "[vercel-guard] ERROR: $PROJECT_FILE not found."
  echo "[vercel-guard] Run: vercel link --project $EXPECTED_PROJECT_NAME --scope sergiis-projects-8a97ee0f"
  exit 1
fi

read_field() {
  local field="$1"
  node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('$PROJECT_FILE','utf8')); process.stdout.write(String(j['$field']||''));"
}

ACTUAL_PROJECT_ID="$(read_field projectId)"
ACTUAL_ORG_ID="$(read_field orgId)"
ACTUAL_PROJECT_NAME="$(read_field projectName)"

FAILED=0

if [[ "$ACTUAL_PROJECT_ID" != "$EXPECTED_PROJECT_ID" ]]; then
  echo "[vercel-guard] ERROR: projectId mismatch."
  echo "  expected: $EXPECTED_PROJECT_ID"
  echo "  actual:   $ACTUAL_PROJECT_ID"
  FAILED=1
fi

if [[ "$ACTUAL_ORG_ID" != "$EXPECTED_ORG_ID" ]]; then
  echo "[vercel-guard] ERROR: orgId mismatch."
  echo "  expected: $EXPECTED_ORG_ID"
  echo "  actual:   $ACTUAL_ORG_ID"
  FAILED=1
fi

if [[ "$ACTUAL_PROJECT_NAME" != "$EXPECTED_PROJECT_NAME" ]]; then
  echo "[vercel-guard] ERROR: projectName mismatch."
  echo "  expected: $EXPECTED_PROJECT_NAME"
  echo "  actual:   $ACTUAL_PROJECT_NAME"
  FAILED=1
fi

if [[ "$FAILED" -eq 1 ]]; then
  echo "[vercel-guard] FAIL: blocked to prevent accidental deploy into a wrong Vercel project."
  echo "[vercel-guard] Fix linkage and rerun."
  exit 1
fi

if command -v vercel >/dev/null 2>&1; then
  if vercel project ls --json 2>/dev/null | sed -n '/^{/,$p' > /tmp/hf-vercel-projects.json; then
    if ! node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('/tmp/hf-vercel-projects.json','utf8')); const arr=Array.isArray(j.projects)?j.projects:[]; const ok=arr.some(p=>p&&p.name==='${EXPECTED_PROJECT_NAME}'&&p.id==='${EXPECTED_PROJECT_ID}'); process.exit(ok?0:1);" ; then
      echo "[vercel-guard] ERROR: canonical project not found in current Vercel account/team context."
      exit 1
    fi
  else
    echo "[vercel-guard] WARNING: unable to query Vercel projects list (auth or network issue)."
  fi
fi

echo "[vercel-guard] PASS: linked to canonical project $EXPECTED_PROJECT_NAME"
