"""Prepare a GBP batch payload from canonical project sources."""

from __future__ import annotations

import json
import re
from datetime import date
from pathlib import Path
from typing import Dict

ROOT = Path(__file__).resolve().parent.parent


def extract_prices() -> Dict[str, str]:
    registry_path = ROOT / "lib" / "price-registry.js"
    text = registry_path.read_text(encoding="utf-8")
    prices: Dict[str, str] = {}

    matrix_match = re.search(r"const\s+PRICE_MATRIX\s*=\s*\{(.*?)\};", text, re.DOTALL)
    if not matrix_match:
        return prices

    for service_id, value in re.findall(r"([a-z_]+)\s*:\s*([0-9]+(?:\.[0-9]+)?)", matrix_match.group(1)):
        prices[service_id] = value

    return prices


def extract_service_labels() -> Dict[str, str]:
    registry_path = ROOT / "lib" / "price-registry.js"
    text = registry_path.read_text(encoding="utf-8")
    labels: Dict[str, str] = {}

    for service_id, label in re.findall(
        r"([a-z_]+)\s*:\s*\{[^}]*?label\s*:\s*'([^']+)'",
        text,
        re.DOTALL,
    ):
        labels[service_id] = label.strip()

    return labels


def extract_hero() -> str:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    match = re.search(r'<h1 class="hero-offer-title"[^>]*>([^<]+)</h1>', html)
    return match.group(1).strip() if match else ""


def extract_neighborhoods() -> list[str]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    section = re.search(r'id="neighborhoods".*?</section>', html, re.DOTALL)
    if not section:
        return []
    chips = re.findall(r'class="chip[^"]*"[^>]*>([^<]+)<', section.group(0))
    return [chip.strip() for chip in chips]


def extract_categories_from_research() -> list[str]:
    research_path = ROOT / "research-2026-04-14" / "CONSOLIDATED_RESEARCH.md"
    if not research_path.exists():
        return []

    text = research_path.read_text(encoding="utf-8")
    match = re.search(r"Safe categories for GMB:\s*(.+)", text)
    if not match:
        return []

    raw = match.group(1)
    raw = raw.split("Avoid:", 1)[0]
    raw = re.sub(r"\([^)]+\)", "", raw)
    raw = raw.replace("**", "")
    parts = [part.strip(" .") for part in raw.split(",")]
    return [part for part in parts if part]


def build_payload() -> Dict[str, object]:
    service_labels = extract_service_labels()
    return {
        "generated_at": date.today().isoformat(),
        "source": "scripts/gbp-sync-prep.py",
        "business": {
            "name": "Handy & Friend",
            "phone": "+12133611700",
            "website": "https://handyandfriend.com/",
            "hours": "Mon-Sat 8am-7pm PT",
        },
        "description_candidate": (
            "LA handyman — TV mounting, drywall repair, furniture assembly, "
            "doors, painting, small plumbing and electrical. Flat upfront "
            "pricing, same-day response, insured. Trade-regulated work "
            "referred to a trade contractor. Serving central Los Angeles."
        ),
        "categories": {
            "primary": "Handyman",
            "additional": [
                "Furniture assembly service",
                "Door supplier",
                "Home improvement service",
            ],
        },
        "categories_candidate_from_research": extract_categories_from_research(),
        "prices_from_registry": extract_prices(),
        "services_from_registry": service_labels,
        "current_hero_h1": extract_hero(),
        "service_areas": extract_neighborhoods(),
        "photo_checklist": [
            "Before/after TV mounting",
            "Drywall patch texture matching close-up",
            "Furniture assembly completion photos",
            "Team-at-work safety and cleanup photo",
            "Branded vehicle/tools context shot",
        ],
        "notes": [
            "Owner must verify GBP in Google Business Profile UI before applying.",
            "AggregateRating on site unlocks only after real reviews exist.",
            "Use insured wording and referral language for trade-regulated scope.",
        ],
    }


def main() -> None:
    payload = build_payload()
    output = ROOT / "research-2026-04-14" / "codex-phase4" / f"gbp-batch-{date.today().isoformat()}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {output}")


if __name__ == "__main__":
    main()
