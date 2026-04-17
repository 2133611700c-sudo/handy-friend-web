#!/usr/bin/env bash
set -uo pipefail

SITE="https://handyandfriend.com"
ALLOW_DIRTY=0
SKIP_STATS=0
STATS_KEY="${STATS_SECRET:-}"
RELAX_OUTBOX=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --site)
      SITE="$2"; shift 2 ;;
    --allow-dirty)
      ALLOW_DIRTY=1; shift ;;
    --skip-stats)
      SKIP_STATS=1; shift ;;
    --stats-key)
      STATS_KEY="$2"; shift 2 ;;
    --relax-outbox)
      RELAX_OUTBOX=1; shift ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2 ;;
  esac
done

if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
  RELAX_OUTBOX=1
fi

PASS=0
FAIL=0
FAIL_LIST=()

note() { printf '%s\n' "$*"; }
pass() { PASS=$((PASS+1)); printf '[PASS] %s\n' "$*"; }
fail() { FAIL=$((FAIL+1)); FAIL_LIST+=("$*"); printf '[FAIL] %s\n' "$*"; }

check_cmd() {
  local label="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label"
  fi
}

json_bool() {
  local key="$1"
  local payload="${2-}"
  if [[ -z "$payload" ]]; then payload='{}'; fi
  python3 -c 'import json,sys
key=sys.argv[1]
raw=sys.argv[2]
try:
 d=json.loads(raw)
 v=d
 for p in key.split("."):
  v=v.get(p) if isinstance(v,dict) else None
 print("true" if v is True else "false")
except Exception:
 print("false")' "$key" "$payload"
}

json_get() {
  local key="$1"
  local payload="${2-}"
  if [[ -z "$payload" ]]; then payload='{}'; fi
  python3 -c 'import json,sys
key=sys.argv[1]
raw=sys.argv[2]
try:
 d=json.loads(raw)
 v=d
 for p in key.split("."):
  v=v.get(p) if isinstance(v,dict) else None
 print("" if v is None else v)
except Exception:
 print("")' "$key" "$payload"
}

http_code() {
  curl -sS -o /dev/null -w "%{http_code}" "$1"
}

http_redirect() {
  curl -sS -o /dev/null -w "%{redirect_url}" "$1"
}

resolve_stats_key() {
  if [[ -n "$STATS_KEY" ]]; then
    printf '%s' "$STATS_KEY" | tr -d '\r\n[:space:]'
    return
  fi

  if [[ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
    printf '%s' "${SUPABASE_SERVICE_ROLE_KEY:0:16}" | tr -d '\r\n[:space:]'
    return
  fi

  if [[ -f ".env.production" ]]; then
    local val
    val=$(python3 - <<'PY'
import re
p='.env.production'
key='SUPABASE_SERVICE_ROLE_KEY'
try:
    txt=open(p,'r',encoding='utf-8').read()
    m=re.search(rf'^{key}="?([^"\n]+)"?', txt, flags=re.M)
    if m:
        print(m.group(1)[:16])
except Exception:
    pass
PY
)
    if [[ -n "$val" ]]; then
      printf '%s' "$val" | tr -d '\r\n[:space:]'
      return
    fi
  fi

  echo ""
}

note "== PROD Readiness Audit =="
note "Time: $(date '+%Y-%m-%d %H:%M:%S %Z')"
note "Site: $SITE"

# 1) Git hygiene
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  pass "inside git repo"
else
  fail "inside git repo"
fi

BRANCH="$(git branch --show-current 2>/dev/null || true)"
if [[ -z "$BRANCH" ]]; then
  # GitHub Actions can run in detached HEAD state on pull_request
  BRANCH="${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-}}"
fi
if [[ -n "$BRANCH" ]]; then
  pass "branch detected: $BRANCH"
else
  fail "branch detected"
fi

if [[ "$ALLOW_DIRTY" -eq 1 ]]; then
  note "[INFO] dirty tree allowed by flag"
else
  if [[ -z "$(git status --porcelain 2>/dev/null)" ]]; then
    pass "git tree clean"
  else
    fail "git tree clean"
  fi
fi

# 2) Local quality gates
check_cmd "workflow:validate" env CI=true GITHUB_ACTIONS=true npm run -s workflow:validate
check_cmd "validate:pricing" npm run -s validate:pricing
check_cmd "validate:ads" npm run -s validate:ads

# 3) Routes and redirects
check_route() {
  local path="$1" expected="$2" label="$3"
  local code
  code=$(http_code "$SITE$path")
  if [[ "$code" == "$expected" ]]; then
    pass "$label ($path -> $expected)"
  else
    fail "$label ($path expected $expected got $code)"
  fi
}

check_route "/" "200" "route"
check_route "/pricing" "200" "route"
check_route "/privacy" "200" "route"
check_route "/terms" "200" "route"
check_route "/api/health" "200" "route"
check_route "/r/one-tap/" "200" "route"

code_fb=$(http_code "$SITE/fb")
redir_fb=$(http_redirect "$SITE/fb")
if [[ ( "$code_fb" == "301" || "$code_fb" == "302" || "$code_fb" == "307" || "$code_fb" == "308" ) && "$redir_fb" == *"facebook.com"* ]]; then
  pass "redirect /fb -> Facebook"
else
  fail "redirect /fb -> Facebook"
fi

code_review=$(http_code "$SITE/review")
redir_review=$(http_redirect "$SITE/review")
if [[ ( "$code_review" == "301" || "$code_review" == "302" ) && "$redir_review" == *"google"* ]]; then
  pass "redirect /review -> Google"
else
  fail "redirect /review -> Google"
fi

# 4) Basic health checks
health_json=$(curl -sS "$SITE/api/health" 2>/dev/null || echo '{}')
if [[ "$(json_bool ok "$health_json")" == "true" ]]; then
  pass "api/health ok=true"
else
  fail "api/health ok=true"
fi
for k in supabase_url supabase_service_role_key telegram_bot_token telegram_chat_id resend_api_key fb_page_access_token fb_verify_token deepseek_api_key; do
  if [[ "$(json_bool "checks.$k" "$health_json")" == "true" ]]; then
    pass "health checks.$k=true"
  else
    fail "health checks.$k=true"
  fi
done

# 5) API contracts
submit_code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$SITE/api/submit-lead" -H 'content-type: application/json' -d '{}' || echo "000")
[[ "$submit_code" == "400" ]] && pass "submit-lead empty body returns 400" || fail "submit-lead empty body returns 400"

bad_ai_code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$SITE/api/ai-chat" -H 'content-type: application/json' -d '{"message":"test"}' || echo "000")
[[ "$bad_ai_code" == "400" ]] && pass "ai-chat invalid payload returns 400" || fail "ai-chat invalid payload returns 400"

ai_json=$(curl -sS -X POST "$SITE/api/ai-chat" -H 'content-type: application/json' -d '{"sessionId":"prod-audit-check","lang":"en","messages":[{"role":"user","content":"How much for TV mounting standard and hidden wires?"}]}' 2>/dev/null || echo '{}')
ai_reply=$(json_get reply "$ai_json")
if [[ -n "$ai_reply" ]]; then
  pass "ai-chat valid payload returns reply"
else
  fail "ai-chat valid payload returns reply"
fi

if [[ "$ai_reply" == *"\$185"* && "$ai_reply" != *"\$105"* ]]; then
  pass "ai-chat TV pricing uses current anchors (includes \$185, excludes stale \$105)"
else
  fail "ai-chat TV pricing uses current anchors (includes \$185, excludes stale \$105)"
fi

# 6) Tracking + legacy price leakage
main_html=$(curl -sS "$SITE/" 2>/dev/null || true)
pricing_html=$(curl -sS "$SITE/pricing" 2>/dev/null || true)
one_html=$(curl -sS "$SITE/r/one-tap/" 2>/dev/null || true)
combined="$main_html
$pricing_html
$one_html"

for needle in "G-Z05XJ8E281" "GTM-NQTL3S6Q"; do
  [[ "$main_html" == *"$needle"* ]] && pass "main contains $needle" || fail "main contains $needle"
  [[ "$pricing_html" == *"$needle"* ]] && pass "pricing contains $needle" || fail "pricing contains $needle"
  [[ "$one_html" == *"$needle"* ]] && pass "one-tap contains $needle" || fail "one-tap contains $needle"
done

for page in main pricing; do
  html_var="$main_html"
  [[ "$page" == "pricing" ]] && html_var="$pricing_html"
  [[ "$html_var" == *"AW-17971094967"* ]] && pass "$page contains AW-17971094967" || fail "$page contains AW-17971094967"
done

if command -v rg >/dev/null 2>&1; then
  has_legacy_prices() { printf '%s' "$combined" | rg -q '\$155|\$165|\$175'; }
else
  has_legacy_prices() { printf '%s' "$combined" | grep -Eq '\$155|\$165|\$175'; }
fi

if has_legacy_prices; then
  fail 'legacy prices $155/$165/$175 leaked in public pages'
else
  pass 'legacy prices $155/$165/$175 not present in public pages'
fi

# 7) Outbox health + SLO gate
outbox_json=$(curl -sS "$SITE/api/health?type=outbox" 2>/dev/null || echo '{}')
if [[ "$(json_bool ok "$outbox_json")" == "true" ]]; then
  pass "outbox health ok=true"
else
  if [[ "$RELAX_OUTBOX" -eq 1 ]]; then
    note "[WARN] outbox health ok=true (relaxed on pull_request)"
  else
    fail "outbox health ok=true"
  fi
fi

queue_depth=$(json_get queue_depth "$outbox_json")
if [[ -n "$queue_depth" && "$queue_depth" != "null" ]]; then
  pass "outbox queue_depth present ($queue_depth)"
else
  fail "outbox queue_depth present"
fi

dlq_total=$(json_get dlq_total "$outbox_json")
if [[ -n "$dlq_total" && "$dlq_total" != "null" ]]; then
  pass "outbox dlq_total present ($dlq_total)"
  if [[ "$dlq_total" =~ ^[0-9]+$ && "$dlq_total" -gt 10 ]]; then
    fail "outbox DLQ spike (dlq_total=$dlq_total > 10)"
  else
    pass "outbox DLQ within threshold (dlq_total=$dlq_total)"
  fi
else
  fail "outbox dlq_total present"
fi

# Delivery evidence gate: queue_depth=0 alone is not enough.
# We require proof of successful sends OR explicitly treat fail-only state as red.
sent_1h=$(json_get "slo.sent_1h" "$outbox_json")
if [[ -z "$sent_1h" || "$sent_1h" == "null" ]]; then sent_1h="0"; fi

metrics_sent_total=$(python3 -c 'import json,sys
try:
 d=json.loads(sys.argv[1] or "{}")
 rows=d.get("metrics") or []
 print(sum(int(r.get("sent_count") or 0) for r in rows if isinstance(r,dict)))
except Exception:
 print(0)' "$outbox_json")

metrics_failed_total=$(python3 -c 'import json,sys
try:
 d=json.loads(sys.argv[1] or "{}")
 rows=d.get("metrics") or []
 print(sum(int(r.get("count") or 0) for r in rows if isinstance(r,dict) and str(r.get("status",""))=="failed"))
except Exception:
 print(0)' "$outbox_json")

delivery_sent=$(( sent_1h + metrics_sent_total ))
if [[ "$delivery_sent" -gt 0 ]]; then
  pass "outbox delivery evidence present (sent_1h=$sent_1h metrics_sent_total=$metrics_sent_total)"
elif [[ "$metrics_failed_total" -gt 0 ]]; then
  if [[ "$RELAX_OUTBOX" -eq 1 ]]; then
    note "[WARN] outbox empty but delivery not proven (failed=$metrics_failed_total, sent=$delivery_sent)"
  else
    fail "outbox empty but delivery not proven (failed=$metrics_failed_total, sent=$delivery_sent)"
  fi
else
  if [[ "$RELAX_OUTBOX" -eq 1 ]]; then
    note "[WARN] outbox has no recent send evidence (sent=$delivery_sent, failed=$metrics_failed_total)"
  else
    fail "outbox has no recent send evidence (sent=$delivery_sent, failed=$metrics_failed_total)"
  fi
fi

slo_json=$(curl -sS "$SITE/api/process-outbox?action=slo" 2>/dev/null || echo '{}')
slo_ok=$(json_bool ok "$slo_json")
if [[ "$slo_ok" == "true" ]]; then
  pass "outbox SLO ok=true"
else
  if [[ "$RELAX_OUTBOX" -eq 1 ]]; then
    note "[WARN] outbox SLO ok=true (relaxed on pull_request)"
  else
    fail "outbox SLO ok=true"
  fi
fi

# Verify POST without secret returns 403
outbox_post_code=$(curl -sS -o /dev/null -w "%{http_code}" -X POST "$SITE/api/process-outbox" 2>/dev/null || echo "000")
if [[ "$outbox_post_code" == "403" ]]; then
  pass "outbox POST auth guard (403)"
else
  fail "outbox POST auth guard (expected 403 got $outbox_post_code)"
fi

# Verify GET without secret also returns 403 (batch processing requires auth)
outbox_get_code=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE/api/process-outbox" 2>/dev/null || echo "000")
if [[ "$outbox_get_code" == "403" ]]; then
  pass "outbox GET auth guard (403)"
else
  fail "outbox GET auth guard (expected 403 got $outbox_get_code)"
fi

# Verify GET replay_dlq without secret returns 403
replay_code=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE/api/process-outbox?action=replay_dlq&job_id=test" 2>/dev/null || echo "000")
if [[ "$replay_code" == "403" ]]; then
  pass "outbox replay_dlq auth guard (403)"
else
  fail "outbox replay_dlq auth guard (expected 403 got $replay_code)"
fi

# Verify GET daily_report without secret returns 403
report_code=$(curl -sS -o /dev/null -w "%{http_code}" "$SITE/api/process-outbox?action=daily_report" 2>/dev/null || echo "000")
if [[ "$report_code" == "403" ]]; then
  pass "outbox daily_report auth guard (403)"
else
  fail "outbox daily_report auth guard (expected 403 got $report_code)"
fi

# 7b) Migration drift
check_cmd "migration:drift" npm run -s migration:drift

# 8) Protected stats
if [[ "$SKIP_STATS" -eq 1 ]]; then
  note "[INFO] stats checks skipped by flag"
else
  STATS_KEY_RESOLVED="$(resolve_stats_key)"
  if [[ -z "$STATS_KEY_RESOLVED" ]]; then
    fail "stats key resolved"
  else
    pass "stats key resolved"
    stats_json=$(curl -sS "$SITE/api/health?type=stats&key=$STATS_KEY_RESOLVED&days=30" 2>/dev/null || echo '{}')
    if [[ "$(json_bool ok "$stats_json")" == "true" ]]; then
      pass "stats endpoint authorized and ok=true"
    else
      fail "stats endpoint authorized and ok=true"
    fi

    for metric in leads_total revenue conversion_rate jobs_completed profit; do
      val=$(json_get "data.$metric" "$stats_json")
      if [[ -n "$val" && "$val" != "null" ]]; then
        pass "stats metric data.$metric present ($val)"
      else
        fail "stats metric data.$metric present"
      fi
    done
  fi
fi

note ""
note "== SUMMARY =="
note "PASS: $PASS"
note "FAIL: $FAIL"

if [[ "$FAIL" -gt 0 ]]; then
  note "Failed checks:" 
  for item in "${FAIL_LIST[@]}"; do
    note " - $item"
  done
  note "VERDICT: FAIL"
  exit 1
fi

note "VERDICT: PASS"
exit 0
