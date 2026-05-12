#!/usr/bin/env bash
set -euo pipefail

echo "# Dell OpenClaw Self-Check"
echo "timestamp_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo

echo "## System"
uname -a || true
if [ -f /etc/os-release ]; then cat /etc/os-release; fi
echo

echo "## Working directory"
pwd
echo

echo "## Git"
git --version || true
git remote -v || true
git branch --show-current || true
git status --short || true
LAST_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || true)
echo "last_commit=${LAST_COMMIT}"
echo

echo "## Runtime versions"
node --version || echo "node_missing=true"
npm --version || echo "npm_missing=true"
python3 --version || echo "python3_missing=true"
echo

echo "## Required files"
required=(
  "scripts/openclaw-virtual-browser-audit.mjs"
  "ops/openclaw/HF_OPENCLAW_AGENT_TASKS.md"
  "ops/openclaw/OPENCLAW_ROUTING_POLICY.md"
  "ops/openclaw/TASK_QUEUE.md"
  "ops/openclaw/STATUS.md"
)
for f in "${required[@]}"; do
  if [ -f "$f" ]; then
    echo "PASS file_exists $f"
  else
    echo "FAIL file_missing $f"
    exit 1
  fi
done
echo

echo "## Syntax checks"
node --check scripts/openclaw-virtual-browser-audit.mjs
echo "PASS node_check scripts/openclaw-virtual-browser-audit.mjs"
echo

echo "## Playwright availability"
if npm ls playwright >/dev/null 2>&1; then
  echo "PASS npm_package playwright_present"
else
  echo "WARN npm_package playwright_missing"
fi
if npx playwright --version >/dev/null 2>&1; then
  npx playwright --version
else
  echo "WARN playwright_cli_not_ready"
fi
echo

echo "## Network quick check"
python3 - <<'PY' || true
import urllib.request
for url in ["https://handyandfriend.com/", "https://handyandfriend.com/api/health"]:
    try:
        with urllib.request.urlopen(url, timeout=15) as r:
            print(f"PASS fetch {url} status={r.status}")
    except Exception as e:
        print(f"FAIL fetch {url} error={e}")
PY

echo
echo "DONE self-check complete. If no FAIL lines above, run the Dell browser audit from START_HERE.md."
