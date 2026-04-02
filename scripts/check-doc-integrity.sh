#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-$(pwd)}"
cd "$ROOT"

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is required"
  exit 1
fi
if ! command -v ruby >/dev/null 2>&1; then
  echo "ERROR: ruby is required"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required for JSON validation"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

FILES_LIST="$TMP_DIR/files.zlist"
UTF8_BAD="$TMP_DIR/utf8_bad.txt"
JSON_BAD="$TMP_DIR/json_bad.txt"
YAML_BAD="$TMP_DIR/yaml_bad.txt"
NUL_BAD="$TMP_DIR/nul_bad.txt"
MOJIBAKE_BAD="$TMP_DIR/mojibake_bad.txt"

git -c core.quotepath=off ls-files -z \
  '*.md' '*.sql' '*.yml' '*.yaml' '*.json' '*.toml' '*.txt' \
  > "$FILES_LIST"

docs_total="$(tr -cd '\0' < "$FILES_LIST" | wc -c | tr -d ' ')"
echo "Doc integrity scan started (tracked files): $docs_total"

: > "$UTF8_BAD"
: > "$JSON_BAD"
: > "$YAML_BAD"
: > "$NUL_BAD"
: > "$MOJIBAKE_BAD"

while IFS= read -r -d '' f; do
  ruby -e 's=File.binread(ARGV[0]); s.force_encoding("UTF-8"); exit(s.valid_encoding? ? 0 : 1)' "$f" || echo "$f" >> "$UTF8_BAD"
  ruby -e 's=File.binread(ARGV[0]); exit(s.include?("\x00") ? 0 : 1)' "$f" && echo "$f" >> "$NUL_BAD" || true
done < "$FILES_LIST"

while IFS= read -r -d '' f; do
  jq -e . "$f" >/dev/null 2>&1 || echo "$f" >> "$JSON_BAD"
done < <(git -c core.quotepath=off ls-files -z '*.json')

while IFS= read -r -d '' f; do
  ruby -ryaml -e 'YAML.load_file(ARGV[0])' "$f" >/dev/null 2>&1 || echo "$f" >> "$YAML_BAD"
done < <(git -c core.quotepath=off ls-files -z '*.yml' '*.yaml')

while IFS= read -r -d '' f; do
  if rg -n "вЦИ|РЎ|Рџ|Ð|�" -S "$f" >/dev/null 2>&1; then
    echo "$f" >> "$MOJIBAKE_BAD"
  fi
done < "$FILES_LIST"

utf8_invalid="$(wc -l < "$UTF8_BAD" | tr -d ' ')"
json_invalid="$(wc -l < "$JSON_BAD" | tr -d ' ')"
yaml_invalid="$(wc -l < "$YAML_BAD" | tr -d ' ')"
nul_invalid="$(wc -l < "$NUL_BAD" | tr -d ' ')"
mojibake_hits="$(wc -l < "$MOJIBAKE_BAD" | tr -d ' ')"

echo "utf8_invalid=$utf8_invalid"
echo "json_invalid=$json_invalid"
echo "yaml_invalid=$yaml_invalid"
echo "nul_byte_files=$nul_invalid"
echo "mojibake_hits=$mojibake_hits"

issues=0
for report in "$UTF8_BAD" "$JSON_BAD" "$YAML_BAD" "$NUL_BAD" "$MOJIBAKE_BAD"; do
  if [[ -s "$report" ]]; then
    issues=1
  fi
done

if [[ "$issues" -eq 1 ]]; then
  echo
  echo "FAILED: document integrity issues detected"
  [[ -s "$UTF8_BAD" ]] && { echo "--- UTF-8 invalid ---"; sed -n '1,200p' "$UTF8_BAD"; }
  [[ -s "$JSON_BAD" ]] && { echo "--- JSON invalid ---"; sed -n '1,200p' "$JSON_BAD"; }
  [[ -s "$YAML_BAD" ]] && { echo "--- YAML invalid ---"; sed -n '1,200p' "$YAML_BAD"; }
  [[ -s "$NUL_BAD" ]] && { echo "--- NUL byte files ---"; sed -n '1,200p' "$NUL_BAD"; }
  [[ -s "$MOJIBAKE_BAD" ]] && { echo "--- Mojibake hits ---"; sed -n '1,200p' "$MOJIBAKE_BAD"; }
  exit 1
fi

echo "PASS: all tracked documents are structurally clean."
