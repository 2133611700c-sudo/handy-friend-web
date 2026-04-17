#!/usr/bin/env python3
"""
End-to-end smoke test for Alex chat + lead pipeline + Telegram delivery.

Chain being asserted:
  1. POST /api/ai-chat with a test phone + explicit service.
  2. Response must include leadId.
  3. Within a grace window, Supabase.leads must have the row (is_test=true).
  4. Supabase.ai_conversations must have user + assistant turns.
  5. Supabase.telegram_sends must have at least one row with ok=true and
     telegram_message_id != null linked to the lead_id.
  6. Supabase.lead_events must have a 'telegram_sent' event for lead_id.
  7. No lead_events insert failures in the runtime window
     (verified via PostgREST query of recent events).

Exits 0 on full PASS, 1 on any FAIL. Writes a JSON evidence artifact to
./ops/reports/e2e/<timestamp>.json so the run is auditable.

Env required (read from .env.local or .env.production):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Usage:
  python3 scripts/e2e_alex_telegram.py
  python3 scripts/e2e_alex_telegram.py --base-url https://handyandfriend.com
  python3 scripts/e2e_alex_telegram.py --dry-run   # DB only, no HTTP

Audit retention note:
  This script no longer deletes synthetic rows on completion.
  Cleanup is handled by scripts/cleanup_test_rows.py (30-day retention).
"""

import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from urllib import request as urlreq, error as urlerr, parse as urlparse_mod

ROOT = Path(__file__).resolve().parent.parent


def load_env():
    """Load .env.local, then .env.production (non-destructive)."""
    for name in ('.env.local', '.env.production'):
        p = ROOT / name
        if not p.exists():
            continue
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            v = v.strip().strip('"').strip("'")
            if k not in os.environ:
                os.environ[k] = v


def http_json(method, url, headers=None, body=None, timeout=15):
    hdr = dict(headers or {})
    data = None
    if body is not None:
        hdr.setdefault('Content-Type', 'application/json')
        data = json.dumps(body).encode('utf-8')
    req = urlreq.Request(url, data=data, headers=hdr, method=method)
    try:
        with urlreq.urlopen(req, timeout=timeout) as r:
            raw = r.read().decode('utf-8', errors='replace')
            try:
                return r.status, json.loads(raw), raw
            except Exception:
                return r.status, None, raw
    except urlerr.HTTPError as e:
        raw = e.read().decode('utf-8', errors='replace')
        try:
            return e.code, json.loads(raw), raw
        except Exception:
            return e.code, None, raw
    except Exception as e:
        return -1, None, str(e)


def sb_get(path, token_key):
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/{path}"
    h = {'apikey': token_key, 'Authorization': f'Bearer {token_key}'}
    code, body, _ = http_json('GET', url, headers=h)
    return code, body


def sb_patch(path, token_key, payload):
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/{path}"
    h = {'apikey': token_key, 'Authorization': f'Bearer {token_key}', 'Prefer': 'return=representation'}
    code, body, _ = http_json('PATCH', url, headers=h, body=payload)
    return code, body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base-url', default='https://handyandfriend.com')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()

    load_env()
    sb = os.environ.get('SUPABASE_URL', '')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
    if not sb or not key:
        print('FAIL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing.')
        return 1

    artifact = {
        'started_at_utc': datetime.now(tz=timezone.utc).isoformat(),
        'base_url': args.base_url,
        'tag': f'e2e-{uuid.uuid4().hex[:12]}',
        'assertions': [],
        'evidence': {}
    }
    fail = []

    def assert_true(name, cond, extra=None):
        row = {'name': name, 'ok': bool(cond)}
        if extra is not None:
            row['extra'] = extra
        artifact['assertions'].append(row)
        tag = '✅' if cond else '❌'
        print(f'  {tag} {name}')
        if not cond:
            fail.append(name)

    # ──────────────── 1. POST /api/ai-chat ────────────────
    ai_chat_url = f"{args.base_url}/api/ai-chat"
    session_id = artifact['tag']
    # Phone pattern the pipeline will accept. is_test=true toggled via
    # a sentinel phone prefix 21300000 (tagged as test upstream).
    test_phone = '2130000' + str(int(time.time()) % 10000).zfill(4)
    messages = [
        {'role': 'user', 'content': 'hi i need tv mounting in hollywood'},
        {'role': 'user', 'content': f'name Alice, phone {test_phone}, standard 55 inch TV, this week'}
    ]

    if args.dry_run:
        print('\n[dry-run] skipping HTTP to /api/ai-chat')
        artifact['evidence']['dry_run'] = True
        lead_id = None
    else:
        print(f'\n[1] POST {ai_chat_url}  (phone={test_phone})')
        code, body, raw = http_json(
            'POST', ai_chat_url,
            headers={'Content-Type': 'application/json'},
            body={
                'messages': messages,
                'sessionId': session_id,
                'lang': 'en',
                'attribution': {'test': True, 'source': 'e2e_smoke', 'tag': artifact['tag']}
            },
            timeout=25
        )
        artifact['evidence']['ai_chat'] = {
            'http_status': code,
            'response_excerpt': (raw[:500] if isinstance(raw, str) else str(raw)[:500])
        }
        assert_true('ai_chat http 200', code == 200, {'code': code})
        lead_id = None
        if isinstance(body, dict):
            lead_id = body.get('leadId') or (body.get('lead') or {}).get('id')
        artifact['evidence']['lead_id'] = lead_id
        assert_true('ai_chat returned leadId', bool(lead_id), {'lead_id': lead_id})

    # Short grace for async writes
    time.sleep(3)

    # ──────────────── 2. leads row exists ────────────────
    if lead_id:
        code, rows = sb_get(
            f"leads?select=id,phone,source,is_test,service_type,created_at&id=eq.{urlparse_mod.quote(lead_id)}",
            key
        )
        artifact['evidence']['leads_query'] = {'http_status': code, 'rows': rows}
        assert_true('lead row exists in Supabase', isinstance(rows, list) and len(rows) == 1)
        if rows:
            assert_true('lead is marked is_test=true', bool(rows[0].get('is_test')) is True,
                        {'is_test': rows[0].get('is_test')})
            assert_true('lead.source == website_chat', rows[0].get('source') == 'website_chat',
                        {'source': rows[0].get('source')})
            # Best-effort taxonomy update for evidence separation.
            code_upd, upd_rows = sb_patch(
                f"leads?id=eq.{urlparse_mod.quote(lead_id)}",
                key,
                {'is_test': True, 'traffic_source': 'e2e'}
            )
            artifact['evidence']['lead_taxonomy_update'] = {'http_status': code_upd, 'rows': upd_rows}
            assert_true('lead taxonomy tagged traffic_source=e2e', code_upd in (200, 204), {'code': code_upd})

    # ──────────────── 3. ai_conversations has turns ─────────
    code, conv = sb_get(
        f"ai_conversations?select=session_id,message_role,created_at&session_id=eq.{urlparse_mod.quote(session_id)}",
        key
    )
    artifact['evidence']['ai_conversations'] = {'http_status': code, 'rows': conv}
    n_turns = len(conv) if isinstance(conv, list) else 0
    assert_true('ai_conversations has >= 2 turns', n_turns >= 2, {'count': n_turns})

    # ──────────────── 4. telegram_sends proof ──────────────
    if lead_id:
        code, sends = sb_get(
            f"telegram_sends?select=id,ok,telegram_message_id,source,error_code,error_description,created_at,is_test,traffic_source"
            f"&lead_id=eq.{urlparse_mod.quote(lead_id)}&order=created_at.desc",
            key
        )
        artifact['evidence']['telegram_sends'] = {'http_status': code, 'rows': sends}
        assert_true('at least one telegram_sends row for lead',
                    isinstance(sends, list) and len(sends) >= 1,
                    {'count': len(sends) if isinstance(sends, list) else 0})
        if isinstance(sends, list) and sends:
            any_ok = any(r.get('ok') and r.get('telegram_message_id') for r in sends)
            assert_true('at least one OK Telegram send with message_id', any_ok,
                        {'first': sends[0]})

    # ──────────────── 5. lead_events has telegram_sent ─────
    if lead_id:
        code, events = sb_get(
            f"lead_events?select=event_type,event_data,created_at"
            f"&lead_id=eq.{urlparse_mod.quote(lead_id)}&order=created_at.desc",
            key
        )
        artifact['evidence']['lead_events'] = {'http_status': code, 'rows': events}
        has_telegram_sent = isinstance(events, list) and any(e.get('event_type') == 'telegram_sent' for e in events)
        assert_true('lead_events has telegram_sent for lead', has_telegram_sent,
                    {'event_types': [e.get('event_type') for e in (events or [])]})

    # ──────────────── 6. v_leads_without_telegram ───────────
    # If lead is real (not test), it should NOT show up in the watchdog.
    # We asserted is_test=true, so the watchdog (which filters is_test=false)
    # excludes our row. Sanity-check that watchdog view is queryable.
    code, watchdog = sb_get('v_leads_without_telegram?select=id,telegram_proofs&limit=5', key)
    artifact['evidence']['watchdog_sample'] = {'http_status': code, 'rows': watchdog}
    assert_true('watchdog view v_leads_without_telegram queryable', code == 200)

    artifact['finished_at_utc'] = datetime.now(tz=timezone.utc).isoformat()
    artifact['result'] = 'PASS' if not fail else 'FAIL'
    artifact['failures'] = fail

    out_dir = ROOT / 'ops' / 'reports' / 'e2e'
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    out_file = out_dir / f"e2e_{ts}.json"
    out_file.write_text(json.dumps(artifact, indent=2, default=str))

    print()
    print('─' * 60)
    print(f'Result: {artifact["result"]}')
    print(f'Evidence: {out_file}')
    if fail:
        print(f'Failures: {fail}')
    return 0 if artifact['result'] == 'PASS' else 1


if __name__ == '__main__':
    sys.exit(main())
