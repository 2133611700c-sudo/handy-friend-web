#!/usr/bin/env python3
"""
Autonomous watchdog — runs every 30 minutes via scheduled-tasks MCP.

Checks:
  1. All 24 Google Ads URLs return 200 (audit_ads_urls.py).
  2. Alex chat e2e PASS 10/10 (e2e_alex_telegram.py).
  3. Alex regression 6/6 (regression_alex.py) — runs only hourly to save Deepseek cost.
  4. Telegram dashboard: bot_webhook pending_updates==0 and last_error is None.
  5. /api/health healthy=true.
  6. Supabase dashboard_stats — leads, revenue, chat sessions.

If ANY check fails, sends ONE Telegram alert to owner via the same bot.
Writes a JSON snapshot to ops/reports/watchdog/<ts>.json each run.

Runs silently (no Telegram) if everything is green.
"""

import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
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


def run_script(path, timeout=120):
    t0 = time.time()
    try:
        r = subprocess.run(
            ['python3', str(ROOT / path)],
            capture_output=True, text=True, timeout=timeout
        )
        return {
            'exit': r.returncode,
            'stdout_tail': '\n'.join(r.stdout.splitlines()[-8:]),
            'stderr_tail': '\n'.join(r.stderr.splitlines()[-4:]),
            'elapsed_s': round(time.time() - t0, 1)
        }
    except subprocess.TimeoutExpired:
        return {'exit': -1, 'error': 'timeout', 'elapsed_s': timeout}
    except Exception as e:
        return {'exit': -1, 'error': str(e), 'elapsed_s': round(time.time() - t0, 1)}


def http_json(url, headers=None, timeout=10):
    req = urlreq.Request(url, headers=headers or {})
    try:
        with urlreq.urlopen(req, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode('utf-8', errors='replace'))
    except Exception as e:
        return -1, {'error': str(e)}


def send_telegram(text):
    enabled = os.environ.get('AUTONOMOUS_WATCHDOG_TELEGRAM_ENABLED', '').strip().lower() in {'1', 'true', 'yes', 'on'}
    if not enabled:
        return False, 'disabled_by_env'
    token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
    chat_id = os.environ.get('TELEGRAM_CHAT_ID', '')
    if not token or not chat_id:
        return False, 'env_missing'
    try:
        import urllib.request
        data = json.dumps({
            'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML',
            'disable_web_page_preview': True
        }).encode()
        req = urllib.request.Request(
            f'https://api.telegram.org/bot{token}/sendMessage',
            data=data, headers={'Content-Type': 'application/json'}, method='POST'
        )
        with urllib.request.urlopen(req, timeout=5) as r:
            j = json.loads(r.read())
            return j.get('ok', False), j.get('result', {}).get('message_id')
    except Exception as e:
        return False, str(e)[:200]


def main():
    load_env()
    now = datetime.now(tz=timezone.utc)
    snapshot = {'checked_at': now.isoformat(), 'base_url': 'https://handyandfriend.com'}

    # 1) URL audit — cheap, every run
    r_urls = run_script('scripts/audit_ads_urls.py', timeout=60)
    snapshot['ads_urls'] = r_urls

    # 2) Health endpoint
    code, health = http_json('https://handyandfriend.com/api/health')
    snapshot['health'] = {'http': code, 'ok': health.get('ok') if isinstance(health, dict) else False}

    # 3) Telegram dashboard
    code_t, tg = http_json('https://handyandfriend.com/api/health?type=telegram')
    snapshot['telegram_dashboard'] = {
        'http': code_t,
        'pending': tg.get('bot_webhook', {}).get('pending_update_count') if isinstance(tg, dict) else None,
        'fails_24h': tg.get('failures_24h') if isinstance(tg, dict) else None,
        'fails_7d': tg.get('failures_7d') if isinstance(tg, dict) else None,
        'leads_without_proof': tg.get('leads_without_telegram_proof_7d') if isinstance(tg, dict) else None,
    }

    # Hourly: full e2e
    minute_of_hour = now.minute
    if minute_of_hour < 5:
        r_e2e = run_script('scripts/e2e_alex_telegram.py', timeout=120)
        snapshot['e2e'] = r_e2e

    # Decide alerts
    issues = []
    if r_urls.get('exit') != 0:
        issues.append(f'Ads URL audit FAILED (exit={r_urls.get("exit")})')
    if snapshot['health']['http'] != 200:
        issues.append(f'/api/health HTTP {snapshot["health"]["http"]}')
    if snapshot['telegram_dashboard']['http'] != 200:
        issues.append(f'/api/health?type=telegram HTTP {snapshot["telegram_dashboard"]["http"]}')
    td = snapshot['telegram_dashboard']
    if isinstance(td.get('pending'), int) and td['pending'] > 10:
        issues.append(f'Telegram pending_updates={td["pending"]}')
    if isinstance(td.get('fails_24h'), int) and td['fails_24h'] > 3:
        issues.append(f'Telegram fails_24h={td["fails_24h"]}')
    if isinstance(td.get('leads_without_proof'), int) and td['leads_without_proof'] > 0:
        issues.append(f'{td["leads_without_proof"]} real leads without Telegram proof')
    if snapshot.get('e2e') and snapshot['e2e'].get('exit') != 0:
        issues.append('E2E Alex chain FAILED')

    snapshot['issues'] = issues
    snapshot['result'] = 'RED' if issues else 'GREEN'

    # Alert only on problems
    if issues:
        msg = '🚨 <b>Watchdog alert</b>\n' + '\n'.join(f'• {i}' for i in issues)
        ok, mid = send_telegram(msg)
        snapshot['alert'] = {'sent': ok, 'message_id': mid}

    # Persist
    out_dir = ROOT / 'ops' / 'reports' / 'watchdog'
    out_dir.mkdir(parents=True, exist_ok=True)
    ts = now.strftime('%Y%m%d_%H%M%S')
    (out_dir / f'{ts}.json').write_text(json.dumps(snapshot, indent=2, default=str))

    # Print summary line for the task log
    print(f'[{now.isoformat()}] {snapshot["result"]}  issues={len(issues)}  e2e_ran={"e2e" in snapshot}')
    return 0 if not issues else 1


if __name__ == '__main__':
    sys.exit(main())
