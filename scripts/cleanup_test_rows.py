#!/usr/bin/env python3
"""Cleanup retained synthetic rows older than 30 days.

Default mode is dry-run. Use --execute to perform deletions.
Rows are selected from leads where is_test=true and created_at older than cutoff,
then related rows are deleted from telegram_sends, lead_events, ai_conversations.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib import parse, request, error

ROOT = Path(__file__).resolve().parent.parent


def load_env() -> None:
    for name in (".env.local", ".env.production"):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            if k in os.environ:
                continue
            os.environ[k] = v.strip().strip('"').strip("'")


def http_json(method: str, url: str, headers: dict[str, str], body: dict | None = None):
    payload = None
    hdr = dict(headers)
    if body is not None:
        hdr.setdefault("Content-Type", "application/json")
        payload = json.dumps(body).encode("utf-8")
    req = request.Request(url, data=payload, headers=hdr, method=method)
    try:
        with request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            return resp.status, json.loads(raw) if raw else None
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            return exc.code, json.loads(raw)
        except Exception:
            return exc.code, {"raw": raw}


def sb_headers(key: str) -> dict[str, str]:
    return {"apikey": key, "Authorization": f"Bearer {key}"}


def chunked(values: list[str], size: int = 80):
    for i in range(0, len(values), size):
        yield values[i : i + size]


def in_filter(values: list[str]) -> str:
    quoted = ",".join(f'"{v}"' for v in values)
    safe_chars = '(),"'
    return f"in.({parse.quote(quoted, safe=safe_chars)})"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30, help="retention window in days")
    ap.add_argument("--execute", action="store_true", help="perform deletion")
    args = ap.parse_args()

    load_env()
    base = os.environ.get("SUPABASE_URL", "").rstrip("/") + "/rest/v1"
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base or not key:
        print("ERROR: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 2

    headers = sb_headers(key)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=args.days)).isoformat()
    leads_url = (
        f"{base}/leads?select=id,session_id,created_at"
        f"&is_test=eq.true&created_at=lt.{parse.quote(cutoff)}&limit=5000"
    )
    code, leads = http_json("GET", leads_url, headers)
    if code != 200 or not isinstance(leads, list):
        print(json.dumps({"step": "fetch_test_leads", "status": code, "body": leads}, ensure_ascii=False))
        return 1

    lead_ids = [r.get("id") for r in leads if isinstance(r, dict) and r.get("id")]
    session_ids = [r.get("session_id") for r in leads if isinstance(r, dict) and r.get("session_id")]

    report = {
        "cutoff": cutoff,
        "days": args.days,
        "execute": args.execute,
        "candidate_test_leads": len(lead_ids),
        "deleted": {"telegram_sends": 0, "lead_events": 0, "ai_conversations": 0, "leads": 0},
    }

    if not lead_ids:
        print(json.dumps(report, ensure_ascii=False))
        return 0

    def delete_rows(table: str, field: str, values: list[str]) -> int:
        total = 0
        for part in chunked(values):
            filt = in_filter(part)
            url = f"{base}/{table}?{field}={filt}"
            hdr = dict(headers)
            hdr["Prefer"] = "return=representation"
            if not args.execute:
                c, rows = http_json("GET", f"{url}&select={field}", headers)
                if c == 200 and isinstance(rows, list):
                    total += len(rows)
                continue
            c, rows = http_json("DELETE", url, hdr)
            if c not in (200, 204):
                raise RuntimeError(f"DELETE failed {table}.{field}: {c} {rows}")
            if isinstance(rows, list):
                total += len(rows)
        return total

    report["deleted"]["telegram_sends"] = delete_rows("telegram_sends", "lead_id", lead_ids)
    report["deleted"]["lead_events"] = delete_rows("lead_events", "lead_id", lead_ids)
    if session_ids:
        report["deleted"]["ai_conversations"] = delete_rows("ai_conversations", "session_id", session_ids)
    report["deleted"]["leads"] = delete_rows("leads", "id", lead_ids)

    print(json.dumps(report, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
