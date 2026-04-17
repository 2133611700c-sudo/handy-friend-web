#!/usr/bin/env python3
"""
Daily Sales Pulse — what's the business doing today?

Runs at 08:57 local via handy-friend-daily-digest scheduled task.
Outputs:
  1. Terminal summary (for logs).
  2. JSON snapshot to ops/reports/sales-pulse/.
  3. Telegram message to owner with actionable next-steps for today.

Pulls from production Supabase (read-only) and /api/health.
"""

import json
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib import request as urlreq

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


def sb_get(path):
    url = f"{os.environ['SUPABASE_URL']}/rest/v1/{path}"
    h = {'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'],
         'Authorization': f'Bearer {os.environ["SUPABASE_SERVICE_ROLE_KEY"]}'}
    try:
        with urlreq.urlopen(urlreq.Request(url, headers=h), timeout=10) as r:
            return r.status, json.loads(r.read().decode('utf-8', errors='replace'))
    except Exception as e:
        return -1, {'error': str(e)}


def send_telegram(text):
    import urllib.request
    data = json.dumps({
        'chat_id': os.environ['TELEGRAM_CHAT_ID'],
        'text': text,
        'parse_mode': 'HTML',
        'disable_web_page_preview': True
    }).encode()
    req = urllib.request.Request(
        f'https://api.telegram.org/bot{os.environ["TELEGRAM_BOT_TOKEN"]}/sendMessage',
        data=data, headers={'Content-Type': 'application/json'}, method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read()).get('ok', False)
    except Exception:
        return False


def main():
    load_env()
    now = datetime.now(tz=timezone.utc)
    since_24h = (now - timedelta(hours=24)).isoformat()
    since_7d = (now - timedelta(days=7)).isoformat()

    # 1) Leads last 24h (real only)
    _, leads_24h = sb_get(f'leads?select=id,source,service_type,stage,created_at&is_test=eq.false&created_at=gte.{since_24h}&order=created_at.desc')

    # 2) Leads last 7d
    _, leads_7d = sb_get(f'leads?select=id,source,stage,created_at&is_test=eq.false&created_at=gte.{since_7d}')

    # 3) Jobs in last 7d
    _, jobs_7d = sb_get(f"jobs?select=id,status,total_amount,completed_date&completed_date=gte.{since_7d[:10]}")

    # 4) Chat activity last 24h
    _, chats_24h = sb_get(f'ai_conversations?select=session_id,created_at&created_at=gte.{since_24h}')

    # 5) Telegram dashboard
    try:
        with urlreq.urlopen(urlreq.Request('https://handyandfriend.com/api/health?type=telegram'), timeout=8) as r:
            tg = json.loads(r.read())
    except Exception:
        tg = {}

    # Stats
    n_leads_24h = len(leads_24h) if isinstance(leads_24h, list) else 0
    n_leads_7d = len(leads_7d) if isinstance(leads_7d, list) else 0
    n_chat_sessions_24h = len({r['session_id'] for r in chats_24h}) if isinstance(chats_24h, list) else 0
    n_chat_msgs_24h = len(chats_24h) if isinstance(chats_24h, list) else 0

    completed_7d = [j for j in (jobs_7d or []) if j.get('status') == 'completed']
    revenue_7d = sum(float(j.get('total_amount') or 0) for j in completed_7d)

    tg_fails_24h = tg.get('failures_24h', '?')
    tg_fails_7d = tg.get('failures_7d', '?')
    tg_pending = tg.get('bot_webhook', {}).get('pending_update_count', '?')
    no_proof = tg.get('leads_without_telegram_proof_7d', '?')

    # Action signals
    actions = []
    if n_leads_24h == 0 and n_chat_sessions_24h > 0:
        actions.append(f'📉 {n_chat_sessions_24h} chat sessions → 0 leads captured — investigate Alex capture rate')
    if n_leads_7d == 0:
        actions.append('🚨 0 real leads in 7 days — SMM blast needed, check Google Ads Search top IS')
    if isinstance(tg_fails_24h, int) and tg_fails_24h > 3:
        actions.append(f'⚠️ {tg_fails_24h} Telegram failures in 24h — check bot token')
    if isinstance(no_proof, int) and no_proof > 0:
        actions.append(f'⚠️ {no_proof} leads without Telegram delivery proof')

    # Compose Telegram message
    lines = [f'📊 <b>Daily Sales Pulse {now.strftime("%Y-%m-%d")}</b>', '']
    lines.append(f'<b>Last 24h:</b>  leads={n_leads_24h}  chat_sessions={n_chat_sessions_24h}  chat_msgs={n_chat_msgs_24h}')
    lines.append(f'<b>Last 7d:</b>   leads={n_leads_7d}  jobs_completed={len(completed_7d)}  revenue=${revenue_7d:.0f}')
    lines.append(f'<b>Telegram:</b>  fails_24h={tg_fails_24h}  fails_7d={tg_fails_7d}  pending={tg_pending}  no_proof={no_proof}')
    lines.append('')
    if actions:
        lines.append('<b>🎯 Action today:</b>')
        lines.extend(actions)
    else:
        lines.append('✅ No alerts. System green.')

    msg = '\n'.join(lines)

    # Persist snapshot
    snap = {
        'generated_at': now.isoformat(),
        'leads_24h': n_leads_24h, 'leads_7d': n_leads_7d,
        'chat_sessions_24h': n_chat_sessions_24h, 'chat_msgs_24h': n_chat_msgs_24h,
        'jobs_completed_7d': len(completed_7d), 'revenue_7d': revenue_7d,
        'telegram_fails_24h': tg_fails_24h, 'telegram_fails_7d': tg_fails_7d,
        'leads_without_proof_7d': no_proof,
        'actions': actions,
        'raw_leads_24h_sample': leads_24h[:5] if isinstance(leads_24h, list) else []
    }
    out_dir = ROOT / 'ops' / 'reports' / 'sales-pulse'
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f'{now.strftime("%Y%m%d_%H%M")}.json').write_text(json.dumps(snap, indent=2, default=str))

    print(msg.replace('<b>', '').replace('</b>', ''))
    send_telegram(msg)
    return 0


if __name__ == '__main__':
    sys.exit(main())
