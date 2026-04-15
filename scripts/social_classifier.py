#!/usr/bin/env python3
"""Social lead intent classifier with HOT/WARM/COLD and no silent WARM drop."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Classification:
    cls: str
    reason: str
    score: int
    send_to_telegram: bool


IGNORE_KEYWORDS = [
    "for sale", "selling", "priced to sell", "barely used", "wanted: cash", "crypto", "investment",
    "i am a handyman", "i offer handyman", "available for hire", "my services include", "i'm a handyman",
    "hiring handyman", "subcontractors needed", "looking to hire",
    "moving company", "help me move", "need movers", "relocation", "moving out", "furniture movers",
    "need a permit", "pull a permit", "require a permit", "permits required", "full remodel",
    "kitchen remodel", "bathroom addition", "room addition", "load bearing wall", "licensed contractor only",
]

HOT_KEYWORDS = [
    "need handyman", "looking for handyman", "need help with",
    "tv mount", "tv mounting", "mount tv", "hang tv",
    "drywall", "patch", "hole in wall", "hole in my wall",
    "furniture assembly", "ikea", "assemble", "put together",
    "repair", "install", "shelf", "shelves", "curtain rod", "painting",
]

WARM_KEYWORDS = [
    "help", "need", "looking", "anyone", "recommend", "handyman", "can someone", "does anyone",
]

# Signals that the post author is offering services (vendor self-promo), not requesting work.
VENDOR_PATTERNS = [
    "my services", "services available", "available for work", "available this week",
    "free estimate", "free estimates", "call me", "text me", "dm me", "message me",
    "contact me", "book now", "serving ", "we do", "we provide", "our team",
    "licensed", "insured", "welding services", "landscaping services", "remodeling services",
]

REQUEST_PATTERNS = [
    "need", "looking for", "anyone know", "can someone", "does anyone", "recommend",
    "help with", "need help", "who can", "asap",
]


def _looks_like_vendor_offer(txt: str) -> bool:
    has_vendor_phrase = any(p in txt for p in VENDOR_PATTERNS)
    has_request_phrase = any(p in txt for p in REQUEST_PATTERNS)
    # Strong vendor marker when author posts contact and offer terms without request language.
    has_phone_like = any(ch.isdigit() for ch in txt) and ("call" in txt or "text" in txt)
    return (has_vendor_phrase or has_phone_like) and not has_request_phrase


def classify_post(text: str) -> Classification:
    txt = (text or "").lower()
    if any(k in txt for k in IGNORE_KEYWORDS):
        return Classification("COLD", "ignore_keyword", 0, False)
    if _looks_like_vendor_offer(txt):
        return Classification("COLD", "vendor_self_promo", 0, False)

    hot_score = sum(1 for k in HOT_KEYWORDS if k in txt)
    warm_score = sum(1 for k in WARM_KEYWORDS if k in txt)

    if hot_score >= 1:
        referral_only = any(p in txt for p in ["anyone", "does anyone", "recommend"])
        direct_need = any(p in txt for p in ["need", "looking for", "help with", "asap"])
        if referral_only and not direct_need:
            return Classification("WARM", "referral_request", hot_score, True)
        return Classification("HOT", "hot_keyword", hot_score, True)
    if warm_score >= 2:
        return Classification("WARM", "warm_keyword", warm_score, True)
    return Classification("COLD", "low_signal", 0, False)
