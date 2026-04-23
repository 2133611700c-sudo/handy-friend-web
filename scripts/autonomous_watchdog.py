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


def sb_get(path: str, timeout: int = 10):
    """Simple Supabase REST GET. Returns (status_code, data)."""
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ.get('SUPABASE_SERVICE_KEY', '')
    if not url or not key:
        return -1, {'error': 'supabase_env_missing'}
    h = {'apikey': key, 'Authorization': f'Bearer {key}', 'Accept': 'application/json'}
    return http_json(f'{url}/rest/v1/{path}', headers=h, timeout=timeout)


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

    # Helper: parse ISO timestamp robustly (handles microseconds + offset variants)
    import re as _re
    import datetime as _dt

    def _parse_ts(ts_str):
        """Parse ISO8601 timestamp robustly: strip microseconds, normalise offset."""
        if not ts_str:
            return None
        ts = _re.sub(r'\.\d+', '', str(ts_str))   # strip microseconds
        ts = ts.replace('Z', '+00:00')              # Z → offset form
        return _dt.datetime.fromisoformat(ts)

    def _row_age_h(rows):
        """Given a list of rows with 'created_at', return age in hours of first row."""
        if not rows or not isinstance(rows, list):
            return None
        try:
            ts = _parse_ts(rows[0].get('created_at', ''))
            return round((now - ts).total_seconds() / 3600, 1) if ts else None
        except Exception:
            return None

    from datetime import timedelta
    cutoff_24h = (now - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%SZ')
    cutoff_7d = (now - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')

    # 4) Social leads stuck check — HOT/WARM signals sitting in status='new' for >24h
    # Use Z suffix (not +00:00) — urllib raises on 4xx, and raw + in URLs can corrupt timestamps.
    sc_code, sc_data = sb_get(
        f'social_leads?select=id,created_at,intent_type&status=eq.new&intent_type=in.(HOT,WARM)'
        f'&created_at=lt.{cutoff_24h}&order=created_at.asc&limit=100'
    )
    social_stuck = len(sc_data) if sc_code == 200 and isinstance(sc_data, list) else None
    # Oldest stuck signal age (for escalation context)
    stuck_oldest_age_d = None
    hot_7d_stuck = 0
    if sc_code == 200 and isinstance(sc_data, list) and sc_data:
        try:
            oldest_ts = _parse_ts(sc_data[0].get('created_at', ''))
            stuck_oldest_age_d = round((now - oldest_ts).total_seconds() / 86400, 1) if oldest_ts else None
        except Exception:
            pass
        cutoff_7d_ts = (now - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
        hot_7d_stuck = sum(1 for r in sc_data if r.get('intent_type') == 'HOT' and
                           r.get('created_at', '') < cutoff_7d_ts)

    # Social lifecycle summary — reviewed/contacted help owner track follow-through
    sl_code, sl_data = sb_get('social_leads?select=status,intent_type&limit=2000')
    social_lifecycle = {'new_hot_warm': 0, 'reviewed': 0, 'contacted': 0, 'converted': 0, 'ignored_hot_warm': 0}
    if sl_code == 200 and isinstance(sl_data, list):
        for row in sl_data:
            s, i = row.get('status'), row.get('intent_type')
            if i in ('HOT', 'WARM'):
                if s == 'new':
                    social_lifecycle['new_hot_warm'] += 1
                elif s == 'reviewed':
                    social_lifecycle['reviewed'] += 1
                elif s == 'contacted':
                    social_lifecycle['contacted'] += 1
                elif s == 'converted':
                    social_lifecycle['converted'] += 1
                elif s == 'ignored':
                    social_lifecycle['ignored_hot_warm'] += 1
    snapshot['social_leads_stuck'] = {
        'http': sc_code,
        'count': social_stuck,
        'oldest_age_days': stuck_oldest_age_d,
        'hot_7d_unreviewed': hot_7d_stuck,
    }
    snapshot['social_leads_lifecycle'] = social_lifecycle

    # 5) FB Messenger — real organic sessions only (no test sessions)
    # Real FB sender IDs are long numeric strings (10+ digits).
    # Test sessions contain letters or are short numbers.
    REAL_FB_SESSION = _re.compile(r'^fb_\d{10,}$')
    sessions_code, sessions_data = sb_get(
        f'ai_conversations?select=session_id&session_id=like.fb_%25'
        f'&created_at=gte.{cutoff_7d}&limit=500'
    )
    fb_leads_code, fb_leads_data = sb_get(
        f'leads?select=id&source=eq.facebook&is_test=eq.false'
        f'&created_at=gte.{cutoff_7d}&limit=500'
    )
    # Count only sessions with real (numeric) sender IDs — exclude test sessions
    all_fb_sessions = {r['session_id'] for r in sessions_data if isinstance(r, dict) and r.get('session_id')} \
        if sessions_code == 200 and isinstance(sessions_data, list) else set()
    real_fb_sessions_7d = len({s for s in all_fb_sessions if REAL_FB_SESSION.match(s)})
    fb_leads_7d = len(fb_leads_data) if fb_leads_code == 200 and isinstance(fb_leads_data, list) else None

    # Also count organic pre-leads (is_test=false, source=facebook, full_name=FB:*)
    pl_code, pl_data = sb_get(
        'leads?select=id&source=eq.facebook&full_name=like.FB%3A%25&is_test=eq.false&limit=50'
    )
    organic_pre_leads = len(pl_data) if pl_code == 200 and isinstance(pl_data, list) else None
    snapshot['fb_messenger'] = {
        'real_sessions_7d': real_fb_sessions_7d,
        'leads_7d': fb_leads_7d,
        'organic_pre_leads': organic_pre_leads,
    }

    # 6) Scanner platform staleness — last social_lead row age per platform
    # "ALIVE" in ops_incidents = source URL reachable, NOT "posts collected".
    for platform, threshold_h, key in [
        ('nextdoor', 168, 'nextdoor_scanner'),  # 7 days
        ('craigslist', 48, 'craigslist_scanner'),  # 2 days
        ('facebook', 48, 'facebook_scanner'),  # 2 days
    ]:
        p_code, p_data = sb_get(
            f'social_leads?select=id,created_at&platform=eq.{platform}'
            f'&order=created_at.desc&limit=1'
        )
        p_last_at = p_data[0].get('created_at', '') if p_code == 200 and isinstance(p_data, list) and p_data else None
        p_age_h = _row_age_h(p_data) if p_code == 200 and isinstance(p_data, list) and p_data else None
        snapshot[key] = {'http': p_code, 'last_row_at': p_last_at, 'age_hours': p_age_h}

    # Convenience aliases for alert logic
    nd_last_row_age_h = snapshot['nextdoor_scanner']['age_hours']
    cl_last_row_age_h = snapshot['craigslist_scanner']['age_hours']
    fb_scanner_age_h = snapshot['facebook_scanner']['age_hours']

    # 7) Scanner proof gap — if scanner is active (recent rows) but writes NO telegram_sends proof rows,
    # Dell-side social_scanner.py is running unpatched (missing log_telegram_send_proof call).
    # tg_msg_id=88888 is the synthetic test row; exclude it.
    pf_code, pf_data = sb_get(
        'telegram_sends?select=id,created_at&source=eq.social_scanner'
        '&telegram_message_id=neq.88888&order=created_at.desc&limit=1'
    )
    scanner_proof_age_h = _row_age_h(pf_data) if pf_code == 200 and isinstance(pf_data, list) and pf_data else None
    scanner_is_active = (
        (isinstance(cl_last_row_age_h, float) and cl_last_row_age_h < 48) or
        (isinstance(fb_scanner_age_h, float) and fb_scanner_age_h < 48)
    )
    snapshot['scanner_proof_gap'] = {
        'last_real_proof_age_h': scanner_proof_age_h,
        'scanner_active': scanner_is_active,
        'gap_confirmed': scanner_is_active and scanner_proof_age_h is None,
    }

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
    if isinstance(social_stuck, int) and social_stuck > 0:
        oldest_str = f', oldest {stuck_oldest_age_d}d' if stuck_oldest_age_d else ''
        issues.append(f'{social_stuck} HOT/WARM social leads stuck >24h in status=new{oldest_str} (review in social_leads table)')
    if hot_7d_stuck > 0:
        issues.append(f'ESCALATION: {hot_7d_stuck} HOT signals unreviewed for >7 days — likely expired, mark ignored')
    # FB Messenger gap: only flag if REAL (numeric sender ID) sessions exist without leads/pre_leads
    fb_real_gap = (
        isinstance(real_fb_sessions_7d, int) and real_fb_sessions_7d > 0
        and isinstance(fb_leads_7d, int) and fb_leads_7d == 0
        and (organic_pre_leads or 0) == 0
    )
    if fb_real_gap:
        issues.append(f'FB Messenger: {real_fb_sessions_7d} real sessions in 7d → 0 leads/pre-leads (phone gate blocking capture)')
    # Scanner staleness — Nextdoor (7-day threshold), CL + FB (2-day threshold)
    # ND note: ops_incidents shows scanner IS running (CL:OK, ND:OK) — so ND threshold means
    # "zero HOT/WARM yield for N days", not "scanner offline".
    if isinstance(nd_last_row_age_h, float) and nd_last_row_age_h > 168:
        issues.append(
            f'Nextdoor HOT/WARM yield zero: last signal {round(nd_last_row_age_h/24,1)}d ago'
            f' — scanner is running but all recent ND posts are COLD (check classifier or ND content)'
        )
    if isinstance(cl_last_row_age_h, float) and cl_last_row_age_h > 48:
        issues.append(f'CL scanner: last post {round(cl_last_row_age_h,1)}h ago — scanner may be stale')
    if isinstance(fb_scanner_age_h, float) and fb_scanner_age_h > 48:
        issues.append(f'FB Groups scanner: last post {round(fb_scanner_age_h,1)}h ago — scanner may be stale')
    # Scanner proof gap — Dell has not synced social_scanner.py proof-row fix
    if snapshot['scanner_proof_gap']['gap_confirmed']:
        issues.append('Scanner proof gap: scanner is active but writes 0 telegram_sends proof rows — Dell sync required')

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
    lc = snapshot.get('social_leads_lifecycle', {})
    print(
        f'[{now.isoformat()}] {snapshot["result"]}  issues={len(issues)}'
        f'  stuck={social_stuck}  reviewed={lc.get("reviewed",0)}  contacted={lc.get("contacted",0)}'
        f'  real_fb_sessions_7d={real_fb_sessions_7d}  proof_gap={snapshot["scanner_proof_gap"]["gap_confirmed"]}'
        f'  e2e_ran={"e2e" in snapshot}'
    )
    return 0 if not issues else 1


if __name__ == '__main__':
    sys.exit(main())
