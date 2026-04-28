#!/usr/bin/env python3
"""
Daily Sales Pulse — what's the business doing today?

Multi-channel truthful digest. Sends when there is actionable content OR errors.
Does NOT send if all counts are zero AND no errors (avoids zero-report fatigue).

Channels covered:
  - Website form leads (source=website/google_ads_search)
  - Website AI chat pre-leads
  - Facebook Messenger (real leads + pre_leads)
  - Social scanner HOT/WARM signals (craigslist, nextdoor, facebook groups)
  - Stuck social_leads backlog
  - Dark channels: Nextdoor inbox (manual), Meta Page inbox (manual)

Required env:
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (for alerts)
  SALES_PULSE_TELEGRAM_ENABLED=1 (to actually send)
"""

import json
import os
import sys
import subprocess
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
    h = {
        'apikey': os.environ['SUPABASE_SERVICE_ROLE_KEY'],
        'Authorization': f'Bearer {os.environ["SUPABASE_SERVICE_ROLE_KEY"]}',
        'Accept': 'application/json',
    }
    try:
        with urlreq.urlopen(urlreq.Request(url, headers=h), timeout=10) as r:
            return r.status, json.loads(r.read().decode('utf-8', errors='replace'))
    except Exception as e:
        # Capture HTTPError body so we can detect "missing column / table" gracefully.
        try:
            from urllib.error import HTTPError
            if isinstance(e, HTTPError):
                body = e.read().decode('utf-8', errors='replace')
                try:
                    return e.code, json.loads(body)
                except Exception:
                    return e.code, {'error': body[:500]}
        except Exception:
            pass
        return -1, {'error': str(e)}


def _meta_dict(row):
    """funnel_events.metadata is JSONB — PostgREST returns it as dict, but be defensive."""
    m = row.get('metadata') if isinstance(row, dict) else None
    if isinstance(m, dict):
        return m
    if isinstance(m, str):
        try:
            d = json.loads(m)
            return d if isinstance(d, dict) else {}
        except Exception:
            return {}
    return {}


def _is_paid_event(row):
    """Google Ads attributed CTA: gclid in metadata, utm_source=google, or channel_source=google_ads_search."""
    meta = _meta_dict(row)
    if meta.get('gclid'):
        return True
    if str(meta.get('utm_source', '')).lower() == 'google':
        return True
    cs = str(row.get('channel_source') or '').lower()
    if cs in ('google_ads_search', 'google_ads', 'paid_search'):
        return True
    return False


def _service_slug(row):
    meta = _meta_dict(row)
    slug = meta.get('service_slug') or meta.get('service') or meta.get('service_type')
    if slug:
        return str(slug).lower()
    # Fallback: derive from page_path
    pp = (row.get('page_path') or '').strip().lower()
    if not pp or pp == '/':
        return 'home'
    parts = [p for p in pp.split('/') if p]
    if not parts:
        return 'home'
    # drop common non-service first segments
    if parts[0] in ('services', 'service'):
        parts = parts[1:] or ['home']
    return parts[0].split('?')[0].split('#')[0] or 'home'


def send_telegram(text):
    enabled = os.environ.get('SALES_PULSE_TELEGRAM_ENABLED', '').strip().lower() in {'1', 'true', 'yes', 'on'}
    if not enabled:
        return False
    proc = subprocess.run(
        [
            'node',
            'scripts/send-telegram.mjs',
            '--source', 'sales_pulse',
            '--category', 'daily_sales_pulse',
            '--actionable', '1',
            '--stdin',
        ],
        cwd=str(ROOT),
        input=text.encode('utf-8', errors='replace'),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=10,
        check=False,
    )
    if proc.returncode != 0:
        return False
    try:
        payload = json.loads(proc.stdout.decode('utf-8', errors='replace') or '{}')
    except Exception:
        return False
    return bool(payload.get('ok') is True)


def count_list(code, data):
    """Return len(data) if HTTP 200 and data is list, else None."""
    return len(data) if code == 200 and isinstance(data, list) else None


def main():
    load_env()
    now = datetime.now(tz=timezone.utc)
    # Use Z suffix (not +00:00) — urllib raises on 4xx when raw + corrupts timestamp
    since_24h = (now - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%SZ')
    since_7d = (now - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
    today_start = now.strftime('%Y-%m-%dT00:00:00Z')
    stuck_cutoff = (now - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%SZ')

    errors = []

    # ── 1. Real leads (website + paid search) last 24h ──────────────────────
    c, real_leads_24h = sb_get(
        f'leads?select=id,source,service_type,stage'
        f'&is_test=eq.false&created_at=gte.{since_24h}&limit=500'
    )
    n_real_leads_24h = count_list(c, real_leads_24h)
    if n_real_leads_24h is None:
        errors.append(f'leads query failed http={c}')
        n_real_leads_24h = 0

    c, real_leads_7d = sb_get(
        f'leads?select=id&is_test=eq.false&created_at=gte.{since_7d}&limit=500'
    )
    n_real_leads_7d = count_list(c, real_leads_7d) or 0

    # ── 2. Pre-leads (FB Messenger conversations without phone) ──────────────
    # Identified by: source=facebook, full_name starts with 'FB:', phone is null
    # FB pre-leads: rows created by maybeCreateFbPreLead() — full_name='FB:<sender_id>'
    # URL pattern: %3A = colon, %25 = percent-sign (SQL LIKE wildcard)
    c, preleads = sb_get(
        f'leads?select=id,session_id,service_type,created_at'
        f'&source=eq.facebook&full_name=like.FB%3A%25&is_test=eq.false&limit=200'
    )
    n_preleads = count_list(c, preleads) or 0

    # ── 3. Social HOT/WARM signals today ────────────────────────────────────
    c, hot_today = sb_get(
        f'social_leads?select=id,platform,intent_type,service_type,created_at'
        f'&intent_type=in.(HOT,WARM)&created_at=gte.{today_start}&limit=100'
    )
    n_hot_today = count_list(c, hot_today) or 0
    hot_by_platform = {}
    if isinstance(hot_today, list):
        for row in hot_today:
            p = row.get('platform', 'unknown')
            hot_by_platform[p] = hot_by_platform.get(p, 0) + 1

    # ── 4. Stuck HOT/WARM backlog (>24h, no action) ─────────────────────────
    c, stuck = sb_get(
        f'social_leads?select=id,platform,intent_type,service_type,created_at'
        f'&status=eq.new&intent_type=in.(HOT,WARM)&created_at=lt.{stuck_cutoff}&limit=100'
    )
    n_stuck = count_list(c, stuck) or 0

    # ── 5. FB Messenger sessions last 7d vs leads ────────────────────────────
    # Only count REAL sessions (numeric sender IDs ≥10 digits); exclude test sessions.
    import re as _re
    REAL_FB_SESSION = _re.compile(r'^fb_\d{10,}$')
    c, fb_sessions = sb_get(
        f'ai_conversations?select=session_id'
        f'&session_id=like.fb_%25&created_at=gte.{since_7d}&limit=500'
    )
    n_fb_sessions_7d = None
    if c == 200 and isinstance(fb_sessions, list):
        all_sessions = {r.get('session_id') for r in fb_sessions if r.get('session_id')}
        n_fb_sessions_7d = len({s for s in all_sessions if REAL_FB_SESSION.match(s)})
    n_fb_leads_7d = n_real_leads_7d  # use overall as proxy (source breakdown not needed here)

    # ── 5b. Social signal lifecycle breakdown ────────────────────────────────
    c, sl_all = sb_get('social_leads?select=status,intent_type&limit=2000')
    sl_lifecycle = {'new': 0, 'reviewed': 0, 'contacted': 0, 'converted': 0}
    if c == 200 and isinstance(sl_all, list):
        for row in sl_all:
            if row.get('intent_type') in ('HOT', 'WARM') and row.get('status') in sl_lifecycle:
                sl_lifecycle[row['status']] += 1

    # ── 5c. Scanner staleness ────────────────────────────────────────────────
    import re as _re2
    def _parse_ts2(ts_str):
        if not ts_str: return None
        ts = _re2.sub(r'\.\d+', '', str(ts_str)).replace('Z', '+00:00')
        from datetime import datetime, timezone
        return datetime.fromisoformat(ts)

    scanner_status = {}
    for plat in ('craigslist', 'facebook', 'nextdoor'):
        c2, d2 = sb_get(f'social_leads?select=created_at&platform=eq.{plat}&order=created_at.desc&limit=1')
        if c2 == 200 and isinstance(d2, list) and d2:
            try:
                ts = _parse_ts2(d2[0].get('created_at', ''))
                age_h = round((now - ts).total_seconds()/3600, 1) if ts else None
                scanner_status[plat] = age_h
            except Exception:
                scanner_status[plat] = None
        else:
            scanner_status[plat] = None  # no rows ever

    # ── 5d. Scanner proof gap ────────────────────────────────────────────────
    # NOTE: telegram_message_id=neq.88888 excludes NULL rows (SQL NULL!=X = NULL).
    # Use id=neq.35 to exclude only the known synthetic test row, include all real proof rows.
    c3, pf_data = sb_get(
        'telegram_sends?select=id&source=eq.social_scanner&id=neq.35&limit=1'
    )
    scanner_proof_exists = c3 == 200 and isinstance(pf_data, list) and len(pf_data) > 0
    scanner_active = any(
        isinstance(h, float) and h < 48 for plat, h in scanner_status.items() if plat != 'nextdoor'
    )

    # ── 6. Telegram delivery health ──────────────────────────────────────────
    c, tg_fails = sb_get(
        f'telegram_sends?select=id&ok=eq.false&created_at=gte.{since_24h}&limit=50'
    )
    n_tg_fails_24h = count_list(c, tg_fails)
    if n_tg_fails_24h is None:
        n_tg_fails_24h = '?'

    # ── 7. Outbox health ────────────────────────────────────────────────────
    c, outbox_pending = sb_get('outbound_jobs?select=id&status=eq.pending&limit=50')
    n_outbox_pending = count_list(c, outbox_pending) or 0
    # Critical failures only (non-ga4) — ga4_event failures are analytics, not lead-capture
    c, outbox_failed = sb_get('outbound_jobs?select=id&status=eq.failed&job_type=neq.ga4_event&limit=50')
    n_outbox_failed = count_list(c, outbox_failed) or 0
    c, outbox_failed_ga4 = sb_get('outbound_jobs?select=id&status=eq.failed&job_type=eq.ga4_event&limit=50')
    n_outbox_failed_ga4 = count_list(c, outbox_failed_ga4) or 0

    # ── 8. Funnel events (CTA activity) last 24h ─────────────────────────────
    # Pulls real + test together once, splits client-side. Degrades to None on
    # missing table / column / network error so report never crashes.
    funnel_available = True
    funnel_real = []
    funnel_test = []
    c, fe_rows = sb_get(
        f'funnel_events?select=id,event_name,page_path,metadata,is_test,channel_source,occurred_at'
        f'&occurred_at=gte.{since_24h}&order=occurred_at.desc&limit=2000'
    )
    if c == 200 and isinstance(fe_rows, list):
        for row in fe_rows:
            # Defensive: treat missing is_test as real (column may not exist on legacy rows)
            if row.get('is_test') is True:
                funnel_test.append(row)
            else:
                funnel_real.append(row)
    elif c in (404, 400):
        funnel_available = False
    else:
        funnel_available = False
        errors.append(f'funnel_events query failed http={c}')

    # CTA totals (real)
    def _count_evt(rows, name):
        return sum(1 for r in rows if r.get('event_name') == name)

    cta_total = len(funnel_real)
    cta_phone = _count_evt(funnel_real, 'phone_click')
    cta_wa = _count_evt(funnel_real, 'whatsapp_click')
    cta_email = _count_evt(funnel_real, 'email_click')
    cta_messenger = _count_evt(funnel_real, 'messenger_click')
    # Estimate proxy: widget_open + phone_captured (chat-driven estimate intents)
    cta_estimate = (
        _count_evt(funnel_real, 'widget_open')
        + _count_evt(funnel_real, 'phone_captured')
        + _count_evt(funnel_real, 'quote_shown')
    )

    cta_test_total = len(funnel_test)

    # CTA by service
    cta_by_service = {}  # slug -> {'phone':..,'wa':..,'estimate':..}
    CTA_TRACKED = {'phone_click', 'whatsapp_click', 'widget_open', 'phone_captured', 'quote_shown'}
    for row in funnel_real:
        en = row.get('event_name')
        if en not in CTA_TRACKED:
            continue
        slug = _service_slug(row)
        bucket = cta_by_service.setdefault(slug, {'phone': 0, 'wa': 0, 'estimate': 0})
        if en == 'phone_click':
            bucket['phone'] += 1
        elif en == 'whatsapp_click':
            bucket['wa'] += 1
        else:  # widget_open, phone_captured, quote_shown
            bucket['estimate'] += 1

    # Paid-attributed CTA (Google Ads)
    paid_rows = [r for r in funnel_real if _is_paid_event(r)]
    paid_cta_total = len(paid_rows)
    paid_cta_phone = _count_evt(paid_rows, 'phone_click')
    paid_cta_wa = _count_evt(paid_rows, 'whatsapp_click')
    paid_cta_estimate = (
        _count_evt(paid_rows, 'widget_open')
        + _count_evt(paid_rows, 'phone_captured')
        + _count_evt(paid_rows, 'quote_shown')
    )

    # Latest evidence
    latest_cta_id = funnel_real[0].get('id') if funnel_real else None
    latest_paid_gclid = None
    for r in paid_rows:
        g = _meta_dict(r).get('gclid')
        if g:
            latest_paid_gclid = g
            break

    # ── 9. Paid leads (last 24h) ─────────────────────────────────────────────
    # source=google_ads_search OR gclid set OR utm_source=google
    paid_leads = []
    leads_24h_full = []
    c, leads_24h_full = sb_get(
        f'leads?select=id,source,gclid,utm_source,utm_medium,utm_campaign,service_type,created_at'
        f'&is_test=eq.false&created_at=gte.{since_24h}&order=created_at.desc&limit=500'
    )
    if not (c == 200 and isinstance(leads_24h_full, list)):
        leads_24h_full = []
    for l in leads_24h_full:
        if (
            l.get('source') == 'google_ads_search'
            or l.get('gclid')
            or str(l.get('utm_source') or '').lower() == 'google'
        ):
            paid_leads.append(l)
    n_paid_leads_24h = len(paid_leads)

    # WhatsApp-attributed leads 24h (best-effort: source=whatsapp)
    wa_leads_24h = [l for l in leads_24h_full if l.get('source') in ('whatsapp', 'whatsapp_inbound')]
    n_wa_leads_24h = len(wa_leads_24h)

    latest_real_lead_id = leads_24h_full[0].get('id') if leads_24h_full else None

    # Test leads 24h (separate)
    c, test_leads = sb_get(
        f'leads?select=id&is_test=eq.true&created_at=gte.{since_24h}&limit=200'
    )
    n_test_leads_24h = count_list(c, test_leads) or 0

    # ── Funnel-gap warnings ──────────────────────────────────────────────────
    funnel_warnings = []
    if funnel_available:
        if paid_cta_total > 0 and n_paid_leads_24h == 0:
            funnel_warnings.append(
                f'⚠️ {paid_cta_total} paid CTA clicks but 0 paid leads captured'
            )
        if cta_wa > 0 and n_wa_leads_24h == 0:
            funnel_warnings.append(
                f'⚠️ {cta_wa} WhatsApp clicks but 0 WA-attributed leads'
            )
        if any(l.get('gclid') for l in leads_24h_full):
            funnel_warnings.append('✅ Form gclid attribution working')

    # ── Build Telegram message ───────────────────────────────────────────────
    date_str = now.strftime('%Y-%m-%d')
    lines = [f'📊 <b>Daily Lead Pulse — {date_str}</b>', '']

    # Real leads section
    if n_real_leads_24h > 0:
        lines.append(f'✅ <b>Real leads 24h:</b> {n_real_leads_24h}  |  7d: {n_real_leads_7d}')
    else:
        lines.append(f'⚠️ <b>Real leads 24h:</b> 0  (7d: {n_real_leads_7d}) — check ads/traffic')

    # Pre-leads section
    if n_preleads > 0:
        lines.append(f'👁 <b>FB pre-leads (no phone):</b> {n_preleads} — check Messenger inbox')
    else:
        real_sess = n_fb_sessions_7d if n_fb_sessions_7d is not None else '?'
        lines.append(f'💬 FB Messenger: {real_sess} real sessions (7d) → {n_preleads} pre-leads captured (0 organic)')

    # ── CTA activity (funnel_events) ──
    lines.append('')
    if not funnel_available:
        lines.append('<b>── CTA Activity (last 24h) ──</b>')
        lines.append('  n/a (funnel_events unavailable)')
    else:
        lines.append('<b>── CTA Activity (last 24h) ──</b>')
        lines.append(
            f'  Total: {cta_total}  |  Phone: {cta_phone}  |  WA: {cta_wa}  |  Estimate: {cta_estimate}'
        )
        if cta_email or cta_messenger:
            lines.append(f'  Email: {cta_email}  |  Messenger: {cta_messenger}')
        lines.append(f'  Test CTAs: {cta_test_total}')

        # Paid CTA
        lines.append('')
        lines.append('<b>── Paid CTA (Google Ads) ──</b>')
        lines.append(
            f'  Total: {paid_cta_total}  |  Phone: {paid_cta_phone}  |  WA: {paid_cta_wa}  |  Estimate: {paid_cta_estimate}'
        )
        lines.append(f'  Paid form leads (24h): {n_paid_leads_24h}')

        # By service
        if cta_by_service:
            lines.append('')
            lines.append('<b>── CTA by Service ──</b>')
            ranked = sorted(
                cta_by_service.items(),
                key=lambda kv: kv[1]['phone'] + kv[1]['wa'] + kv[1]['estimate'],
                reverse=True,
            )[:6]
            for slug, b in ranked:
                lines.append(
                    f'  {slug}: phone {b["phone"]} / WA {b["wa"]} / est {b["estimate"]}'
                )

        # Funnel warnings
        if funnel_warnings:
            lines.append('')
            lines.append('<b>── Funnel Warnings ──</b>')
            for w in funnel_warnings:
                lines.append(f'  {w}')

        # Evidence
        lines.append('')
        lines.append('<b>── Evidence ──</b>')
        lines.append(f'  Latest gclid: {latest_paid_gclid or "none"}')
        lines.append(f'  Latest CTA id: {latest_cta_id or "none"}')
        lines.append(f'  Latest real lead id: {latest_real_lead_id or "none"}')
        lines.append(f'  Test leads 24h: {n_test_leads_24h}')

    # Social signals
    lines.append('')
    lines.append('<b>📡 Social signals:</b>')
    if n_hot_today > 0:
        platform_detail = ', '.join(f'{p}={cnt}' for p, cnt in sorted(hot_by_platform.items()))
        lines.append(f'  🔥 HOT/WARM today: {n_hot_today}  ({platform_detail})')
    else:
        lines.append(f'  HOT/WARM today: 0')
    if n_stuck > 0:
        lines.append(f'  ⚠️ Stuck backlog (>24h): {n_stuck} — review Telegram history')
        lc = sl_lifecycle
        lines.append(f'  📋 Lifecycle: new={lc["new"]} reviewed={lc["reviewed"]} contacted={lc["contacted"]} converted={lc["converted"]}')
    else:
        lines.append(f'  Stuck HOT/WARM backlog: 0 ✓')

    # Scanner staleness
    def _fmt_age(h, label, threshold_h):
        if h is None:
            return f'  ⚠️ {label}: NO ROWS EVER — scanner not collecting'
        if label == 'Nextdoor' and h > threshold_h:
            return f'  ⚠️ {label}: last HOT/WARM {round(h/24,1)}d ago — hunter reads manual JSON feeds (all 3 empty, no live scraping)'
        if h > threshold_h:
            return f'  ⚠️ {label}: last post {round(h,1)}h ago — stale'
        return f'  ✓ {label}: last post {round(h,1)}h ago'

    lines.append('')
    lines.append('<b>🔍 Scanner activity:</b>')
    lines.append(_fmt_age(scanner_status.get('craigslist'), 'CL', 48))
    lines.append(_fmt_age(scanner_status.get('facebook'), 'FB Groups', 48))
    lines.append(_fmt_age(scanner_status.get('nextdoor'), 'Nextdoor', 168))
    if scanner_active and not scanner_proof_exists:
        lines.append('  ⚠️ Scanner proof gap: HOT alerts fire but write NO telegram_sends rows (Dell sync needed)')

    # Dark channels
    lines.append('')
    lines.append('<b>🌑 Dark channels (manual required):</b>')
    lines.append('  • Nextdoor inbox — check nextdoor.com/page/handy-friend/ messages')
    lines.append('  • Craigslist — scanner only (no relay email exists)')
    lines.append('  • Meta Page inbox — check facebook.com inbox for unread messages')

    # System health
    lines.append('')
    lines.append('<b>⚙️ System:</b>')
    tg_status = f'{n_tg_fails_24h} fails (24h)' if isinstance(n_tg_fails_24h, int) and n_tg_fails_24h > 0 else '✓'
    lines.append(f'  Telegram sends: {tg_status}')
    if n_outbox_pending > 5:
        lines.append(f'  ⚠️ Outbox backlog: {n_outbox_pending} pending jobs')
    if n_outbox_failed > 0:
        lines.append(f'  ⚠️ Outbox failed (critical): {n_outbox_failed} jobs')
    if n_outbox_failed_ga4 > 0:
        lines.append(f'  ℹ️ GA4 analytics events failed: {n_outbox_failed_ga4} (non-critical)')
    if errors:
        lines.append(f'  ❌ Query errors: {"; ".join(errors)}')

    # Action items
    actions = []
    if n_real_leads_24h == 0 and n_hot_today == 0 and n_preleads == 0:
        actions.append('🚨 Zero signals across all channels — check ad spend, scanner, FB page')
    if n_stuck > 10:
        actions.append(f'⚡ {n_stuck} HOT signals need follow-up — open social_leads in Supabase')
    if n_preleads > 0:
        actions.append(f'📲 {n_preleads} FB conversations need phone capture — reply in Messenger')
    if isinstance(n_tg_fails_24h, int) and n_tg_fails_24h > 3:
        actions.append(f'⚠️ {n_tg_fails_24h} Telegram failures — check bot token')
    if scanner_active and not scanner_proof_exists:
        actions.append('🔧 Dell sync needed: scanner runs but writes no proof rows — SSH dell + git pull')

    if actions:
        lines.append('')
        lines.append('<b>🎯 Action today:</b>')
        lines.extend(f'  {a}' for a in actions)

    msg = '\n'.join(lines)

    # Persist snapshot
    snap = {
        'generated_at': now.isoformat(),
        'real_leads_24h': n_real_leads_24h,
        'real_leads_7d': n_real_leads_7d,
        'fb_preleads': n_preleads,
        'fb_real_sessions_7d': n_fb_sessions_7d,
        'hot_signals_today': n_hot_today,
        'hot_by_platform': hot_by_platform,
        'stuck_hot_warm_backlog': n_stuck,
        'social_leads_lifecycle': sl_lifecycle,
        'scanner_status_age_h': scanner_status,
        'scanner_proof_gap': scanner_active and not scanner_proof_exists,
        'tg_fails_24h': n_tg_fails_24h,
        'outbox_pending': n_outbox_pending,
        'outbox_failed': n_outbox_failed,
        'outbox_failed_ga4': n_outbox_failed_ga4,
        'funnel_events': {
            'available': funnel_available,
            'cta_total': cta_total,
            'cta_phone': cta_phone,
            'cta_whatsapp': cta_wa,
            'cta_email': cta_email,
            'cta_messenger': cta_messenger,
            'cta_estimate': cta_estimate,
            'cta_test_total': cta_test_total,
            'cta_by_service': cta_by_service,
            'paid_cta_total': paid_cta_total,
            'paid_cta_phone': paid_cta_phone,
            'paid_cta_whatsapp': paid_cta_wa,
            'paid_cta_estimate': paid_cta_estimate,
            'paid_leads_24h': n_paid_leads_24h,
            'wa_leads_24h': n_wa_leads_24h,
            'test_leads_24h': n_test_leads_24h,
            'warnings': funnel_warnings,
            'latest_cta_id': latest_cta_id,
            'latest_paid_gclid': latest_paid_gclid,
            'latest_real_lead_id': latest_real_lead_id,
        },
        'actions': actions,
        'errors': errors,
    }
    out_dir = ROOT / 'ops' / 'reports' / 'sales-pulse'
    out_dir.mkdir(parents=True, exist_ok=True)
    snap_file = out_dir / f'{now.strftime("%Y%m%d_%H%M")}.json'
    snap_file.write_text(json.dumps(snap, indent=2, default=str))

    print(msg.replace('<b>', '').replace('</b>', '').replace('<i>', '').replace('</i>', ''))

    # Send only when actionable content or errors exist
    has_signal = (
        n_real_leads_24h > 0
        or n_preleads > 0
        or n_hot_today > 0
        or n_stuck > 5
        or bool(errors)
        or (isinstance(n_tg_fails_24h, int) and n_tg_fails_24h > 3)
        or n_outbox_failed > 0
        or cta_total > 0
        or paid_cta_total > 0
        or bool(funnel_warnings)
    )

    args = set(sys.argv[1:])
    dry_run = '--dry-run' in args
    test_send = '--test-send' in args

    if dry_run:
        print('telegram_delivery=skipped (--dry-run)')
        return 0

    if test_send:
        # Force-send a clearly labeled test message
        test_msg = '[DRY RUN TEST]\n' + msg
        sent = send_telegram(test_msg)
        print(f'telegram_delivery=test_send sent={sent}')
        return 0

    if has_signal:
        sent = send_telegram(msg)
        if not sent:
            print('telegram_delivery=skipped (SALES_PULSE_TELEGRAM_ENABLED not set or send failed)')
    else:
        print('telegram_delivery=skipped (no actionable signals — zero-report suppressed)')

    return 0


if __name__ == '__main__':
    sys.exit(main())
