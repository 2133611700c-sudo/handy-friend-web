#!/usr/bin/env python3
"""
OpenClaw Lead Reporter — Supabase -> Telegram (read-only).

Subcommands:
  audit     : verify schema readiness (no Telegram send)
  daily     : last 24h report -> Telegram
  weekly    : last 7d report   -> Telegram
  critical  : last 60min scan  -> Telegram (one msg per alert)

Flags:
  --dry-run : print Telegram-ready text to stdout, do not send

Strict constraints:
  - Read-only on Supabase (no schema changes, no writes)
  - Service role key loaded from env, never via CLI args
  - PII masked in all outgoing text
  - Idempotency: skips if same subcommand ran < 5 min ago
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import quote

try:
    import requests  # type: ignore
    HTTP = "requests"
except Exception:  # pragma: no cover
    import urllib.request
    import urllib.error
    HTTP = "urllib"


# ─── Constants ───────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
STATE_DIR = REPO_ROOT / "ops" / "openclaw" / "state"
LOG_DIR = REPO_ROOT / "ops" / "openclaw" / "logs"
IDEMPOTENCY_WINDOW_SEC = 5 * 60

REQUIRED_LEAD_FIELDS = [
    "id", "created_at", "source", "channel", "attribution_source",
    "service_type", "lead_type", "gclid", "gbraid", "wbraid", "fbclid",
    "msclkid", "utm_source", "utm_medium", "utm_campaign", "utm_content",
    "utm_term", "landing_page", "is_test", "last_owner_alert_at",
    "full_name", "phone", "email", "status", "stage", "source_details",
]

CANDIDATE_TABLES = [
    "leads", "lead_events", "whatsapp_messages",
    "telegram_sends", "outbound_jobs",
]

SOURCE_BUCKETS = [
    "google_ads_search", "whatsapp", "website_chat", "website_form", "other",
]

SERVICE_BUCKETS = [
    "tv_mounting", "furniture_assembly", "drywall_repair",
    "flooring", "handyman_general", "unknown",
]

# Aliases that map onto canonical service buckets.
SERVICE_ALIASES = {
    "kitchen_cabinet_painting": "handyman_general",
    "cabinet_painting": "handyman_general",
    "painting": "handyman_general",
    "general_handyman": "handyman_general",
}

LA_TZ = timezone(timedelta(hours=-7))  # America/Los_Angeles in DST. Acceptable for report header only.


# ─── Env loading ─────────────────────────────────────────────────────────────

def load_env_file(path: Path) -> None:
    """Lightweight .env loader. Only sets vars that are not already set."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = val


def env(name: str, required: bool = True) -> str:
    val = os.environ.get(name, "")
    if required and not val:
        print(f"ERROR: missing required env var {name}", file=sys.stderr)
        sys.exit(3)
    return val


# ─── HTTP helpers ────────────────────────────────────────────────────────────

def http_get(url: str, headers: Dict[str, str], timeout: int = 20) -> Tuple[int, Dict[str, str], bytes]:
    if HTTP == "requests":
        r = requests.get(url, headers=headers, timeout=timeout)
        return r.status_code, dict(r.headers), r.content
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, dict(resp.headers), resp.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read() or b""


def http_post(url: str, headers: Dict[str, str], data: bytes, timeout: int = 20) -> Tuple[int, bytes]:
    if HTTP == "requests":
        r = requests.post(url, headers=headers, data=data, timeout=timeout)
        return r.status_code, r.content
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read() or b""


# ─── Supabase REST ───────────────────────────────────────────────────────────

@dataclass
class Supabase:
    url: str
    key: str

    def _headers(self, prefer_count: bool = False) -> Dict[str, str]:
        h = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Accept": "application/json",
        }
        if prefer_count:
            h["Prefer"] = "count=exact"
        return h

    def select(self, table: str, params: str, prefer_count: bool = False) -> Tuple[int, List[Dict[str, Any]], Optional[int]]:
        url = f"{self.url}/rest/v1/{table}?{params}"
        status, headers, body = http_get(url, self._headers(prefer_count=prefer_count))
        try:
            data = json.loads(body or b"[]")
        except json.JSONDecodeError:
            data = []
        total: Optional[int] = None
        cr = headers.get("Content-Range") or headers.get("content-range")
        if cr and "/" in cr:
            try:
                total = int(cr.rsplit("/", 1)[1])
            except ValueError:
                total = None
        return status, data if isinstance(data, list) else [], total

    def count(self, table: str, filters: str = "") -> Optional[int]:
        params = f"select=id&limit=1"
        if filters:
            params = f"{params}&{filters}"
        status, _, total = self.select(table, params, prefer_count=True)
        if status >= 400:
            return None
        return total

    def fetch_all(self, table: str, params: str, page_size: int = 1000, max_rows: int = 5000) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        offset = 0
        while True:
            paged = f"{params}&limit={page_size}&offset={offset}"
            status, data, _ = self.select(table, paged)
            if status >= 400 or not data:
                break
            rows.extend(data)
            if len(data) < page_size or len(rows) >= max_rows:
                break
            offset += page_size
        return rows


# ─── PII masking ─────────────────────────────────────────────────────────────

def mask_phone(p: Optional[str]) -> str:
    if not p:
        return "***"
    digits = "".join(c for c in str(p) if c.isdigit())
    if len(digits) < 4:
        return "***"
    last4 = digits[-4:]
    return f"+1 *** *** {last4}"


def mask_email(e: Optional[str]) -> str:
    if not e or "@" not in str(e):
        return "***"
    local, _, domain = str(e).partition("@")
    if not local:
        return f"***@{domain}"
    return f"{local[0]}***@{domain}"


def mask_name(n: Optional[str]) -> str:
    if not n:
        return "***"
    s = str(n).strip()
    if not s:
        return "***"
    return f"{s[0].upper()}***"


def mask_id(i: Optional[str]) -> str:
    if not i:
        return "***"
    s = str(i)
    return f"{s[:8]}…" if len(s) > 8 else s


# ─── Idempotency ─────────────────────────────────────────────────────────────

def idempotency_check(subcommand: str) -> bool:
    """Returns True if we should proceed, False if recent run exists."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    state_file = STATE_DIR / f"last_{subcommand}.txt"
    if state_file.exists():
        try:
            last = float(state_file.read_text().strip())
        except ValueError:
            last = 0.0
        if time.time() - last < IDEMPOTENCY_WINDOW_SEC:
            return False
    return True


def idempotency_mark(subcommand: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    (STATE_DIR / f"last_{subcommand}.txt").write_text(str(time.time()))


# ─── Telegram ────────────────────────────────────────────────────────────────

def telegram_send(text: str, dry_run: bool = False) -> Optional[int]:
    if dry_run:
        print(text)
        return None
    token = env("TELEGRAM_BOT_TOKEN")
    chat_id = env("TELEGRAM_CHAT_ID")
    payload = json.dumps({
        "chat_id": chat_id,
        "text": text,
        "disable_web_page_preview": True,
    }).encode("utf-8")
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    status, body = http_post(url, {"Content-Type": "application/json"}, payload)
    if status >= 400:
        print(f"ERROR: telegram send failed status={status} body={body[:200]!r}", file=sys.stderr)
        return None
    try:
        resp = json.loads(body)
        if resp.get("ok"):
            return int(resp["result"]["message_id"])
    except Exception:
        pass
    return None


# ─── Phase 1: audit ──────────────────────────────────────────────────────────

def cmd_audit(sb: Supabase) -> int:
    tables_exist: Dict[str, bool] = {}
    leads_columns_present: List[str] = []
    leads_columns_missing: List[str] = []

    for t in CANDIDATE_TABLES:
        status, _, _ = sb.select(t, "select=*&limit=1")
        tables_exist[t] = status < 400

    if tables_exist.get("leads"):
        # Probe each required column individually (PostgREST 400s on missing column).
        for col in REQUIRED_LEAD_FIELDS:
            status, _, _ = sb.select("leads", f"select={col}&limit=1")
            if status < 400:
                leads_columns_present.append(col)
            else:
                leads_columns_missing.append(col)

    ready = (
        tables_exist.get("leads", False)
        and not leads_columns_missing
    )

    report = {
        "leads_columns_present": leads_columns_present,
        "leads_columns_missing": leads_columns_missing,
        "tables_exist": tables_exist,
        "telegram_proof_field": "leads.last_owner_alert_at",
        "ready": ready,
    }
    print(json.dumps(report, indent=2))
    return 0 if ready else 2


# ─── Bucketing helpers ───────────────────────────────────────────────────────

def bucket_source(s: Optional[str]) -> str:
    if not s:
        return "other"
    s = s.strip().lower()
    if s in SOURCE_BUCKETS:
        return s
    return "other"


def bucket_service(s: Optional[str]) -> str:
    if not s:
        return "unknown"
    s = s.strip().lower()
    if s in SERVICE_ALIASES:
        s = SERVICE_ALIASES[s]
    if s in SERVICE_BUCKETS:
        return s
    return "unknown"


def iso_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ─── Lead pulling ────────────────────────────────────────────────────────────

def fetch_leads_window(sb: Supabase, since: datetime) -> List[Dict[str, Any]]:
    cols = ",".join(REQUIRED_LEAD_FIELDS)
    params = (
        f"select={cols}"
        f"&created_at=gte.{quote(iso_z(since))}"
        f"&order=created_at.desc"
    )
    return sb.fetch_all("leads", params)


# ─── Daily report ────────────────────────────────────────────────────────────

def build_daily_metrics(leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    real = [l for l in leads if l.get("is_test") is False]
    test = [l for l in leads if l.get("is_test") is True]

    src_counts = Counter(bucket_source(l.get("source")) for l in real)
    svc_counts = Counter(bucket_service(l.get("service_type")) for l in real)

    gclid_leads = [l for l in real if l.get("gclid")]
    leakage = [l for l in real if l.get("gclid") and bucket_source(l.get("source")) != "google_ads_search"]

    top_campaign = _mode([l.get("utm_campaign") for l in gclid_leads if l.get("utm_campaign")])
    top_landing = _mode([l.get("landing_page") for l in gclid_leads if l.get("landing_page")])

    now_utc = datetime.now(timezone.utc)
    no_proof = []
    for l in real:
        if l.get("last_owner_alert_at"):
            continue
        try:
            ca = datetime.fromisoformat(str(l["created_at"]).replace("Z", "+00:00"))
        except Exception:
            continue
        if (now_utc - ca) > timedelta(minutes=15):
            no_proof.append(l)

    svc_unknown = sum(1 for l in real if bucket_service(l.get("service_type")) == "unknown")
    src_other = sum(1 for l in real if bucket_source(l.get("source")) == "other")

    return {
        "total": len(leads),
        "real": len(real),
        "test": len(test),
        "by_source": {b: src_counts.get(b, 0) for b in SOURCE_BUCKETS},
        "by_service": {b: svc_counts.get(b, 0) for b in SERVICE_BUCKETS},
        "gclid_leads": len(gclid_leads),
        "top_campaign": top_campaign,
        "top_landing": top_landing,
        "leakage_count": len(leakage),
        "no_proof_count": len(no_proof),
        "no_proof_leads": no_proof,
        "svc_unknown": svc_unknown,
        "src_other": src_other,
        "real_leads": real,
    }


def _mode(values: Iterable[Any]) -> Optional[str]:
    c = Counter(v for v in values if v)
    if not c:
        return None
    return c.most_common(1)[0][0]


def fetch_unanswered_whatsapp(sb: Supabase, minutes: int = 15) -> Optional[int]:
    """Best-effort: count inbound WA messages with no outbound reply within `minutes`.

    Returns None if table/columns differ from expected shape.
    """
    status, sample, _ = sb.select("whatsapp_messages", "select=*&limit=1")
    if status >= 400 or not isinstance(sample, list):
        return None
    if sample:
        keys = set(sample[0].keys())
        if "direction" not in keys or "created_at" not in keys:
            return None
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    status, inbound, _ = sb.select(
        "whatsapp_messages",
        f"select=*&direction=eq.inbound&created_at=gte.{quote(iso_z(cutoff))}&order=created_at.desc&limit=200",
    )
    if status >= 400:
        return None
    # Pull outbound for same window for cross-ref.
    status, outbound, _ = sb.select(
        "whatsapp_messages",
        f"select=*&direction=eq.outbound&created_at=gte.{quote(iso_z(cutoff))}&order=created_at.desc&limit=500",
    )
    if status >= 400:
        outbound = []

    # Group outbound by phone/wa_id to compare timestamps.
    phone_keys = ("phone", "wa_id", "from", "to", "contact_phone")
    def pkey(m: Dict[str, Any]) -> Optional[str]:
        for k in phone_keys:
            if m.get(k):
                return str(m[k])
        return None

    out_by_phone: Dict[str, List[datetime]] = {}
    for m in outbound:
        p = pkey(m)
        if not p:
            continue
        try:
            ts = datetime.fromisoformat(str(m["created_at"]).replace("Z", "+00:00"))
        except Exception:
            continue
        out_by_phone.setdefault(p, []).append(ts)

    unanswered = 0
    for m in inbound:
        p = pkey(m)
        try:
            ts_in = datetime.fromisoformat(str(m["created_at"]).replace("Z", "+00:00"))
        except Exception:
            continue
        replies = out_by_phone.get(p or "", [])
        if not any(0 <= (r - ts_in).total_seconds() <= minutes * 60 for r in replies):
            # Also skip if inbound is younger than `minutes` (still within SLA).
            if (datetime.now(timezone.utc) - ts_in).total_seconds() >= minutes * 60:
                unanswered += 1
    return unanswered


def format_daily(metrics: Dict[str, Any], unanswered_wa: Optional[int], window_label: str = "last 24h (LA tz)") -> str:
    leakage = metrics["leakage_count"]
    leakage_line = f"\n- ⚠️ source=other with gclid: {leakage}" if leakage > 0 else ""
    wa_line = unanswered_wa if unanswered_wa is not None else "n/a"

    lines = [
        "📊 Handy & Friend — Daily Lead Report",
        f"Period: {window_label}",
        "Leads:",
        f"- total: {metrics['total']}",
        f"- real: {metrics['real']}",
        f"- test/internal: {metrics['test']}",
        "By source:",
    ]
    for b in SOURCE_BUCKETS:
        lines.append(f"- {b}: {metrics['by_source'][b]}")
    lines.append("By service:")
    for b in SERVICE_BUCKETS:
        lines.append(f"- {b}: {metrics['by_service'][b]}")
    lines.append("Google Ads:")
    lines.append(f"- gclid leads: {metrics['gclid_leads']}")
    lines.append(f"- top campaign: {metrics['top_campaign'] or 'none'}")
    lines.append(f"- top landing: {metrics['top_landing'] or 'none'}")
    if leakage_line:
        lines.append(leakage_line.lstrip("\n"))
    lines.append("Issues:")
    lines.append(f"- no Telegram proof: {metrics['no_proof_count']}")
    lines.append(f"- service_type unknown: {metrics['svc_unknown']}")
    lines.append(f"- source=other (real): {metrics['src_other']}")
    lines.append(f"- unanswered WhatsApp: {wa_line}")
    lines.append("Action:")

    # Top 3 follow-up candidates: prefer no_proof, then newest stage=new <1h
    now_utc = datetime.now(timezone.utc)
    one_hour = now_utc - timedelta(hours=1)
    pool: List[Dict[str, Any]] = list(metrics["no_proof_leads"])
    seen_ids = {l.get("id") for l in pool}
    for l in metrics["real_leads"]:
        if l.get("id") in seen_ids:
            continue
        if str(l.get("stage") or "").lower() != "new":
            continue
        try:
            ca = datetime.fromisoformat(str(l["created_at"]).replace("Z", "+00:00"))
        except Exception:
            continue
        if ca >= one_hour:
            pool.append(l)
            seen_ids.add(l.get("id"))
        if len(pool) >= 3:
            break

    if not pool:
        lines.append("- (none)")
    else:
        for i, l in enumerate(pool[:3], 1):
            svc = bucket_service(l.get("service_type"))
            lines.append(f"{i}. {mask_phone(l.get('phone'))} — {svc} — {l.get('created_at')}")

    return "\n".join(lines)


# ─── Weekly ──────────────────────────────────────────────────────────────────

def build_weekly_extra(leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    real = [l for l in leads if l.get("is_test") is False]
    svc_counter = Counter(bucket_service(l.get("service_type")) for l in real)
    landing_counter = Counter(l.get("landing_page") for l in real if l.get("landing_page"))
    campaign_counter = Counter(l.get("utm_campaign") for l in real if l.get("utm_campaign"))
    src_other_pct = (
        sum(1 for l in real if bucket_source(l.get("source")) == "other") / len(real) * 100.0
        if real else 0.0
    )
    return {
        "service_winners": svc_counter.most_common(3),
        "top_landings": landing_counter.most_common(5),
        "top_campaigns": campaign_counter.most_common(3),
        "src_other_pct": src_other_pct,
        "zero_buckets": [b for b in SERVICE_BUCKETS if svc_counter.get(b, 0) == 0],
    }


def format_weekly(metrics: Dict[str, Any], extra: Dict[str, Any], unanswered_wa: Optional[int]) -> str:
    base = format_daily(metrics, unanswered_wa, window_label="last 7 days (LA tz)")
    base = base.replace("📊 Handy & Friend — Daily Lead Report", "📈 Handy & Friend — Weekly Lead Report")
    out = [base, "", "Service winners:"]
    if extra["service_winners"]:
        for s, n in extra["service_winners"]:
            out.append(f"- {s}: {n}")
    else:
        out.append("- (none)")
    out.append("Top landing pages:")
    if extra["top_landings"]:
        for s, n in extra["top_landings"]:
            out.append(f"- {s}: {n}")
    else:
        out.append("- (none)")
    out.append("Top utm_campaign:")
    if extra["top_campaigns"]:
        for s, n in extra["top_campaigns"]:
            out.append(f"- {s}: {n}")
    else:
        out.append("- (none)")
    out.append("Recommendations:")
    if extra["src_other_pct"] > 5.0:
        out.append(f"- ⚠️ source=other share is {extra['src_other_pct']:.1f}% (>5%) — investigate attribution.")
    if extra["zero_buckets"]:
        out.append(f"- zero-lead service buckets: {', '.join(extra['zero_buckets'])}")
    if not (extra["src_other_pct"] > 5.0 or extra["zero_buckets"]):
        out.append("- pipeline healthy; keep current allocation.")
    return "\n".join(out)


# ─── Critical ────────────────────────────────────────────────────────────────

def cmd_critical(sb: Supabase, dry_run: bool) -> int:
    alerts: List[str] = []
    now_utc = datetime.now(timezone.utc)
    cutoff_60 = now_utc - timedelta(minutes=60)

    leads = fetch_leads_window(sb, cutoff_60)
    real = [l for l in leads if l.get("is_test") is False]

    # 1. real lead, no telegram proof, >15 min old
    for l in real:
        if l.get("last_owner_alert_at"):
            continue
        try:
            ca = datetime.fromisoformat(str(l["created_at"]).replace("Z", "+00:00"))
        except Exception:
            continue
        if (now_utc - ca) > timedelta(minutes=15):
            alerts.append(
                f"🚨 HF Critical: lead has no Telegram proof\n"
                f"phone {mask_phone(l.get('phone'))} svc {bucket_service(l.get('service_type'))}\n"
                f"Lead/job: {mask_id(l.get('id'))}\n"
                f"Time: {iso_z(now_utc)}"
            )

    # 2. WhatsApp inbound > 15 min unanswered
    unanswered = fetch_unanswered_whatsapp(sb, minutes=15)
    if unanswered and unanswered > 0:
        alerts.append(
            f"🚨 HF Critical: {unanswered} unanswered WhatsApp inbound > 15 min\n"
            f"Lead/job: n/a\n"
            f"Time: {iso_z(now_utc)}"
        )

    # 3. google_ads_search lead with unknown service_type
    for l in real:
        if bucket_source(l.get("source")) != "google_ads_search":
            continue
        if bucket_service(l.get("service_type")) == "unknown":
            alerts.append(
                f"🚨 HF Critical: google_ads lead with unknown service_type\n"
                f"phone {mask_phone(l.get('phone'))} campaign={l.get('utm_campaign') or 'n/a'}\n"
                f"Lead/job: {mask_id(l.get('id'))}\n"
                f"Time: {iso_z(now_utc)}"
            )

    # 4. attribution leakage: gclid set but source != google_ads_search
    for l in real:
        if l.get("gclid") and bucket_source(l.get("source")) != "google_ads_search":
            alerts.append(
                f"🚨 HF Critical: attribution leakage (gclid present, source={l.get('source') or 'null'})\n"
                f"phone {mask_phone(l.get('phone'))}\n"
                f"Lead/job: {mask_id(l.get('id'))}\n"
                f"Time: {iso_z(now_utc)}"
            )

    # 5. outbound_jobs queue depth
    qd = sb.count("outbound_jobs", "status=in.(pending,retrying)")
    if qd is not None and qd > 0:
        alerts.append(
            f"🚨 HF Critical: outbound_jobs queue depth = {qd}\n"
            f"status in (pending,retrying)\n"
            f"Lead/job: n/a\n"
            f"Time: {iso_z(now_utc)}"
        )

    # 6. telegram_sends failures last 60 min (best-effort)
    status, sample, _ = sb.select("telegram_sends", "select=*&limit=1")
    if status < 400 and sample and "status" in sample[0]:
        fc = sb.count(
            "telegram_sends",
            f"status=in.(failed,error)&created_at=gte.{quote(iso_z(cutoff_60))}",
        )
        if fc and fc > 0:
            alerts.append(
                f"🚨 HF Critical: telegram_sends failures last 60 min = {fc}\n"
                f"Lead/job: n/a\n"
                f"Time: {iso_z(now_utc)}"
            )

    if not alerts:
        msg = "✅ HF Critical scan: no issues in last 60 min."
        if dry_run:
            print(msg)
        # We do NOT spam Telegram with all-clear messages.
        return 0

    sent = 0
    for a in alerts:
        if dry_run:
            print(a)
            print("---")
        else:
            mid = telegram_send(a, dry_run=False)
            if mid:
                sent += 1
    if not dry_run:
        print(json.dumps({"alerts_total": len(alerts), "telegram_sent": sent}))
    return 0


# ─── Daily / Weekly entry ────────────────────────────────────────────────────

def cmd_daily(sb: Supabase, dry_run: bool) -> int:
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    leads = fetch_leads_window(sb, since)
    metrics = build_daily_metrics(leads)
    unanswered = fetch_unanswered_whatsapp(sb, minutes=15)
    msg = format_daily(metrics, unanswered)
    mid = telegram_send(msg, dry_run=dry_run)
    if not dry_run:
        print(json.dumps({"telegram_message_id": mid, "leads_total": metrics["total"], "leads_real": metrics["real"]}))
    return 0


def cmd_weekly(sb: Supabase, dry_run: bool) -> int:
    since = datetime.now(timezone.utc) - timedelta(days=7)
    leads = fetch_leads_window(sb, since)
    metrics = build_daily_metrics(leads)
    extra = build_weekly_extra(leads)
    unanswered = fetch_unanswered_whatsapp(sb, minutes=15)
    msg = format_weekly(metrics, extra, unanswered)
    mid = telegram_send(msg, dry_run=dry_run)
    if not dry_run:
        print(json.dumps({"telegram_message_id": mid, "leads_total": metrics["total"], "leads_real": metrics["real"]}))
    return 0


# ─── Main ────────────────────────────────────────────────────────────────────

def main(argv: List[str]) -> int:
    parser = argparse.ArgumentParser(description="OpenClaw Lead Reporter")
    parser.add_argument("subcommand", choices=["audit", "daily", "weekly", "critical"])
    parser.add_argument("--dry-run", action="store_true", help="print to stdout instead of Telegram")
    args = parser.parse_args(argv)

    # Load .env.production if not pre-loaded by wrapper.
    load_env_file(REPO_ROOT / ".env.production")

    sb = Supabase(url=env("SUPABASE_URL"), key=env("SUPABASE_SERVICE_ROLE_KEY"))

    if args.subcommand == "audit":
        return cmd_audit(sb)

    # Idempotency for non-audit, non-dry-run runs.
    if not args.dry_run:
        if not idempotency_check(args.subcommand):
            print(f"skip: {args.subcommand} ran < {IDEMPOTENCY_WINDOW_SEC // 60} min ago")
            return 0

    try:
        if args.subcommand == "daily":
            rc = cmd_daily(sb, args.dry_run)
        elif args.subcommand == "weekly":
            rc = cmd_weekly(sb, args.dry_run)
        else:
            rc = cmd_critical(sb, args.dry_run)
    except Exception as e:
        print(f"ERROR: {args.subcommand} failed: {e}", file=sys.stderr)
        return 1

    if not args.dry_run and rc == 0:
        idempotency_mark(args.subcommand)
    return rc


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
