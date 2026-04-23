#!/usr/bin/env python3
"""
social_leads_triage.py — On-demand triage report for stuck HOT/WARM social signals.

Prints a table of all status=new HOT/WARM signals with:
- platform, intent, age (days), post URL (clickable), post text excerpt

Optionally marks WARM signals older than N days as 'ignored' (--auto-ignore-warm-days N).
Does NOT auto-convert to leads. Does NOT send Telegram noise.

Usage:
  python3 scripts/social_leads_triage.py
  python3 scripts/social_leads_triage.py --auto-ignore-warm-days 14

Owner runs this script manually when clearing the backlog.
"""

import argparse
import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def load_env():
    for name in ('.env.local', '.env.production'):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            os.environ.setdefault(k, v.strip().strip('"').strip("'"))


def sb_get(path, timeout=15):
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not url or not key:
        return -1, {'error': 'missing env'}
    req = urllib.request.Request(
        f'{url}/rest/v1/{path}',
        headers={'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, {'error': e.read().decode()[:200]}
    except Exception as e:
        return -1, {'error': str(e)[:200]}


def sb_patch(path, data, timeout=10):
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    req = urllib.request.Request(
        f'{url}/rest/v1/{path}',
        data=json.dumps(data).encode(),
        headers={
            'apikey': key, 'Authorization': f'Bearer {key}',
            'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        method='PATCH'
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status
    except Exception as e:
        return -1


def parse_ts(ts_str):
    if not ts_str:
        return None
    ts = re.sub(r'\.\d+', '', str(ts_str)).replace('Z', '+00:00')
    return datetime.fromisoformat(ts)


def main():
    ap = argparse.ArgumentParser(description='Triage stuck HOT/WARM social signals')
    ap.add_argument('--auto-ignore-warm-days', type=int, default=None,
                    help='Mark WARM signals older than N days as ignored')
    ap.add_argument('--auto-ignore-hot-days', type=int, default=None,
                    help='Mark HOT signals older than N days as ignored (use cautiously)')
    args = ap.parse_args()

    load_env()
    now = datetime.now(tz=timezone.utc)

    c, rows = sb_get(
        'social_leads?select=id,platform,intent_type,post_url,post_text,author_name,created_at'
        '&status=eq.new&intent_type=in.(HOT,WARM)&order=created_at.asc&limit=200'
    )
    if c != 200 or not isinstance(rows, list):
        print(f'ERROR: failed to fetch social_leads http={c} data={rows}')
        sys.exit(1)

    print(f'\n{"="*80}')
    print(f'SOCIAL LEADS TRIAGE — {now.strftime("%Y-%m-%d %H:%M")} UTC')
    print(f'Total HOT/WARM signals in status=new: {len(rows)}')
    print(f'{"="*80}\n')

    ignored = 0
    for r in rows:
        ts = parse_ts(r.get('created_at', ''))
        age_d = round((now - ts).total_seconds() / 86400, 1) if ts else '?'
        intent = r.get('intent_type', '?')
        platform = r.get('platform', '?')
        url = r.get('post_url', '') or '[no url]'
        text = (r.get('post_text', '') or '')[:120].replace('\n', ' ')
        author = r.get('author_name', '?')
        sid = r.get('id', '?')

        print(f'[{intent}] {platform.upper()} | age={age_d}d | author={author}')
        print(f'  URL: {url}')
        print(f'  Text: {text}...')
        print(f'  ID: {sid}')

        # Auto-ignore WARM if requested
        should_ignore = False
        if args.auto_ignore_warm_days and intent == 'WARM' and isinstance(age_d, float) and age_d > args.auto_ignore_warm_days:
            should_ignore = True
        if args.auto_ignore_hot_days and intent == 'HOT' and isinstance(age_d, float) and age_d > args.auto_ignore_hot_days:
            should_ignore = True

        if should_ignore:
            s = sb_patch(f'social_leads?id=eq.{sid}', {'status': 'ignored'})
            status_str = f'HTTP {s}' if s == 204 else f'FAILED http={s}'
            print(f'  → AUTO-IGNORED ({status_str})')
            ignored += 1

        print()

    print(f'{"="*80}')
    print(f'Summary: {len(rows)} reviewed, {ignored} auto-ignored this run')
    print(f'Remaining in status=new: {len(rows) - ignored}')
    if not args.auto_ignore_warm_days and not args.auto_ignore_hot_days:
        print('\nTo auto-ignore old WARM signals:')
        print('  python3 scripts/social_leads_triage.py --auto-ignore-warm-days 14')
    print(f'{"="*80}\n')

    return 0


if __name__ == '__main__':
    sys.exit(main())
