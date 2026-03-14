#!/usr/bin/env bash
set -euo pipefail

SOURCE_PATH="/Users/sergiikuropiatnyk/handy-friend-landing-v6"
STD_BASE="/Users/sergiikuropiatnyk/Projects"
STD_PATH="$STD_BASE/handy-friend"

mkdir -p "$STD_BASE"
if [[ ! -e "$STD_PATH" ]]; then
  ln -s "$SOURCE_PATH" "$STD_PATH"
  echo "Created symlink: $STD_PATH -> $SOURCE_PATH"
else
  echo "Symlink/path already exists: $STD_PATH"
fi

# Ensure bootstrap directories exist
mkdir -p "$SOURCE_PATH/prompts" \
  "$SOURCE_PATH/ops/reports" \
  "$SOURCE_PATH/ops/audits" \
  "$SOURCE_PATH/ops/snapshots" \
  "$SOURCE_PATH/artifacts/exports" \
  "$SOURCE_PATH/artifacts/imports" \
  "$SOURCE_PATH/logs" \
  "$SOURCE_PATH/scripts" \
  "$SOURCE_PATH/tests" \
  "$SOURCE_PATH/supabase/migrations" \
  "$SOURCE_PATH/supabase/sql"

echo "Bootstrap directories ensured."

echo "Running validation..."
"$SOURCE_PATH/scripts/validate-openai-workflow.sh"
