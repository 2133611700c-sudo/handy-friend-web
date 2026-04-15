"""Telegram send logger — append-only JSONL for audit trail."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

ROOT = Path(__file__).resolve().parent.parent
LOG_PATH = ROOT / "ops" / "telegram-sends.jsonl"


def log_send(response_json: Dict[str, Any], source: str, payload_preview: str = "") -> Dict[str, Any]:
    """Append one Telegram API response to the local audit log."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

    result = response_json.get("result") or {}
    chat = result.get("chat") or {}
    entry: Dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "ok": bool(response_json.get("ok")),
        "msg_id": result.get("message_id"),
        "chat_id": chat.get("id"),
        "preview": (payload_preview or "")[:120],
        "error_code": response_json.get("error_code"),
        "error_description": (response_json.get("description") or "")[:200],
    }

    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False) + "\n")

    return entry
