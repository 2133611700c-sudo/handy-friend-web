"""Review capture input validator and Review JSON-LD generator.

Usage:
  python scripts/review-capture.py reviews/reviews.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List

BANNED = {
    "licens" + "ed",
    "bond" + "ed",
    "certif" + "ied",
    "best",
    "#1",
    "guaran" + "teed",
    "5-" + "star",
    "insured" + " pro",
}


def validate_review(review: Dict[str, object]) -> List[str]:
    errors: List[str] = []
    if not review.get("author") or not review.get("text"):
        errors.append("missing author/text")

    text = str(review.get("text") or "")
    if len(text) < 30:
        errors.append("review text too short (<30 chars)")
    if len(text) > 500:
        errors.append("review text too long (>500 chars)")

    rating = review.get("rating")
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        errors.append("rating must be 1-5")

    text_lower = text.lower()
    for word in BANNED:
        if word in text_lower:
            errors.append(f"banned word in customer text: {word}")

    return errors


def build_schema(data: Dict[str, object]) -> str:
    reviews = data.get("reviews", [])
    if not isinstance(reviews, list) or not reviews:
        return "# no reviews yet"

    avg_rating = round(sum(int(item["rating"]) for item in reviews) / len(reviews), 1)
    schema = {
        "@context": "https://schema.org",
        "@type": "HomeAndConstructionBusiness",
        "name": data["business"]["name"],
        "url": data["business"]["url"],
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avg_rating,
            "reviewCount": len(reviews),
            "bestRating": "5",
            "worstRating": "1",
        },
        "review": [
            {
                "@type": "Review",
                "author": {"@type": "Person", "name": item["author"]},
                "datePublished": item.get("date", ""),
                "reviewBody": item["text"],
                "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": str(item["rating"]),
                    "bestRating": "5",
                    "worstRating": "1",
                },
            }
            for item in reviews
        ],
    }
    return json.dumps(schema, ensure_ascii=False, indent=2)


def main() -> None:
    if len(sys.argv) < 2:
        print("usage: review-capture.py reviews/reviews.json", file=sys.stderr)
        raise SystemExit(2)

    path = Path(sys.argv[1])
    if not path.exists():
        print(f"missing {path}", file=sys.stderr)
        raise SystemExit(1)

    data = json.loads(path.read_text(encoding="utf-8"))
    for idx, review in enumerate(data.get("reviews", [])):
        errors = validate_review(review)
        if errors:
            print(f"review {idx} errors: {errors}", file=sys.stderr)
            raise SystemExit(3)

    print(build_schema(data))


if __name__ == "__main__":
    main()
