#!/usr/bin/env python3
"""Deterministic social scanner -> social_leads + telegram alerts."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / "ops"
LOG_DIR.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "social-scanner.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("social_scanner")

sys.path.insert(0, str(Path(__file__).parent))
from social_classifier import classify_post  # noqa: E402


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def headers(prefer_representation: bool = False) -> dict[str, str]:
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    h["Prefer"] = "return=representation" if prefer_representation else "return=minimal"
    return h


def is_synthetic_post(post: dict[str, Any]) -> bool:
    author = (post.get("author") or "").lower()
    text = (post.get("text") or "").lower()
    return "synthetic" in author or "[e2e-synthetic]" in text


def log_incident(summary: str, severity: int = 2, issue_type: str = "scanner") -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        return
    payload = {
        "system_name": "social_scanner",
        "severity": severity,
        "status": "open",
        "issue_type": issue_type,
        "summary": summary[:500],
        "created_by": "social_scanner",
    }
    try:
        requests.post(f"{SUPABASE_URL}/rest/v1/ops_incidents", headers=headers(), json=payload, timeout=20)
    except Exception:
        pass


def detect_service(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ["tv", "mount", "flat screen"]):
        return "tv_mounting"
    if any(k in t for k in ["drywall", "hole", "patch", "wall"]):
        return "drywall"
    if any(k in t for k in ["furniture", "assemble", "ikea", "dresser", "bed frame"]):
        return "furniture_assembly"
    return "unclear"


def insert_social(post: dict[str, Any], cls: Any, source: str) -> tuple[str | None, bool]:
    post_url = post.get("url") or ""
    if post_url:
        existing = requests.get(
            f"{SUPABASE_URL}/rest/v1/social_leads",
            headers=headers(),
            params={"select": "id", "platform": f"eq.{source}", "post_url": f"eq.{post_url}", "limit": "1"},
            timeout=20,
        )
        if existing.status_code == 200 and isinstance(existing.json(), list) and existing.json():
            existing_id = existing.json()[0].get("id")
            if existing_id:
                # Keep source freshness visible without duplicating lead records.
                try:
                    requests.patch(
                        f"{SUPABASE_URL}/rest/v1/social_leads?id=eq.{existing_id}",
                        headers=headers(),
                        json={"last_action_at": utcnow()},
                        timeout=20,
                    )
                except Exception:
                    pass
            return existing_id, False

    payload = {
        "platform": source,
        "source": source,
        "author_name": post.get("author", "unknown"),
        "post_text": (post.get("text") or "")[:2000],
        "post_url": post.get("url") or "",
        "service_type": detect_service(post.get("text", "")),
        "intent_type": cls.cls,
        "status": "new",
        "stage": "new",
        "requires_media": False,
        "source_post_id": post.get("source_post_id"),
        "lead_detected_at": utcnow(),
        "created_at": utcnow(),
    }
    r = requests.post(f"{SUPABASE_URL}/rest/v1/social_leads", headers=headers(True), json=payload, timeout=30)
    if r.status_code not in (200, 201):
        raise RuntimeError(f"insert social_leads failed {r.status_code}: {r.text[:200]}")
    data = r.json() if isinstance(r.json(), list) else []
    return (data[0].get("id") if data else None), True


def mark_telegram_delivery(lead_id: str, source: str, message_id: str | None) -> None:
    payload = {
        "last_action_at": utcnow(),
        "escalation_reason": f"telegram_sent:{source}:{message_id or 'unknown'}",
    }
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/social_leads?id=eq.{lead_id}",
        headers=headers(),
        json=payload,
        timeout=20,
    )


def already_sent_to_telegram(lead_id: str) -> bool:
    if not lead_id:
        return False
    try:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/social_leads",
            headers=headers(),
            params={"select": "id,escalation_reason", "id": f"eq.{lead_id}", "limit": "1"},
            timeout=20,
        )
        if resp.status_code != 200:
            return False
        rows = resp.json() if isinstance(resp.json(), list) else []
        if not rows:
            return False
        reason = str(rows[0].get("escalation_reason") or "")
        return reason.startswith("telegram_sent:")
    except Exception:
        return False


def send_telegram(post: dict[str, Any], cls: Any, lead_id: str | None, source: str) -> None:
    if not BOT_TOKEN or not CHAT_ID:
        return
    if lead_id and already_sent_to_telegram(lead_id):
        log_incident(
            f"Duplicate Telegram prevented lead_id={lead_id} source={source}",
            severity=3,
            issue_type="telegram_dedupe",
        )
        return
    msg = (
        f"🔔 {cls.cls} LEAD [{source}]\n"
        f"Author: {post.get('author', 'unknown')}\n"
        f"Text: {(post.get('text') or '')[:180]}\n"
        f"Lead ID: {lead_id or 'n/a'}"
    )
    resp = requests.post(
        f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
        json={"chat_id": CHAT_ID, "text": msg},
        timeout=20,
    )
    if resp.status_code >= 300:
        log_incident(
            f"telegram send failed lead_id={lead_id or 'n/a'} status={resp.status_code} body={resp.text[:180]}",
            severity=2,
            issue_type="telegram_send",
        )
        return
    if lead_id:
        try:
            data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            ok = bool(data.get("ok")) if isinstance(data, dict) else False
            message_id = str(data.get("result", {}).get("message_id")) if isinstance(data, dict) else None
            if not ok:
                log_incident(
                    f"telegram send not-ok lead_id={lead_id} body={str(data)[:180]}",
                    severity=2,
                    issue_type="telegram_send",
                )
                return
            mark_telegram_delivery(lead_id, source, message_id)
        except Exception as exc:
            log_incident(f"telegram mark failed lead_id={lead_id}: {exc}", severity=2, issue_type="telegram_mark")


def run(feed_path: str, source: str, dry_run: bool) -> int:
    try:
        posts = json.loads(Path(feed_path).read_text())
    except Exception as exc:
        log_incident(f"feed read failed: {feed_path} err={exc}", severity=2, issue_type="feed_read")
        print(f"ERROR feed_read {exc}", file=sys.stderr)
        return 2

    stats = {"total": 0, "hot": 0, "warm": 0, "cold": 0, "errors": 0}
    for post in posts:
        stats["total"] += 1
        text = (post.get("text") or "").strip()
        if not text:
            stats["errors"] += 1
            continue
        cls = classify_post(text)
        stats[cls.cls.lower()] += 1
        if cls.send_to_telegram and is_synthetic_post(post):
            log_incident(
                f"Synthetic lead skipped from Telegram source={source} author={post.get('author','unknown')}",
                severity=3,
                issue_type="synthetic_skip",
            )
            continue
        if cls.send_to_telegram and not dry_run:
            try:
                lead_id, is_new = insert_social(post, cls, source)
                if is_new:
                    send_telegram(post, cls, lead_id, source)
            except Exception as exc:
                stats["errors"] += 1
                log_incident(f"scan insert/send failed: {exc}", severity=2, issue_type="scan_write")

    print(json.dumps({"source": source, "dry_run": dry_run, **stats}))
    return 0 if stats["errors"] == 0 else 2


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, choices=["facebook", "craigslist", "nextdoor"])
    ap.add_argument("--feed", required=True)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR missing SUPABASE env", file=sys.stderr)
        sys.exit(1)
    sys.exit(run(args.feed, args.source, args.dry_run))
