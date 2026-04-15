#!/usr/bin/env python3
"""Create quote drafts for approved frontline services.

Usage:
  python3 quote_draft.py --lead-id <UUID> --service tv_mounting
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(Path(__file__).parent.parent / ".env.local")
load_dotenv(Path(__file__).parent.parent / ".env.production")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

QUOTE_TEMPLATES: dict[str, dict[str, Any]] = {
    "tv_mounting": {
        "price_low": 150,
        "price_high": 185,
        "inclusions": "Mount installation, alignment, standard cable management",
        "exclusions": "TV purchase and pre-existing wall damage repair",
        "next_step": "Send TV size and wall photo for exact range confirmation",
    },
    "drywall": {
        "price_low": 120,
        "price_high": 250,
        "inclusions": "Patch repair, prep, basic finish",
        "exclusions": "Full-wall repaint",
        "next_step": "Send damage photo to confirm size and final range",
    },
    "furniture_assembly": {
        "price_low": 150,
        "price_high": 275,
        "inclusions": "Assembly and leveling per manufacturer instructions",
        "exclusions": "Packaging disposal",
        "next_step": "Send item model/photo and number of pieces",
    },
}


def build_text(service: str, tpl: dict[str, Any]) -> str:
    return (
        f"Hi, thanks for reaching out to Handy & Friend.\n\n"
        f"For {service.replace('_', ' ')}, pricing starts at ${tpl['price_low']} and can be up to ${tpl['price_high']} depending on scope.\n"
        f"Included: {tpl['inclusions']}.\n"
        f"Not included: {tpl['exclusions']}.\n"
        f"Next step: {tpl['next_step']}.\n\n"
        f"Reply or call (213) 361-1700 to schedule."
    )


def send_telegram(msg: str) -> None:
    if not BOT_TOKEN or not CHAT_ID:
        return
    requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={"chat_id": CHAT_ID, "text": msg},
        timeout=20,
    )


def main(lead_id: str, service: str) -> None:
    if service not in QUOTE_TEMPLATES:
        raise ValueError(f"Unsupported service {service}")

    lead_resp = supabase.table("leads").select("id,full_name,phone,service_type").eq("id", lead_id).limit(1).execute().data
    if not lead_resp:
        raise RuntimeError(f"Lead not found: {lead_id}")
    lead = lead_resp[0]

    tpl = QUOTE_TEMPLATES[service]
    full_text = build_text(service, tpl)

    inserted = (
        supabase.table("quotes_drafts")
        .insert(
            {
                "lead_id": lead_id,
                "service_type": service,
                "price_low": tpl["price_low"],
                "price_high": tpl["price_high"],
                "inclusions": tpl["inclusions"],
                "exclusions": tpl["exclusions"],
                "next_step": tpl["next_step"],
                "full_text": full_text,
                "status": "draft",
            }
        )
        .execute()
        .data
    )
    draft_id = inserted[0]["id"] if inserted else "unknown"

    send_telegram(
        "QUOTE DRAFT READY\nLead: {name} | {phone}\nService: {service}\nDraft ID: {draft_id}\n\n{txt}\n\nReply APPROVE or EDIT.".format(
            name=lead.get("full_name") or "?",
            phone=lead.get("phone") or "?",
            service=service,
            draft_id=draft_id,
            txt=full_text[:1200],
        )
    )
    print(f"Draft created: {draft_id}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--lead-id", required=True)
    parser.add_argument("--service", required=True, choices=["tv_mounting", "drywall", "furniture_assembly"])
    args = parser.parse_args()
    main(args.lead_id, args.service)
