#!/usr/bin/env python3
"""
Autonomous Vercel env var manager.

Usage:
  python3 scripts/vercel_set_env.py KEY VALUE [production|preview|development|all]
  python3 scripts/vercel_set_env.py --from-file path/to/file KEY [targets]
  python3 scripts/vercel_set_env.py --list
  python3 scripts/vercel_set_env.py --delete KEY [target]

Requires VERCEL_TOKEN in env or .env.local. Uses Vercel REST API v10.
Never echoes the value back.

This is the bootstrap tool that lets Claude set HF_NOTIFY_SECRET and any
future env vars without the owner touching the Vercel dashboard.
"""

import argparse
import json
import os
import sys
from pathlib import Path
from urllib import request as urlreq, error as urlerr

ROOT = Path(__file__).resolve().parent.parent
PROJECT_ID = 'prj_cB1RFa7bfSuWpuhBZs76UiYvTLzg'
TEAM_ID = 'team_qRGWLc9kKWuiKWouVsOeO1P4'
API_BASE = 'https://api.vercel.com'


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


def token():
    load_env()
    t = os.environ.get('VERCEL_TOKEN', '')
    if not t:
        print('FATAL: VERCEL_TOKEN not set. Create at https://vercel.com/account/tokens')
        print('       and add to .env.local: VERCEL_TOKEN=vcp_...')
        sys.exit(2)
    return t


def api(method, path, body=None):
    url = f'{API_BASE}{path}'
    if '?' in url:
        url += f'&teamId={TEAM_ID}'
    else:
        url += f'?teamId={TEAM_ID}'
    hdr = {'Authorization': f'Bearer {token()}', 'Content-Type': 'application/json'}
    data = json.dumps(body).encode() if body is not None else None
    req = urlreq.Request(url, data=data, headers=hdr, method=method)
    try:
        with urlreq.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode('utf-8', errors='replace'))
    except urlerr.HTTPError as e:
        raw = e.read().decode('utf-8', errors='replace')
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {'raw': raw[:500]}


def list_env():
    code, data = api('GET', f'/v10/projects/{PROJECT_ID}/env')
    if code != 200:
        print(f'FAIL: HTTP {code}: {data}')
        return 1
    for env in data.get('envs', []):
        targets = ','.join(env.get('target', []))
        print(f"  {env['key']:30s}  [{targets}]  id={env.get('id', '?')[:12]}")
    return 0


def add_env(key, value, targets):
    # Use upsert=true so re-running overwrites existing rows
    code, data = api('POST', f'/v10/projects/{PROJECT_ID}/env?upsert=true', {
        'key': key,
        'value': value,
        'type': 'encrypted',
        'target': targets
    })
    if code in (200, 201):
        print(f'OK: {key} set for {targets}')
        return 0
    print(f'FAIL: HTTP {code}: {data}')
    return 1


def delete_env(key, target):
    # Find the env id first
    code, data = api('GET', f'/v10/projects/{PROJECT_ID}/env')
    if code != 200:
        print(f'FAIL listing: HTTP {code}: {data}')
        return 1
    for env in data.get('envs', []):
        if env.get('key') != key:
            continue
        if target and target not in env.get('target', []):
            continue
        env_id = env.get('id')
        code2, data2 = api('DELETE', f'/v10/projects/{PROJECT_ID}/env/{env_id}')
        if code2 == 200:
            print(f'OK: deleted {key} id={env_id}')
        else:
            print(f'FAIL delete {env_id}: HTTP {code2}: {data2}')
    return 0


def trigger_redeploy():
    """Redeploy the latest production deployment with new env vars."""
    code, data = api('GET', f'/v6/deployments?projectId={PROJECT_ID}&target=production&limit=1&state=READY')
    if code != 200 or not data.get('deployments'):
        print(f'Could not find latest deployment: {data}')
        return 1
    latest = data['deployments'][0]
    latest_url = latest['url']
    code2, d2 = api('POST', '/v13/deployments', {
        'name': latest.get('name', 'handy-friend-landing-v6'),
        'project': PROJECT_ID,
        'target': 'production',
        'deploymentId': latest['uid'],
        'meta': {'claudeRedeploy': 'true'}
    })
    if code2 in (200, 201):
        print(f"OK: redeploy queued {d2.get('url', '?')}")
        return 0
    print(f'FAIL redeploy: HTTP {code2}: {d2}')
    return 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--delete', metavar='KEY')
    ap.add_argument('--from-file', metavar='PATH')
    ap.add_argument('--redeploy', action='store_true')
    ap.add_argument('positional', nargs='*')
    args = ap.parse_args()

    if args.list:
        return list_env()

    if args.redeploy:
        return trigger_redeploy()

    if args.delete:
        target = args.positional[0] if args.positional else None
        return delete_env(args.delete, target)

    if args.from_file:
        if not args.positional:
            print('need KEY as first positional with --from-file')
            return 2
        key = args.positional[0]
        targets_raw = args.positional[1] if len(args.positional) > 1 else 'production,preview'
        value = Path(args.from_file).read_text().strip().splitlines()[-1].strip()
        targets = ['production', 'preview', 'development'] if targets_raw == 'all' else [t.strip() for t in targets_raw.split(',')]
        return add_env(key, value, targets)

    if len(args.positional) < 2:
        print('usage: scripts/vercel_set_env.py KEY VALUE [production|preview|development|all]')
        print('       scripts/vercel_set_env.py --list')
        print('       scripts/vercel_set_env.py --delete KEY [target]')
        print('       scripts/vercel_set_env.py --from-file PATH KEY [targets]')
        print('       scripts/vercel_set_env.py --redeploy')
        return 2

    key = args.positional[0]
    value = args.positional[1]
    targets_raw = args.positional[2] if len(args.positional) > 2 else 'production,preview'
    targets = ['production', 'preview', 'development'] if targets_raw == 'all' else [t.strip() for t in targets_raw.split(',')]
    return add_env(key, value, targets)


if __name__ == '__main__':
    sys.exit(main())
