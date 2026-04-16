#!/usr/bin/env python3
"""
Google Ads URL Regression Test
Handy & Friend — handyandfriend.com
Account: 637-606-8452 | Campaign: LA Search - Core Services

Tests all Google Ads final URLs + legacy /los-angeles variants with
Android AdsBot user-agent (same UA Google uses to crawl landing pages).

Usage:
    python3 scripts/audit_ads_urls.py
    python3 scripts/audit_ads_urls.py --verbose

Exit codes:
    0 — all PASS
    1 — one or more FAIL
"""

import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

ANDROID_ADSBOT_UA = (
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) "
    "AppleWebKit/537.36 Chrome/122.0 Mobile Safari/537.36 Google-AdsBot"
)

BASE = "https://handyandfriend.com"

# (label, url, expected_final_path)
# expected_final_path = None means any 200 is acceptable
URLS = [
    # ── Active AG canonical URLs (AG2 TV / AG4 Drywall / AG3 Furniture) ──
    ("tv-mounting [canonical]",          f"{BASE}/tv-mounting",                   "/tv-mounting"),
    ("drywall [canonical]",              f"{BASE}/drywall",                        "/drywall"),
    ("furniture-assembly [canonical]",   f"{BASE}/furniture-assembly",             "/furniture-assembly"),

    # ── Active AG legacy /los-angeles variants (301 → canonical) ──
    ("tv-mounting/los-angeles",          f"{BASE}/tv-mounting/los-angeles",        "/tv-mounting"),
    ("drywall/los-angeles",              f"{BASE}/drywall/los-angeles",            "/drywall"),
    ("furniture-assembly/los-angeles",   f"{BASE}/furniture-assembly/los-angeles", "/furniture-assembly"),
    ("assembly/los-angeles",             f"{BASE}/assembly/los-angeles",           "/furniture-assembly"),

    # ── Paused AG canonical URLs ──
    ("flooring [canonical]",             f"{BASE}/flooring",                       "/flooring"),
    ("door-installation [canonical]",    f"{BASE}/door-installation",              "/door-installation"),
    ("backsplash [canonical]",           f"{BASE}/backsplash",                     "/backsplash"),
    ("vanity-installation [canonical]",  f"{BASE}/vanity-installation",            "/vanity-installation"),
    ("plumbing [canonical]",             f"{BASE}/plumbing",                       "/plumbing"),
    ("electrical [canonical]",           f"{BASE}/electrical",                     "/electrical"),
    ("interior-painting [canonical]",    f"{BASE}/interior-painting",              "/interior-painting"),

    # ── Paused AG legacy /los-angeles variants ──
    ("flooring/los-angeles",             f"{BASE}/flooring/los-angeles",           "/flooring"),
    ("doors/los-angeles",                f"{BASE}/doors/los-angeles",              "/door-installation"),
    ("backsplash/los-angeles",           f"{BASE}/backsplash/los-angeles",         "/backsplash"),
    ("vanity/los-angeles",               f"{BASE}/vanity/los-angeles",             "/vanity-installation"),
    ("plumbing/los-angeles",             f"{BASE}/plumbing/los-angeles",           "/plumbing"),
    ("lighting/los-angeles",             f"{BASE}/lighting/los-angeles",           "/electrical"),
    ("painting/los-angeles",             f"{BASE}/painting/los-angeles",           "/interior-painting"),

    # ── Sitelink targets ──
    ("services [sitelink]",              f"{BASE}/services",                       "/services"),
    ("book [sitelink]",                  f"{BASE}/book",                           "/book"),
    ("gallery [sitelink]",               f"{BASE}/gallery",                        "/gallery"),
]

GREEN = "\033[32m"
RED   = "\033[31m"
RESET = "\033[0m"
BOLD  = "\033[1m"


def check_url(label: str, url: str, expected_path: Optional[str],
              verbose: bool = False) -> bool:
    """Returns True if PASS, False if FAIL."""
    req = urllib.request.Request(url, headers={"User-Agent": ANDROID_ADSBOT_UA})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            final_url = resp.geturl()
            status = resp.status
    except urllib.error.HTTPError as e:
        print(f"{RED}❌ FAIL{RESET}  [{label}]  {url}")
        print(f"       HTTP {e.code}: {e.reason}")
        return False
    except urllib.error.URLError as e:
        print(f"{RED}❌ FAIL{RESET}  [{label}]  {url}")
        print(f"       URLError: {e.reason}")
        return False

    # Check final path matches expected
    from urllib.parse import urlparse
    final_path = urlparse(final_url).path.rstrip("/") or "/"
    if expected_path:
        expected_norm = expected_path.rstrip("/") or "/"
        path_ok = final_path == expected_norm
    else:
        path_ok = True

    if status == 200 and path_ok:
        if verbose:
            arrow = f" → {final_url}" if final_url != url else ""
            print(f"{GREEN}✅ PASS{RESET}  [{label}]{arrow}")
        else:
            print(f"{GREEN}✅ PASS{RESET}  [{label}]")
        return True
    else:
        reasons = []
        if status != 200:
            reasons.append(f"HTTP {status}")
        if not path_ok:
            reasons.append(f"final path={final_path!r} expected={expected_path!r}")
        print(f"{RED}❌ FAIL{RESET}  [{label}]  {url}")
        print(f"       {'; '.join(reasons)}")
        return False


def main() -> int:
    verbose = "--verbose" in sys.argv or "-v" in sys.argv
    now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    print(f"{BOLD}Google Ads URL Audit — handyandfriend.com{RESET}")
    print(f"Run: {now}  |  UA: Android AdsBot")
    print(f"URLs: {len(URLS)}")
    print("─" * 60)

    results = []
    for label, url, expected_path in URLS:
        ok = check_url(label, url, expected_path, verbose=verbose)
        results.append(ok)

    passed = sum(results)
    failed = len(results) - passed

    print("─" * 60)
    if failed == 0:
        print(f"{GREEN}{BOLD}ALL {passed} PASS — routing clean{RESET}")
        return 0
    else:
        print(f"{RED}{BOLD}{failed} FAIL / {passed} PASS{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
