#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT_DIR/handy-friend/scripts/prod_audit.sh"

if [[ ! -x "$TARGET" ]]; then
  echo "Error: target audit script not found or not executable: $TARGET" >&2
  exit 1
fi

exec "$TARGET" "$@"
