#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${1:-OC-001}"
TASK_FILE="ops/agent-control/tasks/${TASK_ID}-dell-self-check.json"
OUT_ROOT="ops/openclaw/reports/dell-self-check"
OUT_FILE="${OUT_ROOT}/${TASK_ID}-output.txt"

mkdir -p "$OUT_ROOT"

{
  echo "# Agent Task Runner"
  echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "task_id=${TASK_ID}"
  echo "task_file=${TASK_FILE}"
  echo

  if [ ! -f "$TASK_FILE" ]; then
    echo "FAIL task_missing ${TASK_FILE}"
    exit 1
  fi

  echo "## Preflight"
  pwd
  git status --short

  if [ -n "$(git status --short)" ]; then
    echo "FAIL dirty_worktree"
    echo "Reason: local checkout has uncommitted changes. Stop to avoid overwriting evidence or work."
    exit 1
  fi

  echo "## Update main"
  git fetch origin main
  git pull --ff-only origin main

  echo "## Execute ${TASK_ID}"
  case "$TASK_ID" in
    OC-001)
      bash ops/openclaw/dell/dell-self-check.sh
      ;;
    *)
      echo "FAIL unsupported_task ${TASK_ID}"
      exit 1
      ;;
  esac

  echo
  echo "PASS task_complete ${TASK_ID}"
} 2>&1 | tee "$OUT_FILE"

echo "Evidence written to ${OUT_FILE}"
