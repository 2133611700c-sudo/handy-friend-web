#!/usr/bin/env python3
"""Fetch Craigslist RSS into feed JSON then scan deterministically."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
import requests

ROOT = Path('/Users/sergiikuropiatnyk/handy-friend-landing-v6')
OUT = Path('/tmp/hf_cl_feed.json')

URLS = [
    'https://losangeles.craigslist.org/search/lbg?query=handyman&sort=date&format=rss',
    'https://losangeles.craigslist.org/search/lbg?query=tv+mount&sort=date&format=rss',
    'https://losangeles.craigslist.org/search/lbg?query=drywall+repair&sort=date&format=rss',
    'https://losangeles.craigslist.org/search/lbg?query=furniture+assembly&sort=date&format=rss',
]

HTML_URLS = [
    'https://losangeles.craigslist.org/search/lbg?query=handyman&sort=date',
    'https://losangeles.craigslist.org/search/lbg?query=tv+mount&sort=date',
    'https://losangeles.craigslist.org/search/lbg?query=drywall+repair&sort=date',
    'https://losangeles.craigslist.org/search/lbg?query=furniture+assembly&sort=date',
]


def log_incident(summary: str) -> None:
    supabase_url = (os.environ.get('SUPABASE_URL') or '').rstrip('/')
    supabase_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY') or ''
    if not supabase_url or not supabase_key:
        return
    try:
        requests.post(
            f'{supabase_url}/rest/v1/ops_incidents',
            headers={
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            json={
                'system_name': 'craigslist_ingest',
                'severity': 2,
                'status': 'open',
                'issue_type': 'source_blocked',
                'summary': summary[:500],
                'created_by': 'craigslist-social-ingest',
            },
            timeout=15,
        )
    except Exception:
        pass

items: list[dict[str, str]] = []
seen: set[str] = set()
fetch_errors: list[str] = []
for url in URLS:
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
            },
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            xml_data = r.read()
        root = ET.fromstring(xml_data)
        for it in root.findall('.//item'):
            title = (it.findtext('title') or '').strip()
            desc = (it.findtext('description') or '').strip()
            link = (it.findtext('link') or '').strip()
            text = (title + ' ' + desc).strip()
            if not text or not link:
                continue
            if link in seen:
                continue
            seen.add(link)
            items.append({'author': 'craigslist_post', 'text': text[:2000], 'url': link})
    except Exception as exc:
        fetch_errors.append(f'{url} -> {exc}')
        continue

if not items:
    html_errors: list[str] = []
    li_re = re.compile(r'<li[^>]*class="[^"]*cl-static-search-result[^"]*"[^>]*>(.*?)</li>', re.I | re.S)
    href_re = re.compile(r'<a[^>]+href="([^"]+)"', re.I | re.S)
    title_attr_re = re.compile(r'title="([^"]+)"', re.I | re.S)
    title_div_re = re.compile(r'<div[^>]*class="title"[^>]*>(.*?)</div>', re.I | re.S)
    tag_re = re.compile(r'<[^>]+>', re.S)
    for url in HTML_URLS:
        try:
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://losangeles.craigslist.org/',
                },
            )
            with urllib.request.urlopen(req, timeout=20) as r:
                html = r.read().decode('utf-8', errors='ignore')
            for block in li_re.findall(html):
                href_match = href_re.search(block)
                if not href_match:
                    continue
                link = href_match.group(1).strip()
                if not link:
                    continue
                if link.startswith('/'):
                    link = 'https://losangeles.craigslist.org' + link
                if link in seen:
                    continue
                seen.add(link)
                title = ""
                m_attr = title_attr_re.search(block)
                if m_attr:
                    title = m_attr.group(1).strip()
                if not title:
                    m_div = title_div_re.search(block)
                    if m_div:
                        title = tag_re.sub('', m_div.group(1)).strip()
                text = title or "Craigslist listing"
                items.append({'author': 'craigslist_post', 'text': text[:2000], 'url': link})
        except Exception as exc:
            html_errors.append(f'{url} -> {exc}')
            continue
    if html_errors and not items:
        fetch_errors.extend([f'HTML {x}' for x in html_errors])

OUT.write_text(json.dumps(items))
print(f'feed_items={len(items)}')
if fetch_errors:
    print('fetch_errors=' + str(len(fetch_errors)), file=sys.stderr)
    for err in fetch_errors[:5]:
        print('  ' + err, file=sys.stderr)
    # Only escalate as incident when fetch produced zero usable items.
    if not items:
        log_incident(f'Craigslist fetch errors: {fetch_errors[0]}')

os.environ['SUPABASE_SERVICE_KEY'] = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY','')
cmd = ['python3', str(ROOT / 'scripts/social_scanner.py'), '--source', 'craigslist', '--feed', str(OUT)]
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout.strip())
if res.stderr.strip():
    print(res.stderr.strip(), file=sys.stderr)

# Fail hard when source is blocked (e.g., 403 across all URLs) so health checks can catch it.
if not items and fetch_errors:
    sys.exit(3)

sys.exit(res.returncode)
