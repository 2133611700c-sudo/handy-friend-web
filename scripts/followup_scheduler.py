#!/usr/bin/env python3
"""Handy & Friend follow-up scheduler.

Runs hourly and creates Day 1/3/7 follow-up entries.
No free generation; templates are fixed in this file.
"""

from __future__ import annotations

import os
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env.production")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")
MAX_ALERTS_PER_RUN = int(os.environ.get("FOLLOWUP_MAX_ALERTS", "8"))
ALLOWED_STATUSES = {s.strip() for s in os.environ.get("FOLLOWUP_ALLOWED_STATUSES", "contacted,quote_sent").split(",") if s.strip()}

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

TEMPLATES: dict[str, dict[int, str]] = {
    "tv_mounting": {
        1: "Hi {name}, Sergii from Handy & Friend. Sent a TV mounting quote. Any questions? Availability this week. (213) 361-1700",
        3: "Hi {name}, checking in on TV mounting. Still need help this week? (213) 361-1700",
        7: "Hi {name}, last check-in on TV mounting. We can help when timing works. (213) 361-1700",
    },
    "drywall": {
        1: "Hi {name}, Sergii from Handy & Friend. Sent drywall estimate. Want to schedule? (213) 361-1700",
        3: "Hi {name}, still need drywall repair this week? (213) 361-1700",
        7: "Hi {name}, last check on drywall repair from Handy & Friend. (213) 361-1700",
    },
    "furniture": {
        1: "Hi {name}, Sergii from Handy & Friend. Sent furniture assembly details. Ready when you are. (213) 361-1700",
        3: "Hi {name}, still need furniture assembly this week? (213) 361-1700",
        7: "Hi {name}, last follow-up on furniture assembly from Handy & Friend. (213) 361-1700",
    },
    "default": {
        1: "Hi {name}, Sergii from Handy & Friend. Sent your quote. Any questions? (213) 361-1700",
        3: "Hi {name}, following up. Still need help this week? (213) 361-1700",
        7: "Hi {name}, last check-in from Handy & Friend. Happy to help when ready. (213) 361-1700",
    },
}


def log_incident(system_name: str, severity: int, summary: str, issue_type: str = "followup_scheduler") -> None:
    # Live schema compatibility: ops_incidents(system_name,severity,status,issue_type,summary,created_by)
    supabase.table("ops_incidents").insert(
        {
            "system_name": system_name,
            "severity": severity,
            "status": "open",
            "issue_type": issue_type,
            "summary": summary[:500],
            "created_by": "followup_scheduler",
        }
    ).execute()


def canonical_service(raw: str | None) -> str:
    v = (raw or "").lower()
    if "tv" in v:
        return "tv_mounting"
    if "drywall" in v:
        return "drywall"
    if "furniture" in v or "assembly" in v:
        return "furniture"
    return "default"


def template_for(service: str, day_number: int, name: str | None) -> str:
    s = canonical_service(service)
    person = (name or "there").strip()
    return TEMPLATES[s][day_number].format(name=person)


def already_sent(lead_id: str, day_number: int) -> bool:
    data = (
        supabase.table("followups_log")
        .select("id")
        .eq("lead_id", lead_id)
        .eq("day_number", day_number)
        .limit(1)
        .execute()
        .data
    )
    return bool(data)


def send_telegram(text: str) -> None:
    if not BOT_TOKEN or not CHAT_ID:
        log_incident("followup_scheduler", 2, "Telegram env missing: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
        return
    try:
        script_path = Path(__file__).parent / "send-telegram.mjs"
        resp = subprocess.run(
            [
                "node",
                str(script_path),
                "--source",
                "followup_scheduler",
                "--category",
                "followup_pending",
                "--actionable",
                "1",
                "--stdin",
            ],
            input=text,
            text=True,
            capture_output=True,
            timeout=30,
            check=False,
        )
        if resp.returncode != 0:
            stderr = (resp.stderr or resp.stdout or "").strip()
            log_incident("followup_scheduler", 2, f"Telegram send failed: {stderr[:180]}")
            return
    except Exception as exc:  # noqa: BLE001
        log_incident("followup_scheduler", 2, f"Telegram send failed: {exc}")


def _safe_query_leads(cutoff: str) -> list[dict[str, Any]]:
    try:
        return (
            supabase.table("leads")
            .select("id,full_name,phone,service_type,created_at,status,is_test")
            .gte("created_at", cutoff)
            .execute()
            .data
        )
    except Exception as exc:
        log_incident("followup_scheduler", 2, f"eligible_leads query failed: {exc}")
        return []


def eligible_leads() -> list[dict[str, Any]]:
    cutoff = (utcnow() - timedelta(days=14)).isoformat()
    raw = _safe_query_leads(cutoff)
    return [
        row for row in raw
        if (row.get("status") in ALLOWED_STATUSES)
        and bool((row.get("phone") or "").strip())
        and not bool(row.get("is_test"))
    ]


def run() -> int:
    now = utcnow()
    processed = 0
    for lead in eligible_leads():
        if processed >= MAX_ALERTS_PER_RUN:
            break
        lead_id = lead["id"]
        created = datetime.fromisoformat(str(lead["created_at"]).replace("Z", "+00:00"))
        age_days = (now - created).days
        for day_number in (1, 3, 7):
            if age_days >= day_number and not already_sent(lead_id, day_number):
                msg = template_for(lead.get("service_type"), day_number, lead.get("full_name"))
                supabase.table("followups_log").insert(
                    {
                        "lead_id": lead_id,
                        "day_number": day_number,
                        "channel": "sms",
                        "template_id": f"day{day_number}_{canonical_service(lead.get('service_type'))}",
                        "message_sent": msg,
                        "status": "pending",
                    }
                ).execute()
                supabase.table("leads").update({"last_contact_at": now.isoformat()}).eq("id", lead_id).execute()
                send_telegram(
                    "FOLLOW-UP DAY {day}\nName: {name}\nPhone: {phone}\nService: {service}\n\nSend SMS:\n{msg}\n\nReply SENT when done.".format(
                        day=day_number,
                        name=lead.get("full_name") or "?",
                        phone=lead.get("phone") or "?",
                        service=lead.get("service_type") or "unknown",
                        msg=msg,
                    )
                )
                processed += 1
                break
    print(f"Follow-up run complete. Alerts: {processed}")
    return processed


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:  # noqa: BLE001
        try:
            log_incident("followup_scheduler", 1, f"Scheduler failed: {exc}")
        except Exception:
            pass
        raise
