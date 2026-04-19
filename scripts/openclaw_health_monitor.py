#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import sys
import traceback
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


UTC = dt.timezone.utc


@dataclass
class Thresholds:
    degraded_hours: int = 6
    dead_hours: int = 12
    rejection_warn_pct: float = 80.0
    rejection_critical_pct: float = 100.0
    process_stale_minutes: int = 120


class MonitorError(Exception):
    pass


def utc_now() -> dt.datetime:
    return dt.datetime.now(tz=UTC)


def parse_iso(ts: Optional[str]) -> Optional[dt.datetime]:
    if not ts:
        return None
    try:
        return dt.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(UTC)
    except Exception:
        return None


def ensure_log_path(path: pathlib.Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def log_line(log_path: pathlib.Path, message: str) -> None:
    ensure_log_path(log_path)
    stamp = utc_now().isoformat()
    with log_path.open("a", encoding="utf-8") as f:
        f.write(f"[{stamp}] {message}\n")


def load_columns_cache(cache_path: pathlib.Path) -> List[str]:
    try:
        if not cache_path.exists():
            return []
        raw = json.loads(cache_path.read_text(encoding="utf-8"))
        cols = raw.get("columns")
        if isinstance(cols, list):
            return [str(c) for c in cols if isinstance(c, str) and c.strip()]
    except Exception:
        pass
    return []


def save_columns_cache(cache_path: pathlib.Path, columns: List[str]) -> None:
    ensure_log_path(cache_path)
    payload = {
        "columns": sorted(set(columns)),
        "updated_at": utc_now().isoformat(),
    }
    cache_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_yaml_thresholds(candidate_paths: List[pathlib.Path], log_path: pathlib.Path) -> Dict[str, Any]:
    try:
        import yaml  # type: ignore
    except Exception:
        log_line(log_path, "yaml parser unavailable, using default thresholds")
        return {}

    for p in candidate_paths:
        if not p.exists():
            continue
        try:
            content = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
            source_health = content.get("source_health") or {}
            if isinstance(source_health, dict):
                log_line(log_path, f"loaded thresholds from {p}")
                return source_health
        except Exception as e:
            log_line(log_path, f"failed to parse rules file {p}: {e}")
    return {}


def build_thresholds(log_path: pathlib.Path) -> Thresholds:
    base = Thresholds()
    candidates = [
        pathlib.Path(os.path.expanduser("~/handy-friend-ops/docs/rules-registry.yaml")),
        pathlib.Path("/Users/sergiikuropiatnyk/handy-friend-ops/docs/rules-registry.yaml"),
        pathlib.Path("docs/rules-registry.yaml"),
    ]
    cfg = load_yaml_thresholds(candidates, log_path)

    def get_int(key: str, default: int) -> int:
        v = cfg.get(key)
        if isinstance(v, (int, float)):
            return int(v)
        return default

    def get_float(key: str, default: float) -> float:
        v = cfg.get(key)
        if isinstance(v, (int, float)):
            return float(v)
        return default

    return Thresholds(
        degraded_hours=get_int("degraded_hours", base.degraded_hours),
        dead_hours=get_int("dead_hours", base.dead_hours),
        rejection_warn_pct=get_float("rejection_warn_pct", base.rejection_warn_pct),
        rejection_critical_pct=get_float("rejection_critical_pct", base.rejection_critical_pct),
        process_stale_minutes=get_int("process_stale_minutes", base.process_stale_minutes),
    )


def http_json(method: str, url: str, headers: Dict[str, str], body: Optional[Dict[str, Any]] = None) -> Tuple[int, Any]:
    data = None
    req_headers = dict(headers)
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url=url, method=method, headers=req_headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            if raw.strip():
                try:
                    return resp.status, json.loads(raw)
                except json.JSONDecodeError:
                    return resp.status, raw
            return resp.status, None
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        parsed: Any = raw
        try:
            parsed = json.loads(raw)
        except Exception:
            pass
        return e.code, parsed


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise MonitorError(f"Missing required env var: {name}")
    return value


def telegram_token_from_env() -> str:
    # Preferred: TELEGRAM_BOT_TOKEN
    # Compatibility fallback: TELEGRAM_WEBHOOK_SECRET (legacy env in some nodes)
    return (
        os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        or os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip()
    )


def supabase_headers(api_key: str) -> Dict[str, str]:
    return {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
    }


def detect_sources_file(log_path: pathlib.Path) -> Optional[pathlib.Path]:
    explicit = os.getenv("NEXTDOOR_SOURCES_PATH", "").strip()
    if explicit:
        p = pathlib.Path(os.path.expanduser(explicit))
        if p.exists():
            return p

    openclaw_root = os.getenv("OPENCLAW_ROOT", "").strip()
    candidates = []
    if openclaw_root:
        r = pathlib.Path(os.path.expanduser(openclaw_root))
        candidates.extend([
            r / "nextdoor_sources.json",
            r / "config" / "nextdoor_sources.json",
            r / "configs" / "nextdoor_sources.json",
        ])

    candidates.extend([
        pathlib.Path(os.path.expanduser("~/handy-friend-ops/nextdoor_sources.json")),
        pathlib.Path(os.path.expanduser("~/handy-friend-ops/config/nextdoor_sources.json")),
        pathlib.Path(os.path.expanduser("~/tg-scanner/nextdoor_sources.json")),
        pathlib.Path("nextdoor_sources.json"),
        pathlib.Path("config/nextdoor_sources.json"),
    ])

    for c in candidates:
        if c.exists():
            return c

    log_line(log_path, "nextdoor_sources.json not found in known locations")
    return None


def parse_sources(data: Any) -> List[Dict[str, str]]:
    entries: List[Dict[str, str]] = []
    if isinstance(data, list):
        for i, item in enumerate(data, 1):
            if isinstance(item, str):
                entries.append({"name": f"ND Source {i}", "url": item})
            elif isinstance(item, dict):
                url = str(item.get("url") or item.get("feed") or item.get("source") or "").strip()
                name = str(item.get("name") or item.get("id") or f"ND Source {i}").strip()
                if url:
                    entries.append({"name": name, "url": url})
    elif isinstance(data, dict):
        raw = data.get("sources") or data.get("nextdoor_sources") or []
        return parse_sources(raw)
    return entries


def check_source_payload_nonempty(raw: bytes) -> bool:
    if not raw:
        return False
    text = raw.decode("utf-8", errors="replace").strip()
    if not text:
        return False
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            return len(parsed) > 0
        if isinstance(parsed, dict):
            if isinstance(parsed.get("posts"), list):
                return len(parsed["posts"]) > 0
            if isinstance(parsed.get("items"), list):
                return len(parsed["items"]) > 0
            return len(parsed.keys()) > 0
    except Exception:
        pass
    return len(text) > 2


def fetch_source(url: str) -> Tuple[bool, str]:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme in ("http", "https"):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "hf-openclaw-health/1.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                raw = resp.read()
                if check_source_payload_nonempty(raw):
                    return True, f"HTTP {resp.status}, non-empty"
                return False, f"HTTP {resp.status}, empty payload"
        except urllib.error.HTTPError as e:
            return False, f"HTTPError {e.code}"
        except Exception as e:
            return False, f"FetchError {type(e).__name__}: {e}"

    # local file path feed
    p = pathlib.Path(os.path.expanduser(url))
    if p.exists() and p.is_file():
        raw = p.read_bytes()
        if check_source_payload_nonempty(raw):
            return True, "FILE non-empty"
        return False, "FILE empty payload"
    return False, "Unsupported source URL/path"


def classify_source_name(name: str) -> str:
    low = (name or "").lower()
    if "craigslist" in low or low.startswith("cl"):
        return "CL"
    if "nextdoor" in low or low.startswith("nd"):
        return "ND"
    return "OTHER"


def get_social_leads(base_url: str, api_key: str, log_path: pathlib.Path) -> List[Dict[str, Any]]:
    fields = "source,platform,lead_detected_at,last_action_at,created_at,stage,lead_quality"
    query = f"social_leads?select={urllib.parse.quote(fields, safe=',')}&order=lead_detected_at.desc.nullslast,created_at.desc.nullslast&limit=400"
    url = f"{base_url}/rest/v1/{query}"
    status, payload = http_json("GET", url, supabase_headers(api_key))
    if status >= 300:
        raise MonitorError(f"Supabase query failed social_leads: HTTP {status} payload={payload}")
    if not isinstance(payload, list):
        log_line(log_path, f"unexpected social_leads payload type: {type(payload).__name__}")
        return []
    return payload


def source_key(row: Dict[str, Any]) -> str:
    source_val = str(row.get("source") or "").strip()
    platform_val = str(row.get("platform") or "").strip()
    # Legacy rows used source="scanner"; use platform to recover true channel.
    if source_val.lower() in {"scanner", "social_scanner", "ingest"} and platform_val:
        value = platform_val
    else:
        value = source_val or platform_val
    if not value:
        return "UNKNOWN"
    low = value.lower()
    if "nextdoor" in low:
        return "ND"
    if "facebook" in low or low in {"fb", "meta"}:
        return "ND"
    if "craigslist" in low or low.startswith("cl"):
        return "CL"
    return value


def compute_freshness(rows: List[Dict[str, Any]], thresholds: Thresholds) -> Dict[str, Dict[str, Any]]:
    now = utc_now()
    latest: Dict[str, Optional[dt.datetime]] = {"ND": None, "CL": None}

    for r in rows:
        k = source_key(r)
        if k not in latest:
            continue
        ts = parse_iso(str(r.get("last_action_at") or r.get("lead_detected_at") or r.get("created_at") or ""))
        if not ts:
            continue
        prev = latest.get(k)
        if prev is None or ts > prev:
            latest[k] = ts

    out: Dict[str, Dict[str, Any]] = {}
    for k in ("ND", "CL"):
        ts = latest.get(k)
        if ts is None:
            out[k] = {"status": "DEAD", "hours_since": None, "last_at": None}
            continue
        hours = (now - ts).total_seconds() / 3600
        if hours > thresholds.dead_hours:
            st = "DEAD"
        elif hours > thresholds.degraded_hours:
            st = "DEGRADED"
        else:
            st = "ALIVE"
        out[k] = {"status": st, "hours_since": round(hours, 2), "last_at": ts.isoformat()}

    return out


def compute_rejection(rows: List[Dict[str, Any]], thresholds: Thresholds) -> Dict[str, Dict[str, Any]]:
    buckets: Dict[str, List[Dict[str, Any]]] = {"ND": [], "CL": []}
    for r in rows:
        k = source_key(r)
        if k in buckets and len(buckets[k]) < 50:
            buckets[k].append(r)

    out: Dict[str, Dict[str, Any]] = {}
    for k, arr in buckets.items():
        if not arr:
            out[k] = {"rate": None, "count": 0, "status": "NO_DATA"}
            continue
        rejected = 0
        for r in arr:
            stage = str(r.get("stage") or "").lower()
            quality = str(r.get("lead_quality") or "").lower()
            if stage in {"junk", "duplicate"} or quality == "bad":
                rejected += 1
        rate = (rejected / len(arr)) * 100.0
        if rate >= thresholds.rejection_critical_pct:
            status = "CRITICAL"
        elif rate > thresholds.rejection_warn_pct:
            status = "WARN"
        else:
            status = "OK"
        out[k] = {"rate": round(rate, 1), "count": len(arr), "rejected": rejected, "status": status}
    return out


def process_recently_active(process_hints: List[str], stale_minutes: int, extra_logs: List[pathlib.Path] | None = None) -> Tuple[bool, str]:
    # Active process check
    try:
        ps = subprocess.run(["bash", "-lc", "ps aux"], capture_output=True, text=True, check=False)
        for hint in process_hints:
            if hint and hint in ps.stdout:
                return True, f"running process: {hint}"
    except Exception:
        pass

    # Log freshness fallback (current runtime first, legacy paths second)
    candidates: List[pathlib.Path] = []
    if extra_logs:
        candidates.extend(extra_logs)
    candidates.extend([
        pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/social-scanner.log")),
        pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/fb-ingest.log")),
        pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/cl-ingest.log")),
        pathlib.Path(os.path.expanduser("~/handy-friend-ops/logs/hunter.log")),
        pathlib.Path("ops/hunter.log"),
    ])

    now_ts = utc_now().timestamp()
    seen_any = False
    for p in candidates:
        if not p.exists():
            continue
        seen_any = True
        age_min = (now_ts - p.stat().st_mtime) / 60.0
        if age_min <= stale_minutes:
            return True, f"fresh log {p} age={age_min:.1f}m"

    if seen_any:
        return False, "all candidate logs stale"
    return False, "no process and no log"


def build_digest(
    freshness: Dict[str, Dict[str, Any]],
    rejection: Dict[str, Dict[str, Any]],
    nd_feed: List[Dict[str, Any]],
    scanner_ok: Dict[str, Tuple[bool, str]],
    overall_status: str,
) -> str:
    nd1 = nd_feed[0]["status"] if len(nd_feed) > 0 else "UNKNOWN"
    nd2 = nd_feed[1]["status"] if len(nd_feed) > 1 else "UNKNOWN"
    nd3 = nd_feed[2]["status"] if len(nd_feed) > 2 else "UNKNOWN"
    cl_status = freshness.get("CL", {}).get("status", "UNKNOWN")

    nd_rate = rejection.get("ND", {}).get("rate")
    cl_rate = rejection.get("CL", {}).get("rate")

    nd_rate_text = f"{nd_rate}%" if nd_rate is not None else "N/A"
    cl_rate_text = f"{cl_rate}%" if cl_rate is not None else "N/A"

    scan_hint = []
    for k, v in scanner_ok.items():
        scan_hint.append(f"{k}:{'OK' if v[0] else 'FAIL'}")
    scan_line = ", ".join(scan_hint)

    return "\n".join([
        "SOURCE HEALTH REPORT",
        f"ND Source 1: {nd1}",
        f"ND Source 2: {nd2}",
        f"ND Source 3: {nd3}",
        f"CL: {cl_status}",
        f"Rejection rate ND: {nd_rate_text}",
        f"Rejection rate CL: {cl_rate_text}",
        f"Scanner checks: {scan_line}",
        f"Status: {overall_status}",
    ])


def send_telegram(token: str, chat_id: str, text: str) -> Tuple[bool, str]:
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text}
    status, body = http_json("POST", url, headers={}, body=payload)
    if status < 300 and isinstance(body, dict) and body.get("ok"):
        return True, "sent"
    return False, f"telegram failed status={status} body={body}"


def _alert_state_path() -> pathlib.Path:
    return pathlib.Path(os.path.expanduser("~/handy-friend-ops/logs/openclaw_health_alert_state.json"))


def load_alert_state() -> Dict[str, Any]:
    path = _alert_state_path()
    try:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return {}


def save_alert_state(state: Dict[str, Any]) -> None:
    path = _alert_state_path()
    ensure_log_path(path)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def should_send_telegram_alert(overall_status: str, sev3_reasons: List[str], digest: str) -> Tuple[bool, str]:
    mode = os.getenv("OPENCLAW_HEALTH_TG_MODE", "critical_only").strip().lower()
    cooldown_min = int(os.getenv("OPENCLAW_HEALTH_TG_COOLDOWN_MIN", "180"))
    repeat_same_digest_min = int(os.getenv("OPENCLAW_HEALTH_TG_REPEAT_SAME_DIGEST_MIN", "720"))

    if mode == "off":
        return False, "telegram disabled by OPENCLAW_HEALTH_TG_MODE=off"
    if mode == "critical_only" and (overall_status != "RED" or not sev3_reasons):
        return False, "not critical (requires RED + sev3 reasons)"
    if mode not in {"critical_only", "all_non_green"} and overall_status == "GREEN":
        return False, "green status"
    if mode == "all_non_green" and overall_status == "GREEN":
        return False, "green status"

    state = load_alert_state()
    last_sent_ts = parse_iso(str(state.get("last_sent_at") or ""))
    last_hash = str(state.get("last_digest_hash") or "")
    digest_hash = hashlib.sha256(digest.encode("utf-8")).hexdigest()
    now = utc_now()

    if last_sent_ts:
        age_min = (now - last_sent_ts).total_seconds() / 60.0
        if last_hash == digest_hash and age_min < repeat_same_digest_min:
            return False, f"digest unchanged ({age_min:.1f}m<{repeat_same_digest_min}m repeat window)"
        if age_min < cooldown_min:
            return False, f"cooldown active ({age_min:.1f}m<{cooldown_min}m)"

    return True, "eligible"


def write_incident_supabase(base_url: str, api_key: str, summary: str, details: Dict[str, Any], status: str, log_path: pathlib.Path) -> Tuple[bool, str]:
    sev = "SEV3" if status == "RED" else ("SEV2" if status == "YELLOW" else "INFO")
    endpoint = f"{base_url}/rest/v1/ops_incidents"
    headers = supabase_headers(api_key)
    headers["Prefer"] = "return=minimal"
    cache_path = pathlib.Path(os.path.expanduser("~/handy-friend-ops/logs/ops_incidents_columns_cache.json"))

    now_iso = utc_now().isoformat()
    # Start with minimal payload compatible with Handy & Friend ops_incidents schema.
    # If schema differs, adaptive retries below will adjust.
    payload: Dict[str, Any] = {
        "system_name": "openclaw_health_monitor",
        "issue_type": "SOURCE_HEALTH",
        "severity": 3 if sev == "SEV3" else (2 if sev == "SEV2" else 0),
        "status": "open" if sev in {"SEV2", "SEV3"} else "resolved",
        "summary": summary,
        "evidence": details,
        "detected_at": now_iso,
        "last_seen_at": now_iso,
        "created_by": "openclaw_health_monitor",
    }
    # Optional compatibility keys for other schemas.
    payload.update({
        "incident_type": "OPENCLAW_HEALTH",
        "type": "OPENCLAW_HEALTH",
        "category": "OPENCLAW_HEALTH",
        "source": "openclaw_health_monitor",
        "message": summary,
        "title": "OPENCLAW_HEALTH",
        "body": summary,
        "details": details,
        "payload": details,
        "meta": details,
        "context": details,
        "data": details,
        "occurred_at": now_iso,
        "created_at": now_iso,
        "updated_at": now_iso,
    })

    # If we already know accepted columns, avoid noisy retries.
    cached_columns = load_columns_cache(cache_path)
    if cached_columns:
        payload = {k: v for k, v in payload.items() if k in cached_columns}
        log_line(log_path, f"ops_incidents using cached columns ({len(cached_columns)})")

    # Schema-adaptive insert:
    # If PostgREST reports a missing column (PGRST204), drop it and retry.
    for _ in range(25):
        code, resp = http_json("POST", endpoint, headers=headers, body=payload)
        if code in (200, 201, 204):
            save_columns_cache(cache_path, list(payload.keys()))
            return True, f"incident written (HTTP {code})"

        if (
            code == 400
            and isinstance(resp, dict)
            and resp.get("code") == "PGRST204"
            and isinstance(resp.get("message"), str)
            and "Could not find the '" in resp["message"]
        ):
            msg = resp["message"]
            try:
                missing = msg.split("Could not find the '", 1)[1].split("'", 1)[0]
            except Exception:
                missing = ""
            if missing and missing in payload:
                payload.pop(missing, None)
                log_line(log_path, f"ops_incidents retry without column={missing}")
                if not payload:
                    return False, "ops_incidents payload exhausted after schema retries"
                save_columns_cache(cache_path, list(payload.keys()))
                continue

        # Some schemas store severity as integer (e.g. 3/2/0) rather than text (SEV3/SEV2/INFO).
        if (
            code == 400
            and isinstance(resp, dict)
            and resp.get("code") == "22P02"
            and "severity" in payload
            and isinstance(payload.get("severity"), str)
            and isinstance(resp.get("message"), str)
            and "invalid input syntax for type integer" in resp["message"]
        ):
            sev_map = {"SEV3": 3, "SEV2": 2, "INFO": 0}
            payload["severity"] = sev_map.get(str(payload["severity"]), 0)
            log_line(log_path, f"ops_incidents retry with integer severity={payload['severity']}")
            continue

        # If NOT NULL constraint fails, add known defaults and retry.
        if (
            code == 400
            and isinstance(resp, dict)
            and resp.get("code") == "23502"
            and isinstance(resp.get("message"), str)
            and "null value in column" in resp["message"]
        ):
            msg = resp["message"]
            missing_col = ""
            try:
                missing_col = msg.split('null value in column "', 1)[1].split('"', 1)[0]
            except Exception:
                missing_col = ""
            default_map: Dict[str, Any] = {
                "system_name": "openclaw_health_monitor",
                "issue_type": "SOURCE_HEALTH",
                "status": "open" if sev in {"SEV2", "SEV3"} else "resolved",
                "summary": summary,
                "severity": 3 if sev == "SEV3" else (2 if sev == "SEV2" else 0),
                "detected_at": now_iso,
                "last_seen_at": now_iso,
                "created_by": "openclaw_health_monitor",
                "evidence": details,
            }
            if missing_col and missing_col in default_map:
                payload[missing_col] = default_map[missing_col]
                log_line(log_path, f"ops_incidents retry with required column={missing_col}")
                continue

        log_line(log_path, f"ops_incidents insert failed code={code} resp={resp} payload_keys={sorted(payload.keys())}")
        return False, "ops_incidents insert failed"

    return False, "ops_incidents insert retries exceeded"


def _load_env_file() -> None:
    """Load env vars from ~/handy-friend-ops/.env if it exists and vars are not already set."""
    env_file = pathlib.Path(os.path.expanduser("~/handy-friend-ops/.env"))
    if not env_file.is_file():
        return
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


def main() -> int:
    _load_env_file()
    parser = argparse.ArgumentParser(description="OpenClaw health monitor for Handy & Friend")
    parser.add_argument("--test", action="store_true", help="Run checks without sending Telegram or writing incidents")
    parser.add_argument("--sources-path", default="", help="Path to nextdoor_sources.json")
    parser.add_argument("--log-path", default=os.path.expanduser("~/handy-friend-ops/logs/health_monitor.log"))
    args = parser.parse_args()

    log_path = pathlib.Path(os.path.expanduser(args.log_path))
    ensure_log_path(log_path)

    try:
        supabase_url = require_env("SUPABASE_URL").rstrip("/")
        supabase_key = os.getenv("SUPABASE_KEY", "").strip() or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not supabase_key:
            raise MonitorError("Missing required env var: SUPABASE_KEY or SUPABASE_SERVICE_ROLE_KEY")

        tg_token = telegram_token_from_env()
        tg_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()

        thresholds = build_thresholds(log_path)
        log_line(log_path, f"thresholds: {thresholds}")

        rows = get_social_leads(supabase_url, supabase_key, log_path)
        freshness = compute_freshness(rows, thresholds)
        rejection = compute_rejection(rows, thresholds)

        if args.sources_path:
            os.environ["NEXTDOOR_SOURCES_PATH"] = args.sources_path
        sources_file = detect_sources_file(log_path)

        nd_feed_results: List[Dict[str, Any]] = []
        if sources_file and sources_file.exists():
            try:
                parsed = json.loads(sources_file.read_text(encoding="utf-8"))
                sources = parse_sources(parsed)
                for src in sources[:3]:
                    ok, detail = fetch_source(src["url"])
                    nd_feed_results.append({
                        "name": src["name"],
                        "url": src["url"],
                        "status": "ALIVE" if ok else "DEAD",
                        "detail": detail,
                    })
            except Exception as e:
                nd_feed_results.append({"name": "ND parse", "url": str(sources_file), "status": "DEAD", "detail": f"ParseError: {e}"})
        else:
            nd_feed_results.append({"name": "ND source file", "url": "N/A", "status": "DEAD", "detail": "nextdoor_sources.json not found"})

        cl_ok, cl_reason = process_recently_active(["craigslist-social-ingest.py", "social_scanner.py"], thresholds.process_stale_minutes, [pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/cl-ingest.log")), pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/social-scanner.log"))])
        nd_ok, nd_reason = process_recently_active(["fb-social-ingest.sh", "social_scanner.py"], thresholds.process_stale_minutes, [pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/fb-ingest.log")), pathlib.Path(os.path.expanduser("~/handy-friend-landing-v6/ops/social-scanner.log"))])
        scanner_ok = {"CL": (cl_ok, cl_reason), "ND": (nd_ok, nd_reason)}

        # Severity/status calculation
        sev2_reasons: List[str] = []
        sev3_reasons: List[str] = []

        for k in ("ND", "CL"):
            st = freshness.get(k, {}).get("status")
            if st == "DEAD":
                sev2_reasons.append(f"{k} freshness DEAD")
            elif st == "DEGRADED":
                sev2_reasons.append(f"{k} freshness DEGRADED")

        if all(freshness.get(k, {}).get("status") in {"DEAD", "DEGRADED"} for k in ("ND", "CL")):
            if not all(v[0] for v in scanner_ok.values()):
                sev3_reasons.append("all sources degraded/dead and scanner unhealthy")
            else:
                sev2_reasons.append("all sources stale but scanners running")

        for k in ("ND", "CL"):
            rstat = rejection.get(k, {}).get("status")
            if rstat == "CRITICAL":
                sev2_reasons.append(f"{k} rejection 100%")
            elif rstat == "WARN":
                sev2_reasons.append(f"{k} rejection > threshold")

        for k, (ok, reason) in scanner_ok.items():
            if not ok:
                sev3_reasons.append(f"{k} scanner stale/down: {reason}")

        dead_feeds = [x for x in nd_feed_results if x.get("status") != "ALIVE"]
        if dead_feeds:
            sev2_reasons.append(f"nextdoor dead feeds: {len(dead_feeds)}")

        overall_status = "GREEN"
        if sev3_reasons:
            overall_status = "RED"
        elif sev2_reasons:
            overall_status = "YELLOW"

        digest = build_digest(freshness, rejection, nd_feed_results, scanner_ok, overall_status)

        details: Dict[str, Any] = {
            "ts": utc_now().isoformat(),
            "freshness": freshness,
            "rejection": rejection,
            "nextdoor_feed_checks": nd_feed_results,
            "scanner_checks": {k: {"ok": v[0], "reason": v[1]} for k, v in scanner_ok.items()},
            "sev2_reasons": sev2_reasons,
            "sev3_reasons": sev3_reasons,
            "rules": {
                "degraded_hours": thresholds.degraded_hours,
                "dead_hours": thresholds.dead_hours,
                "rejection_warn_pct": thresholds.rejection_warn_pct,
                "rejection_critical_pct": thresholds.rejection_critical_pct,
                "process_stale_minutes": thresholds.process_stale_minutes,
            },
            "sources_file": str(sources_file) if sources_file else None,
            "openclaw_root": os.getenv("OPENCLAW_ROOT", "").strip() or None,
        }

        # local report always
        latest_json = pathlib.Path(os.path.expanduser("~/handy-friend-ops/logs/openclaw_health_monitor_latest.json"))
        ensure_log_path(latest_json)
        latest_json.write_text(json.dumps({"status": overall_status, "digest": digest, "details": details}, indent=2), encoding="utf-8")
        log_line(log_path, f"status={overall_status} sev2={len(sev2_reasons)} sev3={len(sev3_reasons)}")

        if not args.test:
            ok_inc, inc_msg = write_incident_supabase(supabase_url, supabase_key, digest, details, overall_status, log_path)
            log_line(log_path, f"incident_write: {ok_inc} {inc_msg}")

            if tg_token and tg_chat:
                allow_tg, tg_reason = should_send_telegram_alert(overall_status, sev3_reasons, digest)
                if allow_tg:
                    ok_tg, tg_msg = send_telegram(tg_token, tg_chat, digest)
                    log_line(log_path, f"telegram: {ok_tg} {tg_msg}")
                    if ok_tg:
                        save_alert_state(
                            {
                                "last_sent_at": utc_now().isoformat(),
                                "last_status": overall_status,
                                "last_digest_hash": hashlib.sha256(digest.encode("utf-8")).hexdigest(),
                            }
                        )
                else:
                    log_line(log_path, f"telegram skipped: {tg_reason}")
            else:
                log_line(log_path, "telegram skipped: TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET or TELEGRAM_CHAT_ID missing")

        print(digest)
        return 0

    except Exception as e:
        err = f"fatal: {type(e).__name__}: {e}"
        log_line(log_path, err)
        log_line(log_path, traceback.format_exc())

        tg_token = telegram_token_from_env()
        tg_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()
        if tg_token and tg_chat:
            try:
                send_telegram(tg_token, tg_chat, f"SOURCE HEALTH REPORT\nStatus: RED\nError: {err}")
            except Exception:
                pass

        print(err, file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
