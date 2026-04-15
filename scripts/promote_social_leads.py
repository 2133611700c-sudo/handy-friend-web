#!/usr/bin/env python3
"""Promote reviewed social leads rows to leads with dedupe safeguards.

Rules:
- Promote only rows with status='reviewed'
- Dedupe by leads.dedupe_key
- Preserve source attribution
- Mark promoted social rows as reviewed to prevent re-promotion
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local")
load_dotenv(ROOT / ".env.production")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}


def incident(summary: str, severity: int = 2, issue_type: str = "promotion_bridge") -> None:
    payload = {
        "system_name": "promotion_bridge",
        "severity": severity,
        "status": "open",
        "issue_type": issue_type,
        "summary": summary[:500],
        "created_by": "codex",
    }
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/ops_incidents", headers={**HEADERS, "Prefer": "return=minimal"}, json=payload, timeout=20)
    except Exception:
        pass


def get_approved(limit: int) -> list[dict[str, Any]]:
    params = {
        "select": "id,platform,source,author_name,post_text,post_url,source_post_id,service_type,zip,created_at,status",
        "status": "eq.reviewed",
        "order": "created_at.asc",
        "limit": str(limit),
    }
    r = requests.get(f"{SUPABASE_URL}/rest/v1/social_leads", headers=HEADERS, params=params, timeout=30)
    r.raise_for_status()
    return r.json() if isinstance(r.json(), list) else []


def is_synthetic_row(row: dict[str, Any]) -> bool:
    author = (row.get("author_name") or "").lower()
    text = (row.get("post_text") or "").lower()
    return "synthetic" in author or "[e2e-synthetic]" in text


def dedupe_key(row: dict[str, Any]) -> str:
    if row.get("source_post_id"):
        return f"social_post_{row['source_post_id']}"
    if row.get("post_url"):
        return f"social_url_{row['post_url'][:160]}"
    return f"social_id_{row['id']}"


def find_existing_lead(key: str) -> str | None:
    params = {"select": "id", "dedupe_key": f"eq.{key}", "limit": "1"}
    r = requests.get(f"{SUPABASE_URL}/rest/v1/leads", headers=HEADERS, params=params, timeout=20)
    r.raise_for_status()
    data = r.json() if isinstance(r.json(), list) else []
    return data[0]["id"] if data else None


def upsert_social_contacted(social_id: str, lead_id: str | None = None) -> None:
    patch: dict[str, Any] = {"status": "contacted", "last_action_at": datetime.now(timezone.utc).isoformat()}
    if lead_id:
        patch["escalation_reason"] = f"promoted_lead:{lead_id}"
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/social_leads?id=eq.{social_id}",
        headers={**HEADERS, "Prefer": "return=minimal"},
        json=patch,
        timeout=20,
    )
    if r.status_code >= 300:
        raise RuntimeError(f"social update failed {r.status_code}: {r.text[:180]}")


def insert_lead(row: dict[str, Any], key: str) -> str | None:
    social_id = str(row.get("id") or "unknown")
    new_id = f"social_{social_id[:8]}"
    author = (row.get("author_name") or "").lower()
    text = (row.get("post_text") or "").lower()
    is_test = "synthetic" in author or "[e2e-synthetic]" in text
    payload = {
        "id": new_id,
        "source": row.get("platform") or row.get("source") or "social",
        "channel": "social_organic",
        "status": "new",
        "stage": "new",
        "full_name": row.get("author_name") or "Unknown",
        "service_type": row.get("service_type") or "handyman",
        "problem_description": (row.get("post_text") or "")[:1000],
        "zip": row.get("zip"),
        "dedupe_key": key,
        "attribution_source": f"social_leads:{row['id']}",
        "is_test": is_test,
    }
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/leads",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=payload,
        timeout=30,
    )
    if r.status_code >= 300:
        raise RuntimeError(f"lead insert failed {r.status_code}: {r.text[:200]}")
    data = r.json() if isinstance(r.json(), list) else []
    return data[0].get("id") if data else new_id


def run(dry_run: bool, limit: int) -> int:
    rows = get_approved(limit)
    print(f"approved_rows={len(rows)} (status=reviewed)")
    promoted = 0
    skipped = 0
    errors = 0

    for row in rows:
        if is_synthetic_row(row):
            skipped += 1
            print(f"SKIP synthetic social_id={row['id']}")
            if not dry_run:
                try:
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/social_leads?id=eq.{row['id']}",
                        headers={**HEADERS, "Prefer": "return=minimal"},
                        json={"status": "contacted", "escalation_reason": "skip_synthetic", "last_action_at": datetime.now(timezone.utc).isoformat()},
                        timeout=20,
                    )
                except Exception:
                    pass
            continue

        key = dedupe_key(row)
        existing = find_existing_lead(key)
        if existing:
            skipped += 1
            print(f"SKIP existing social_id={row['id']} lead_id={existing}")
            if not dry_run:
                upsert_social_contacted(row["id"], lead_id=existing)
            continue

        if dry_run:
            promoted += 1
            print(f"DRY_PROMOTE social_id={row['id']} dedupe_key={key}")
            continue

        try:
            lead_id = insert_lead(row, key)
            upsert_social_contacted(row["id"], lead_id=lead_id)
            promoted += 1
            print(f"PROMOTED social_id={row['id']} lead_id={lead_id}")
        except Exception as exc:
            incident(f"promote failed social_id={row.get('id')}: {exc}", severity=2)
            print(f"ERROR social_id={row.get('id')} err={exc}", file=sys.stderr)
            errors += 1

    print(f"result promoted={promoted} skipped={skipped} errors={errors} dry_run={dry_run}")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Promote approved social leads to leads")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    raise SystemExit(run(args.dry_run, args.limit))
