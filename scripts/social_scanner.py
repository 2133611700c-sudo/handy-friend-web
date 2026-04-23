#!/usr/bin/env python3
"""Deterministic social scanner -> social_leads candidate queue."""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

ROOT = Path(__file__).resolve().parents[1]
LOG_DIR = ROOT / "ops"
LOG_DIR.mkdir(parents=True, exist_ok=True)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY", "")

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


def send_hot_signal_alert(post: dict[str, Any], cls: Any, source: str, social_id: str | None) -> bool:
    """Send immediate Telegram alert to owner when a new HOT/WARM social signal is inserted.
    Only fires for new inserts (not deduped rows). Silently skips if env vars missing."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        return False

    esc = lambda s: str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    priority_emoji = "🔥" if cls.cls == "HOT" else "⚡"
    platform_label = {"facebook": "Facebook Group", "craigslist": "Craigslist", "nextdoor": "Nextdoor"}.get(source, source)
    post_url = post.get("url") or ""
    url_line = f'\n🔗 <a href="{esc(post_url)}">View post</a>' if post_url else ""

    text = (
        f"{priority_emoji} <b>HOT_SOCIAL_SIGNAL [{platform_label}]</b>\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 Author: {esc(post.get('author', '?'))}\n"
        f"🔧 Service: {esc(detect_service(post.get('text', '')))}\n"
        f"📋 Intent: {esc(cls.cls)} (score={cls.score})\n"
        f"━━━━━━━━━━━━━━━━━━━━\n"
        f"📝 {esc(str(post.get('text', ''))[:280])}"
        f"{url_line}\n"
        f"<i>social_id: {esc(social_id)} — manual follow-up required</i>"
    )
    try:
        payload = json.dumps({
            "chat_id": chat_id, "text": text, "parse_mode": "HTML",
            "disable_web_page_preview": True
        }).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{token}/sendMessage",
            data=payload, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urllib.request.urlopen(req, timeout=6) as r:
            resp = json.loads(r.read())
            return resp.get("ok", False)
    except Exception as exc:
        log.warning("Telegram hot-signal alert failed: %s", exc)
        return False


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


def run(feed_path: str, source: str, dry_run: bool) -> int:
    try:
        posts = json.loads(Path(feed_path).read_text())
    except Exception as exc:
        log_incident(f"feed read failed: {feed_path} err={exc}", severity=2, issue_type="feed_read")
        print(f"ERROR feed_read {exc}", file=sys.stderr)
        return 2

    stats = {"total": 0, "hot": 0, "warm": 0, "cold": 0, "errors": 0, "inserted": 0}
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
                social_id, is_new = insert_social(post, cls, source)
                if is_new:
                    stats["inserted"] += 1
                    # Immediately alert owner for new HOT or WARM signals.
                    if cls.cls in ("HOT", "WARM"):
                        alerted = send_hot_signal_alert(post, cls, source, social_id)
                        log.info("hot_signal_alert sent=%s social_id=%s cls=%s", alerted, social_id, cls.cls)
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
