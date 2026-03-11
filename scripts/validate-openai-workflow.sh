#!/usr/bin/env bash
set -euo pipefail

# Skip in CI — this script validates local macOS workstation setup
if [[ "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ]]; then
  echo "[SKIP] validate-openai-workflow.sh: CI environment detected, local-only checks skipped"
  exit 0
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_PATH="/Users/sergiikuropiatnyk/handy-friend-landing-v6"
STD_PATH="/Users/sergiikuropiatnyk/Projects/handy-friend"

pass() { printf "[PASS] %s\n" "$1"; }
fail() { printf "[FAIL] %s\n" "$1"; }
warn() { printf "[WARN] %s\n" "$1"; }

failures=0

check_file() {
  local p="$1"
  if [[ -s "$REPO_ROOT/$p" ]]; then
    pass "file exists and non-empty: $p"
  else
    fail "missing/empty file: $p"
    failures=$((failures + 1))
  fi
}

check_dir() {
  local p="$1"
  if [[ -d "$REPO_ROOT/$p" ]]; then
    pass "directory exists: $p"
  else
    fail "missing directory: $p"
    failures=$((failures + 1))
  fi
}

check_app() {
  local app="$1"
  if [[ -d "/Applications/$app.app" ]]; then
    pass "app installed: $app"
  else
    fail "app not found: $app"
    failures=$((failures + 1))
  fi
}

echo "== OpenAI Workflow Validation =="
echo "Repo root: $REPO_ROOT"

if git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  pass "valid git repository"
else
  fail "not a git repository"
  failures=$((failures + 1))
fi

if [[ "$REPO_ROOT" == "$SOURCE_PATH" ]]; then
  pass "source-of-truth path matches expected"
else
  warn "repo path differs from expected source path ($SOURCE_PATH)"
fi

if [[ -L "$STD_PATH" ]]; then
  target="$(readlink "$STD_PATH")"
  if [[ "$target" == "$SOURCE_PATH" ]]; then
    pass "standardized symlink path is correct: $STD_PATH"
  else
    fail "standardized symlink points to unexpected target: $target"
    failures=$((failures + 1))
  fi
else
  fail "standardized symlink missing: $STD_PATH"
  failures=$((failures + 1))
fi

check_app "ChatGPT Atlas"
check_app "ChatGPT"
check_app "Codex"

check_file "README.md"
check_file "BOOTSTRAP.md"
check_file "EXEC_SPEC.md"
check_file "STATUS.md"
check_file "RUN_REPORT.md"
check_file "VALIDATION_CHECKLIST.md"
check_file "DECISIONS.md"
check_file "SESSION_START_CHECKLIST.md"
check_file "ARTIFACT_INDEX.md"
check_file ".env.example"

check_dir "prompts"
check_dir "docs"
check_dir "ops/reports"
check_dir "ops/audits"
check_dir "ops/snapshots"
check_dir "artifacts/exports"
check_dir "artifacts/imports"
check_dir "logs"
check_dir "scripts"
check_dir "tests"
check_dir "supabase/migrations"
check_dir "supabase/sql"

if [[ $failures -gt 0 ]]; then
  echo ""
  echo "Validation result: FAILED ($failures issue(s))"
  exit 1
fi

echo ""
echo "Validation result: OK"
