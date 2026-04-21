#!/usr/bin/env bash
# psi_weekly.sh — run PageSpeed Insights on core pages, write markdown report
# Invoked from .github/workflows/weekly-psi.yml
# Env: PSI_API_KEY (optional, higher quota), TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID

set -euo pipefail

DATE=$(date -u +%Y-%m-%d)
OUT_DIR="ops/psi-reports"
mkdir -p "$OUT_DIR"
REPORT="$OUT_DIR/${DATE}.md"

URLS=(
  "https://handyandfriend.com/"
  "https://handyandfriend.com/services"
  "https://handyandfriend.com/tv-mounting"
  "https://handyandfriend.com/drywall"
)
STRATS=(mobile desktop)
UNKNOWN_COUNT=0
ERROR_COUNT=0

{
  echo "# PageSpeed Insights — ${DATE}"
  echo ""
  echo "| URL | Strategy | Perf | SEO | A11y | BP | LCP | CLS | TBT | FCP |"
  echo "|-----|---------|:---:|:---:|:---:|:---:|----|----|-----|-----|"
} > "$REPORT"

KEY_PARAM=""
[ -n "${PSI_API_KEY:-}" ] && KEY_PARAM="&key=${PSI_API_KEY}"

for URL in "${URLS[@]}"; do
  for STRAT in "${STRATS[@]}"; do
    RESP=$(curl -s --max-time 90 "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${URL}&strategy=${STRAT}&category=performance&category=seo&category=accessibility&category=best-practices${KEY_PARAM}" || echo '{}')
    PARSED=$(URL_ARG="$URL" STRAT_ARG="$STRAT" python3 -c "
import json, sys, os
raw = sys.stdin.read()
try:
    d = json.loads(raw)
except Exception:
    d = {}
lr = d.get('lighthouseResult', {}) if isinstance(d, dict) else {}
cats = lr.get('categories', {})
audits = lr.get('audits', {})
err = d.get('error', {}) if isinstance(d, dict) else {}
err_msg = str(err.get('message','')).strip() if isinstance(err, dict) else ''
def score(k):
    v = cats.get(k, {}).get('score')
    return int(round(v*100)) if isinstance(v,(int,float)) else '?'
perf, seo, a11y, bp = score('performance'), score('seo'), score('accessibility'), score('best-practices')
def dv(k):
    return audits.get(k, {}).get('displayValue','?')
lcp, cls, tbt, fcp = dv('largest-contentful-paint'), dv('cumulative-layout-shift'), dv('total-blocking-time'), dv('first-contentful-paint')
unknown = int(perf == '?' or seo == '?' or a11y == '?' or bp == '?' or lcp == '?' or cls == '?' or tbt == '?' or fcp == '?')
line = f\"| {os.environ['URL_ARG']} | {os.environ['STRAT_ARG']} | {perf} | {seo} | {a11y} | {bp} | {lcp} | {cls} | {tbt} | {fcp} |\"
print(json.dumps({'line': line, 'unknown': unknown, 'error': err_msg[:180]}))
" <<< "$RESP")
    LINE=$(python3 -c "import json,sys; obj=json.loads(sys.stdin.read()); print(obj['line'])" <<< "$PARSED")
    IS_UNKNOWN=$(python3 -c "import json,sys; obj=json.loads(sys.stdin.read()); print(obj['unknown'])" <<< "$PARSED")
    ERR_MSG=$(python3 -c "import json,sys; obj=json.loads(sys.stdin.read()); print(obj['error'])" <<< "$PARSED")
    echo "$LINE" >> "$REPORT"
    echo "$LINE"
    if [ "$IS_UNKNOWN" = "1" ]; then
      UNKNOWN_COUNT=$((UNKNOWN_COUNT+1))
      if [ -n "$ERR_MSG" ]; then
        ERROR_COUNT=$((ERROR_COUNT+1))
        echo "- ${URL} (${STRAT}) error: ${ERR_MSG}" >> "$REPORT"
      fi
    fi
  done
done

# Telegram alert if any mobile Performance score < 50
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  LOW=$(grep -E "\\| mobile \\|" "$REPORT" | awk -F'|' '{gsub(/ /,"",$4); if ($4 != "?" && $4 + 0 < 50) print $2}' | head -5)
  if [ -n "$LOW" ]; then
    MSG="PSI ALERT ${DATE}%0Amobile Performance < 50 on:%0A${LOW//$'\n'/%0A}"
    curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
      -d "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${MSG}" > /dev/null || true
  fi
fi

if [ "$UNKNOWN_COUNT" -gt 0 ]; then
  {
    echo ""
    echo "## Status"
    echo "FAIL — ${UNKNOWN_COUNT} rows returned unknown PSI metrics."
    [ "$ERROR_COUNT" -gt 0 ] && echo "Provider/API errors detected in ${ERROR_COUNT} row(s)."
  } >> "$REPORT"
fi

echo "report=${REPORT}"
[ -n "${GITHUB_STEP_SUMMARY:-}" ] && cat "$REPORT" >> "$GITHUB_STEP_SUMMARY"

# Fail-fast: do not allow green CI with unknown PSI values.
if [ "$UNKNOWN_COUNT" -gt 0 ]; then
  echo "PSI validation failed: unknown rows=${UNKNOWN_COUNT}" >&2
  exit 1
fi
