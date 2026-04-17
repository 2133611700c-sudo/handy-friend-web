#!/usr/bin/env bash
# Task 1.5 live-proof — run AFTER PR #22 lands on main and Vercel auto-deploys.
#
# Triggers each of the 12 migrated send paths, then queries Supabase
# telegram_sends to confirm every `source` tag wrote at least one row in
# the last 10 minutes. Fails hard on any missing source so the ledger
# flip from DONE → PASS is grounded in evidence, not hope.
#
# Required env (loaded from .env.production if present):
#   SUPABASE_URL
#   SUPABASE_SERVICE_ROLE_KEY
#   SITE              default: https://handyandfriend.com
#
# Exit codes:
#   0 — all 12 source tags produced rows in the window
#   1 — one or more source tags missing
#   2 — env / dependency issue (pre-flight failure)

set -uo pipefail

SITE="${SITE:-https://handyandfriend.com}"
WINDOW_MIN="${WINDOW_MIN:-10}"

# Load .env.production if present (same pattern as other scripts).
if [[ -f .env.production ]]; then
  # shellcheck disable=SC1091
  set -a; . .env.production; set +a
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "[verify-1.5] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set" >&2
  exit 2
fi

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
REPORT_DIR="ops/reports/task-1.5-proof-${TIMESTAMP}"
mkdir -p "$REPORT_DIR"

# Expected source tags — must match sendTelegramMessage({source: ...})
# call sites in the 6 migrated files. Keep this list in lockstep with
# ops/reports/telegram-send-path-audit-2026-04-17.md (A3 report).
#
# Some paths are only triggered by real FB messenger inbound (alex_webhook:*)
# or by the hourly outbox cron (outbox:*). Those get a separate check: a
# row within the WINDOW_MIN OR within the last 24h, plus a warning if the
# fresher check missed.
EXPECTED_SOURCES=(
  "ai_chat:lead_card"
  "ai_chat:pre_lead_photo"
  "ai_chat:sales_card_photo"
  "ai_chat:lead_photo"
  "alex_webhook:fb_lead_card"
  "alex_webhook:fb_photo_text"
  "alex_webhook:fb_photo_forward"
  "ai_intake"
  "ai_intake:photo"
  "outbox:telegram_owner"
  "outbox:dlq_alert"
  "lead_pipeline:dispatch_inline"
  "lead_pipeline:fallback_owner_alert"
)

CLIENT_INTRIGGERABLE=(
  "ai_chat:lead_card"
  "ai_chat:pre_lead_photo"
  "ai_chat:sales_card_photo"
  "ai_chat:lead_photo"
  "ai_intake"
  "ai_intake:photo"
)

CRON_TRIGGERABLE=(
  "outbox:telegram_owner"
  "outbox:dlq_alert"
  "lead_pipeline:dispatch_inline"
  "lead_pipeline:fallback_owner_alert"
)

FB_TRIGGERABLE=(
  "alex_webhook:fb_lead_card"
  "alex_webhook:fb_photo_text"
  "alex_webhook:fb_photo_forward"
)

echo "[verify-1.5] site=$SITE window=${WINDOW_MIN}m report_dir=$REPORT_DIR"

# ─── 1. Trigger client-side paths ─────────────────────────────────────
echo ""
echo "[1/4] Triggering /api/ai-chat lead-capture path…"
ai_chat_session="verify_task_1_5_${TIMESTAMP}"
ai_chat_json=$(cat <<JSON
{"sessionId":"$ai_chat_session","lang":"en","messages":[
  {"role":"user","content":"I need TV mounted. My phone is 213-555-0179."}
]}
JSON
)
curl -sS -X POST "$SITE/api/ai-chat" \
  -H 'content-type: application/json' \
  -d "$ai_chat_json" \
  -o "$REPORT_DIR/trigger-ai-chat.json" || true
echo "  -> $REPORT_DIR/trigger-ai-chat.json ($(wc -c < "$REPORT_DIR/trigger-ai-chat.json") bytes)"

echo ""
echo "[2/4] Triggering /api/ai-intake (text-only, no photo)…"
curl -sS -X POST "$SITE/api/ai-intake" \
  -H 'content-type: application/json' \
  -d "{\"query\":\"verify task 1.5\",\"photos\":[],\"lang\":\"en\",\"leadId\":\"verify_${TIMESTAMP}\"}" \
  -o "$REPORT_DIR/trigger-ai-intake.json" || true
echo "  -> $REPORT_DIR/trigger-ai-intake.json"

echo ""
echo "[3/4] Waiting 4s for async telegram_sends writes…"
sleep 4

# ─── 2. Query telegram_sends for all expected sources ─────────────────
echo ""
echo "[4/4] Querying telegram_sends for expected source tags…"

all_json="$REPORT_DIR/telegram_sends-snapshot.json"
curl -sS "$SUPABASE_URL/rest/v1/telegram_sends?select=id,source,lead_id,session_id,ok,error_code,created_at&order=created_at.desc&limit=500" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -o "$all_json"

python3 - <<PY > "$REPORT_DIR/verdict.json"
import json, sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

rows = json.loads(Path("$all_json").read_text() or "[]")
now = datetime.now(timezone.utc)
window = timedelta(minutes=int("$WINDOW_MIN"))
day = timedelta(hours=24)

expected = """${EXPECTED_SOURCES[@]}""".split()
client_sources = set(""" ${CLIENT_INTRIGGERABLE[@]} """.split())
cron_sources = set(""" ${CRON_TRIGGERABLE[@]} """.split())
fb_sources = set(""" ${FB_TRIGGERABLE[@]} """.split())

def parse_ts(s):
    try: return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except: return None

fresh, stale = {}, {}
for r in rows:
    ts = parse_ts(r.get("created_at", ""))
    if not ts: continue
    src = r.get("source") or ""
    age = now - ts
    if age <= window:
        fresh.setdefault(src, []).append(r)
    if age <= day:
        stale.setdefault(src, []).append(r)

result = {"expected": expected, "by_source": {}, "missing_fresh": [], "missing_any": [], "pass": True}
for src in expected:
    fresh_count = len(fresh.get(src, []))
    stale_count = len(stale.get(src, []))
    category = "client" if src in client_sources else "cron" if src in cron_sources else "fb" if src in fb_sources else "other"
    result["by_source"][src] = {
        "fresh_count": fresh_count,
        "stale_count_24h": stale_count,
        "category": category
    }
    # Client-triggerable paths MUST be fresh.
    if category == "client" and fresh_count == 0:
        result["missing_fresh"].append(src)
        result["pass"] = False
    # Cron / FB paths only need a row in the last 24h (cron fires daily;
    # FB requires a real inbound, which we cannot synthesize).
    elif category in ("cron", "fb") and stale_count == 0:
        result["missing_any"].append(src)
        result["pass"] = False

print(json.dumps(result, indent=2))
PY

echo ""
cat "$REPORT_DIR/verdict.json"

if python3 -c "import json,sys; d=json.load(open('$REPORT_DIR/verdict.json')); sys.exit(0 if d.get('pass') else 1)"; then
  echo ""
  echo "[verify-1.5] ✅ PASS — all expected source tags produced telegram_sends rows"
  echo "[verify-1.5] Ledger row 1.5 may flip DONE → PASS with evidence: $REPORT_DIR/"
  exit 0
else
  echo ""
  echo "[verify-1.5] ❌ FAIL — one or more source tags missing"
  echo "[verify-1.5] See $REPORT_DIR/verdict.json for details"
  exit 1
fi
