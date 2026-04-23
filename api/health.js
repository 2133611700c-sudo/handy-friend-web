/**
 * Unified health endpoint (replaces factory-health + funnel-health).
 *   GET /api/health              -> basic runtime diagnostics
 *   GET /api/health?type=funnel  -> funnel analytics
 *   GET /api/health?type=fb      -> Facebook diagnostic
 *   GET /api/health?type=stats&key=SECRET&days=30       -> dashboard stats (JSON)
 *   GET /api/health?type=stats&key=SECRET&view=funnel   -> specific analytics view
 *
 * Stats views: funnel, conversion, channels, services, geo, daily, weekly,
 *              response_time, chat, losses, reviews, capacity, pnl, repeat
 */

const { getConfig } = require('./_lib/supabase-admin.js');
const { getClientIp, checkRateLimit } = require('./_lib/rate-limit.js');
const { getCanonicalPriceMatrix, getMessengerPostbackTexts, getPricingSourceVersion } = require('../lib/price-registry.js');
const { checkMigration007 } = require('../lib/lead-pipeline.js');
const { analyzeMessengerPricingPolicy } = require('../lib/pricing-policy.js');
const { normalizeAttribution } = require('../lib/attribution.js');
const { sendTelegramMessage } = require('../lib/telegram/send.js');
const { buildOwnerProofCounts } = require('../lib/telegram-proof.js');
const { createHash } = require('crypto');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'HEAD') {
    const healthy = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    return res.status(healthy ? 200 : 503).end();
  }
  const type = String(req.query?.type || 'basic').toLowerCase();
  if (req.method === 'POST' && type === 'cta_event') return ctaEventIngest(req, res);
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  if (type === 'funnel') return funnelHealth(req, res);
  if (type === 'fb') return fbHealth(req, res);
  if (type === 'pricing') return pricingHealth(req, res);
  if (type === 'attribution') return attributionHealth(req, res);
  if (type === 'lead_integrity') return leadIntegrityHealth(req, res);
  if (type === 'policy') return policyHealth(req, res);
  if (type === 'stats') return statsReport(req, res);
  if (type === 'data_quality') return dataQualityHealth(req, res);
  if (type === 'outbox') return outboxHealth(req, res);
  if (type === 'telegram') return telegramHealth(req, res);
  if (type === 'whatsapp') return whatsappHealth(req, res);
  if (type === 'telegram_watchdog') return telegramWatchdog(req, res);
  return basicHealth(req, res);
}

async function ctaEventIngest(req, res) {
  const config = getConfig();
  if (!config) return res.status(500).json({ ok: false, error: 'supabase_not_configured' });

  const ip = getClientIp(req);
  const rate = checkRateLimit({ key: `cta_event:${ip}`, limit: 90, windowMs: 60 * 1000 });
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec || 30));
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  const origin = String(req.headers.origin || '').trim();
  const referer = String(req.headers.referer || '').trim();
  if (origin && !isTrustedHealthOrigin(origin, referer)) {
    return res.status(403).json({ ok: false, error: 'forbidden_origin' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const eventName = String(body.event_name || '').trim().toLowerCase();
  const allowed = new Set([
    'widget_seen', 'widget_open', 'chat_first_message', 'phone_click',
    'whatsapp_click', 'email_click', 'messenger_click', 'phone_captured',
    'quote_shown', 'handoff_to_owner', 'abandon'
  ]);
  if (!allowed.has(eventName)) {
    return res.status(400).json({ ok: false, error: 'invalid_event_name' });
  }

  const sessionId = String(body.session_id || '').trim().slice(0, 128);
  if (!sessionId) {
    return res.status(400).json({ ok: false, error: 'session_id_required' });
  }

  const pagePath = String(body.page_path || '/').trim().slice(0, 260);
  const channelSource = String(body.channel_source || 'real_website_chat').trim().slice(0, 80);
  const isTest = Boolean(body.is_test);
  const metadata = sanitizeMeta(body.metadata);

  const payload = {
    session_id: sessionId,
    event_name: eventName,
    page_path: pagePath,
    metadata,
    is_test: isTest,
    channel_source: channelSource
  };

  const insertResp = await fetch(`${config.projectUrl}/rest/v1/funnel_events`, {
    method: 'POST',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  if (!insertResp.ok) {
    const text = await insertResp.text().catch(() => '');
    if (insertResp.status === 404 || text.includes('relation "public.funnel_events" does not exist')) {
      return res.status(202).json({ ok: true, stored: false, reason: 'funnel_events_missing' });
    }
    return res.status(502).json({ ok: false, stored: false, error: `postgrest_${insertResp.status}`, details: text.slice(0, 220) });
  }

  const rows = await insertResp.json().catch(() => []);
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  return res.status(200).json({ ok: true, stored: true, id: row?.id || null });
}

function sanitizeMeta(value) {
  if (!value || typeof value !== 'object') return {};
  const copy = JSON.parse(JSON.stringify(value));
  const blocked = new Set(['phone', 'email', 'full_name', 'name', 'contact']);
  Object.keys(copy).forEach((k) => {
    if (blocked.has(k.toLowerCase())) delete copy[k];
    const v = copy[k];
    if (typeof v === 'string' && (/@/.test(v) || /\d{3}[\s().-]?\d{3}[\s.-]?\d{4}/.test(v))) {
      copy[k] = '[redacted]';
    }
  });
  return copy;
}

function isTrustedHealthOrigin(origin, referer) {
  const trusted = ['https://handyandfriend.com', 'https://www.handyandfriend.com'];
  if (trusted.includes(origin)) return true;
  return trusted.some((h) => referer.startsWith(h + '/')) || trusted.includes(referer);
}

/* ── Telegram watchdog (cron) ──
 * GET /api/health?type=telegram_watchdog
 * Auth: Vercel cron jobs send Authorization: Bearer <CRON_SECRET> when
 * CRON_SECRET is configured. External/manual callers may use the same
 * Bearer secret (or the legacy alias VERCEL_CRON_SECRET). Do not trust
 * x-vercel-cron from external requests.
 * Runs daily via vercel.json crons. Queries v_leads_without_telegram
 * and fires ONE aggregated Telegram alert if any real lead in the last
 * 7 days has zero telegram_proofs. Uses unified sender.
 *
 * Exists inside /api/health to stay under Hobby plan's 12-function cap.
 */
async function telegramWatchdog(req, res) {
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || '';
  const authHeader = String(req.headers.authorization || '');
  const secretMatches = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const authorized = Boolean(cronSecret) && secretMatches;
  if (!cronSecret) {
    return res.status(503).json({ ok: false, error: 'cron_secret_missing' });
  }
  if (!authorized) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  const config = getConfig();
  if (!config) return res.status(500).json({ ok: false, error: 'supabase_env_missing' });

  let rows;
  try {
    rows = await fetchLeadsWithoutOwnerProof(config);
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'supabase_fetch_failed', details: String(err?.message || err).slice(0, 300) });
  }

  const missing = Array.isArray(rows) ? rows : [];
  const digestIds = missing
    .map(r => String(r.id || '').trim())
    .filter(Boolean)
    .sort();
  const digestHash = createHash('sha256').update(JSON.stringify(digestIds)).digest('hex').slice(0, 24);

  const summary = {
    ok: true,
    checked_at: new Date().toISOString(),
    total_real_leads_7d: Array.isArray(rows) ? rows.length : 0,
    missing_telegram_proof: missing.length,
    digest_hash: digestHash
  };

  if (missing.length === 0) {
    return res.status(200).json({ ...summary, alert_sent: false });
  }

  // Dedup: same unresolved lead-set hash at most once per 24h.
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  let recentWatchdogEvents = [];
  try {
    const r = await fetch(
      `${config.projectUrl}/rest/v1/lead_events?select=id,created_at,event_data&event_type=eq.watchdog_telegram_sent&lead_id=eq.watchdog_system&created_at=gte.${encodeURIComponent(since24h)}&order=created_at.desc&limit=50`,
      { headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` } }
    );
    if (r.ok) recentWatchdogEvents = await r.json().catch(() => []);
  } catch (_) {}

  const duplicateSeen = Array.isArray(recentWatchdogEvents) && recentWatchdogEvents.some((e) => {
    const d = e?.event_data || {};
    return String(d?.digest_hash || '') === digestHash;
  });
  if (duplicateSeen) {
    return res.status(200).json({
      ...summary,
      alert_sent: false,
      dedup_skipped: true,
      dedup_window_hours: 24
    });
  }

  const lines = missing.slice(0, 10).map(r => {
    const mins = Math.round(Number(r.minutes_since_created || 0));
    return ` • <code>${escapeHtmlBasic(String(r.id).slice(0, 40))}</code> | ${escapeHtmlBasic(r.source || '?')} | ${escapeHtmlBasic(r.service_type || '?')} | ${mins} min ago`;
  });
  const overflow = missing.length > 10 ? `\n(+ ${missing.length - 10} more)` : '';

  const text = `⚠️ <b>[P2 ACTION REQUIRED] Watchdog: leads without Telegram proof</b>\n` +
    `Missing: <b>${missing.length}</b> of ${summary.total_real_leads_7d} real leads in last 7 days\n\n` +
    lines.join('\n') + overflow +
    `\n\nView: <code>v_leads_without_telegram</code> (Supabase)`;

  const send = await sendTelegramMessage({
    source: 'watchdog',
    text,
    timeoutMs: 4000,
    extra: {
      severity: 'P2',
      actionable: true,
      category: 'lead_delivery_proof_gap',
      digest_hash: digestHash,
      lead_ids_sample: missing.slice(0, 10).map(r => r.id)
    }
  });

  // Audit trail for dedup logic.
  try {
    const eventType = send.ok ? 'watchdog_telegram_sent' : 'watchdog_telegram_failed';
    const payload = {
      lead_id: 'watchdog_system',
      event_type: eventType,
      event_data: {
        digest_hash: digestHash,
        missing_count: missing.length,
        message_id: send.messageId || null,
        telegram_send_id: send.telegramSendId || null,
        error_code: send.errorCode || null
      },
      created_by: 'telegram_watchdog'
    };
    await fetch(`${config.projectUrl}/rest/v1/lead_events`, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
  } catch (_) {}

  return res.status(200).json({
    ...summary,
    alert_sent: send.ok,
    alert_message_id: send.messageId,
    alert_telegram_send_id: send.telegramSendId,
    dedup_skipped: false,
    alert_error: send.ok ? null : { code: send.errorCode, description: send.errorDescription }
  });
}

function escapeHtmlBasic(text) {
  return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ── Telegram delivery dashboard ──
 * GET /api/health?type=telegram
 * Returns:
 *   - last 10 sends
 *   - failure counts (24h + 7d)
 *   - count of leads without telegram proof (telegram_sends OR lead_events.telegram_sent)
 *   - bot webhook info (live Telegram API, non-cached)
 * Does not require auth — diagnostic, no sensitive payload.
 */
async function telegramHealth(req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const since7d = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();

  async function sb(path) {
    const r = await fetch(`${config.projectUrl}/rest/v1/${path}`, {
      headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` }
    });
    if (!r.ok) return { _error: `supabase_${r.status}`, _body: (await r.text().catch(() => '')).slice(0, 300) };
    return r.json();
  }

  const [last10, fails24h, fails7d, missingProof, botInfo] = await Promise.all([
    sb('telegram_sends?select=id,created_at,source,ok,telegram_message_id,error_code,error_description,lead_id&order=created_at.desc&limit=10'),
    sb(`telegram_sends?select=id&ok=eq.false&created_at=gte.${encodeURIComponent(since24h)}`),
    sb(`telegram_sends?select=id&ok=eq.false&created_at=gte.${encodeURIComponent(since7d)}`),
    fetchLeadsWithoutOwnerProof(config, 20),
    (async () => {
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return { _error: 'token_missing' };
      try {
        const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
        const j = await r.json().catch(() => null);
        if (!j || !j.ok) return { _error: 'bot_api_failed' };
        const { url, pending_update_count, last_error_date, last_error_message, allowed_updates } = j.result || {};
        return { url, pending_update_count, last_error_date, last_error_message, allowed_updates };
      } catch (e) {
        return { _error: String(e?.message || 'bot_api_exception').slice(0, 200) };
      }
    })()
  ]);

  const leadsWithoutProof = Array.isArray(missingProof) ? missingProof : [];

  return res.status(200).json({
    ok: true,
    generated_at: now.toISOString(),
    bot_webhook: botInfo,
    sends_last_10: Array.isArray(last10) ? last10 : [],
    failures_24h: Array.isArray(fails24h) ? fails24h.length : null,
    failures_7d: Array.isArray(fails7d) ? fails7d.length : null,
    leads_without_telegram_proof_7d: leadsWithoutProof.length,
    leads_without_telegram_sample: leadsWithoutProof.slice(0, 5)
  });
}

/* ── WhatsApp reliability snapshot ──
 * GET /api/health?type=whatsapp
 * Operational view for WhatsApp path only.
 */
async function whatsappHealth(_req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const now = Date.now();
  const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
  const headers = { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` };

  async function sb(path) {
    const r = await fetch(`${config.projectUrl}/rest/v1/${path}`, { headers });
    if (!r.ok) return { _error: `supabase_${r.status}`, _body: (await r.text().catch(() => '')).slice(0, 300) };
    return r.json();
  }

  const [leadsRows, eventsRows, sendsRows] = await Promise.all([
    sb(`leads?select=id,status,is_test,source,created_at&source=eq.whatsapp&created_at=gte.${encodeURIComponent(since24h)}&order=created_at.desc&limit=2000`),
    sb(`lead_events?select=id,lead_id,event_type,event_data,created_at&event_type=ilike.whatsapp%25&created_at=gte.${encodeURIComponent(since24h)}&order=created_at.desc&limit=5000`),
    sb(`telegram_sends?select=id,lead_id,source,ok,created_at&created_at=gte.${encodeURIComponent(since24h)}&order=created_at.desc&limit=5000`)
  ]);

  if (!Array.isArray(leadsRows) || !Array.isArray(eventsRows) || !Array.isArray(sendsRows)) {
    return res.status(502).json({
      ok: false,
      error: 'whatsapp_snapshot_fetch_failed',
      details: {
        leads: leadsRows?._error || null,
        events: eventsRows?._error || null,
        sends: sendsRows?._error || null
      }
    });
  }

  const leads24h = leadsRows.filter((r) => !r.is_test);
  const preLeads24h = leads24h.filter((r) => String(r.status || '').toLowerCase() === 'partial');
  const realLeads24h = Math.max(0, leads24h.length - preLeads24h.length);

  const inboundEvents = eventsRows.filter((e) => e.event_type === 'whatsapp_inbound_received');
  const replySentEvents = eventsRows.filter((e) => e.event_type === 'whatsapp_ai_reply_sent');
  const replyFailedEvents = eventsRows.filter((e) => e.event_type === 'whatsapp_ai_reply_failed');
  const statusEvents = eventsRows.filter((e) => e.event_type === 'whatsapp_status');
  const duplicateSuppressed = eventsRows.filter((e) =>
    e.event_type === 'whatsapp_duplicate_inbound_suppressed' ||
    e.event_type === 'whatsapp_duplicate_status_suppressed'
  );

  const outboundIds = new Set(
    replySentEvents
      .map((e) => String(e?.event_data?.wa_outbound_message_id || '').trim())
      .filter(Boolean)
  );
  const matchedStatusCount = statusEvents.filter((e) => {
    const id = String(e?.event_data?.wa_outbound_message_id || '').trim();
    return id && outboundIds.has(id);
  }).length;
  const unmatchedCallbacks = Math.max(0, statusEvents.length - matchedStatusCount);

  const whatsappTelegramProofs = sendsRows.filter((s) => String(s.source || '').includes('whatsapp'));
  const lastProofTs = statusEvents[0]?.created_at || replySentEvents[0]?.created_at || inboundEvents[0]?.created_at || null;

  return res.status(200).json({
    ok: true,
    generated_at: new Date().toISOString(),
    window_hours: 24,
    inbound_count_24h: inboundEvents.length,
    real_leads_24h: realLeads24h,
    pre_leads_24h: preLeads24h.length,
    outbound_reply_success_24h: replySentEvents.length,
    outbound_reply_failed_24h: replyFailedEvents.length,
    status_callbacks_24h: statusEvents.length,
    unmatched_callbacks_24h: unmatchedCallbacks,
    duplicate_suppression_24h: duplicateSuppressed.length,
    owner_alert_rows_24h: whatsappTelegramProofs.length,
    last_real_whatsapp_proof_ts: lastProofTs
  });
}

async function fetchLeadsWithoutOwnerProof(config, limit = 50) {
  const now = Date.now();
  const since7d = new Date(now - 7 * 86400 * 1000).toISOString();
  const [leadsResp, sendsResp, eventsResp] = await Promise.all([
    fetch(
      `${config.projectUrl}/rest/v1/leads?select=id,full_name,phone,source,service_type,is_test,created_at&is_test=eq.false&created_at=gte.${encodeURIComponent(since7d)}&order=created_at.desc&limit=${encodeURIComponent(String(limit))}`,
      { headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` } }
    ),
    fetch(
      `${config.projectUrl}/rest/v1/telegram_sends?select=lead_id,source,ok,telegram_message_id,extra,created_at&ok=eq.true&telegram_message_id=not.is.null&created_at=gte.${encodeURIComponent(since7d)}&order=created_at.desc&limit=2000`,
      { headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` } }
    ),
    fetch(
      `${config.projectUrl}/rest/v1/lead_events?select=lead_id,event_type,event_data,created_at&event_type=in.(telegram_sent,sla_escalation_5,sla_escalation_15,sla_escalation_30)&created_at=gte.${encodeURIComponent(since7d)}&order=created_at.desc&limit=2000`,
      { headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` } }
    )
  ]);

  if (!leadsResp.ok) {
    const t = await leadsResp.text().catch(() => '');
    throw new Error(`supabase_leads_${leadsResp.status}:${t.slice(0, 160)}`);
  }
  if (!sendsResp.ok) {
    const t = await sendsResp.text().catch(() => '');
    throw new Error(`supabase_sends_${sendsResp.status}:${t.slice(0, 160)}`);
  }
  if (!eventsResp.ok) {
    const t = await eventsResp.text().catch(() => '');
    throw new Error(`supabase_events_${eventsResp.status}:${t.slice(0, 160)}`);
  }

  const leads = await leadsResp.json().catch(() => []);
  const sends = await sendsResp.json().catch(() => []);
  const events = await eventsResp.json().catch(() => []);
  const proofCounts = buildOwnerProofCounts(sends, events);

  return (Array.isArray(leads) ? leads : [])
    .map((lead) => {
      const createdAt = Date.parse(String(lead.created_at || ''));
      const minutes = Number.isFinite(createdAt) ? (now - createdAt) / 60000 : null;
      const proofs = proofCounts.get(String(lead.id || '')) || 0;
      return {
        id: lead.id,
        full_name: lead.full_name || null,
        phone: lead.phone || null,
        source: lead.source || null,
        service_type: lead.service_type || null,
        telegram_proofs: proofs,
        minutes_since_created: minutes
      };
    })
    .filter((lead) => Number(lead.telegram_proofs) === 0);
}

/* ── attribution integrity diagnostic ── */
async function attributionHealth(req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const windowHours = clampHours(req.query?.hours || 168);
  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const rows = await fetchSupabase(
      config,
      `leads?select=id,created_at,source,source_details&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=2000`
    );

    if (!rows.ok) {
      return res.status(502).json({ ok: false, error: rows.error || 'attribution_fetch_failed' });
    }

    const channelSplit = {};
    const invalidSplit = {};
    const allowedChannels = new Set([
      'website_chat', 'website_form', 'exit_intent', 'calculator',
      'facebook', 'instagram', 'whatsapp', 'phone', 'referral',
      'nextdoor', 'craigslist', 'thumbtack', 'google_business', 'google_organic',
      'google_lsa', 'google_ads_search', 'google_ads_display', 'google_ads_pmax',
      'facebook_ads', 'facebook_organic', 'instagram_ads', 'instagram_organic',
      'yelp', 'other'
    ]);
    let otherCount = 0;
    let googleCount = 0;
    let missingSourceCount = 0;
    let invalidChannelCount = 0;

    for (const row of rows.data || []) {
      const source = String(row?.source || '').trim() || 'other';
      channelSplit[source] = (channelSplit[source] || 0) + 1;
      if (source === 'other') otherCount += 1;
      if (source.startsWith('google_')) googleCount += 1;
      if (!row?.source) missingSourceCount += 1;
      if (!allowedChannels.has(source)) {
        invalidChannelCount += 1;
        invalidSplit[source] = (invalidSplit[source] || 0) + 1;
      }
    }

    const total = (rows.data || []).length;
    const otherRate = total ? Number((otherCount / total).toFixed(4)) : 0;
    const attributionIntegrity = total === 0 || (otherRate <= 0.3 && invalidChannelCount === 0) ? 'PASS' : 'WARN';

    const synthetic = [
      { name: 'gclid_only', input: { clickId: { gclid: 'x' } }, expected: 'google_ads_search' },
      { name: 'utm_google_cpc', input: { utmSource: 'google', utmMedium: 'cpc' }, expected: 'google_ads_search' },
      { name: 'utm_google_lsa', input: { utmSource: 'google', utmCampaign: 'local services ads' }, expected: 'google_lsa' },
      { name: 'utm_google_gbp', input: { utmSource: 'google', utmMedium: 'business_profile' }, expected: 'google_business' }
    ].map((test) => {
      const normalized = normalizeAttribution(test.input);
      return {
        name: test.name,
        expected: test.expected,
        actual: normalized.channel,
        status: normalized.channel === test.expected ? 'PASS' : 'FAIL'
      };
    });

    return res.status(200).json({
      ok: true,
      window_hours: windowHours,
      attribution_integrity: attributionIntegrity,
      totals: {
        leads: total,
        other: otherCount,
        other_rate: otherRate,
        google_channels: googleCount,
        missing_source: missingSourceCount,
        invalid_channel_keys: invalidChannelCount
      },
      channel_split: channelSplit,
      invalid_channel_split: invalidSplit,
      synthetic_checks: synthetic
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'attribution_health_failed') });
  }
}

/* ── basic (ex factory-health) ── */
function basicHealth(_req, res) {
  const checks = {
    supabase_url: Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_service_role_key: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    telegram_bot_token: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    telegram_chat_id: Boolean(process.env.TELEGRAM_CHAT_ID),
    resend_api_key: Boolean(process.env.RESEND_API_KEY),
    sendgrid_api_key: Boolean(process.env.SENDGRID_API_KEY),
    fb_page_access_token: Boolean(process.env.FB_PAGE_ACCESS_TOKEN),
    fb_verify_token: Boolean(process.env.FB_VERIFY_TOKEN),
    deepseek_api_key: Boolean(process.env.DEEPSEEK_API_KEY)
  };

  const healthy = checks.supabase_url;
  return res.status(healthy ? 200 : 503).json({
    ok: healthy,
    status: healthy ? 'healthy' : 'degraded',
    service: 'handy-friend-api',
    timestamp: new Date().toISOString(),
    runtime: {
      region: process.env.VERCEL_REGION || 'unknown',
      env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown'
    },
    checks
  });
}

/* ── FB diagnostic ── */
async function fbHealth(_req, res) {
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN || '';
  const pageId = '1039840475873352';
  const appId = '26599892572930046';
  const v = 'v19.0';

  if (!pageToken) return res.status(200).json({ ok: false, error: 'no_page_token' });

  const out = { pageId, appId };

  try {
    const r = await fetch(`https://graph.facebook.com/${v}/me?fields=id,name&access_token=${pageToken}`);
    out.page_me = await r.json();
    // token_valid: false only if truly expired (code 190 / subcode 463)
    // Permission errors (100, 200) mean token is valid but lacks that specific scope
    const err = out.page_me?.error;
    const isExpired = err?.code === 190 && err?.error_subcode === 463;
    out.token_valid = !isExpired;
    out.token_note = err ? (isExpired ? 'expired' : 'valid_limited_scope') : 'ok';
  } catch (e) { out.page_me_error = e.message; out.token_valid = false; }

  try {
    const r = await fetch(`https://graph.facebook.com/${v}/${pageId}/subscribed_apps?access_token=${pageToken}`);
    out.subscribed_apps = await r.json();
  } catch (e) { out.subscribed_apps_error = e.message; }

  // Check recent FB sessions in Supabase
  try {
    const config = getConfig();
    if (config) {
      const q = new URLSearchParams({ select: 'session_id,created_at', 'session_id': 'like.fb_%', order: 'created_at.desc', limit: '5' }).toString();
      const r = await fetch(`${config.projectUrl}/rest/v1/ai_conversations?${q}`, {
        headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: 'application/json' }
      });
      out.recent_fb_sessions = r.ok ? await r.json() : { error: r.status };
    }
  } catch (e) { out.recent_fb_sessions_error = e.message; }

  return res.status(200).json(out);
}

/* ── pricing consistency diagnostic ── */
async function pricingHealth(_req, res) {
  const matrix = getCanonicalPriceMatrix();
  const postbacks = getMessengerPostbackTexts();
  const pricingVersion = getPricingSourceVersion();
  const services = [
    { id: 'tv_mounting', label: 'TV Mounting', expected: '$105' },
    { id: 'furniture_assembly', label: 'Furniture Assembly', expected: '$75' },
    { id: 'art_mirrors', label: 'Art & Mirrors', expected: '$95' },
    { id: 'interior_painting', label: 'Painting', expected: '$3.00' },
    { id: 'flooring', label: 'Flooring', expected: '$3.00' },
    { id: 'kitchen_cabinet_painting', label: 'Kitchen Cabinet Painting', expected: '$75' },
    { id: 'furniture_painting', label: 'Furniture Painting', expected: '$40' },
    { id: 'plumbing', label: 'Plumbing', expected: '$115' },
    { id: 'electrical', label: 'Electrical', expected: '$95' }
  ];

  let pricingHtml = '';
  let indexHtml = '';
  try {
    const [pricingResp, indexResp] = await Promise.all([
      fetch('https://handyandfriend.com/pricing?lang=en'),
      fetch('https://handyandfriend.com/')
    ]);
    pricingHtml = pricingResp.ok ? await pricingResp.text() : '';
    indexHtml = indexResp.ok ? await indexResp.text() : '';
  } catch (_) {}

  const messengerPolicy = analyzeMessengerPricingPolicy(postbacks, matrix);
  const mismatches = [];
  const checks = [];

  for (const s of services) {
    const siteOk = containsAll(pricingHtml, [s.label, s.expected]);
    const chatExpected = matrix[s.id];
    const chatOk = Number.isFinite(chatExpected);
    const messengerOk = messengerPolicy.ok;
    const jsonldOk = jsonLdHasExpected(indexHtml, s.id, chatExpected);

    checks.push({
      service_id: s.id,
      service: s.label,
      expected_display: s.expected,
      channels: {
        site: siteOk ? 'PASS' : 'FAIL',
        ai_chat: chatOk ? 'PASS' : 'FAIL',
        messenger: messengerOk ? 'PASS_GATED' : 'FAIL',
        messenger_reason: messengerOk ? 'gated_no_price_leak' : messengerPolicy.reason,
        jsonld: jsonldOk ? 'PASS' : 'FAIL'
      }
    });

    if (!siteOk || !chatOk || !messengerOk || !jsonldOk) {
      mismatches.push({
        service_id: s.id,
        failed_channels: [
          !siteOk ? 'site' : null,
          !chatOk ? 'ai_chat' : null,
          !messengerOk ? 'messenger' : null,
          !jsonldOk ? 'jsonld' : null
        ].filter(Boolean)
      });
    }
  }

  return res.status(200).json({
    pricing_source_version: pricingVersion,
    messenger_policy: messengerPolicy,
    pricing_consistency_status: mismatches.length ? 'FAIL' : 'PASS',
    mismatch_count: mismatches.length,
    mismatches,
    checks
  });
}

/* ── lead capture integrity diagnostic ── */
async function leadIntegrityHealth(_req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const migration = await checkMigration007();
  if (!migration.hasSessionId) {
    return res.status(200).json({
      ok: true,
      lead_capture_integrity: 'UNKNOWN_COMPACT_MODE',
      note: 'session_id column missing; phone-present loss detection limited until migration 007 is applied'
    });
  }

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const conversations = await fetchSupabase(
      config,
      `ai_conversations?select=session_id,message_role,message_text,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=2000`
    );
    if (!conversations.ok) return res.status(502).json({ ok: false, error: conversations.error });

    const phoneRegex = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
    const sessionsWithPhone = new Set();
    for (const row of conversations.data || []) {
      if (row?.message_role !== 'user') continue;
      if (phoneRegex.test(String(row?.message_text || ''))) {
        sessionsWithPhone.add(String(row.session_id || ''));
      }
    }

    const sessionList = [...sessionsWithPhone].filter(s => s && !s.startsWith('test_'));
    if (!sessionList.length) {
      return res.status(200).json({
        ok: true,
        lead_capture_integrity: 'PASS',
        phone_present_sessions: 0,
        captured_sessions: 0,
        phone_present_lead_not_captured: 0
      });
    }

    const inList = sessionList.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',');
    const leads = await fetchSupabase(
      config,
      `leads?select=id,session_id,created_at&session_id=in.(${encodeURIComponent(inList)})&created_at=gte.${encodeURIComponent(sinceIso)}&limit=2000`
    );
    if (!leads.ok) return res.status(502).json({ ok: false, error: leads.error });

    const capturedSessions = new Set((leads.data || []).map((r) => String(r?.session_id || '')).filter(Boolean));
    const missingSessions = sessionList.filter((sid) => !capturedSessions.has(sid));

    return res.status(200).json({
      ok: true,
      lead_capture_integrity: missingSessions.length ? 'FAIL' : 'PASS',
      phone_present_sessions: sessionList.length,
      captured_sessions: capturedSessions.size,
      phone_present_lead_not_captured: missingSessions.length,
      sample_missing_sessions: missingSessions.slice(0, 20)
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'lead_integrity_failed') });
  }
}

/* ── policy violation diagnostic ── */
async function policyHealth(_req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const sinceIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const [events, conv] = await Promise.all([
      fetchSupabase(
        config,
        `lead_events?select=event_type,event_data,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&event_type=in.(policy_violation,cross_sell_policy_violation)&limit=2000`
      ),
      fetchSupabase(
        config,
        `ai_conversations?select=session_id,message_role,message_text,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&message_role=eq.assistant&limit=2000`
      )
    ]);

    if (!events.ok || !conv.ok) {
      return res.status(502).json({
        ok: false,
        error: 'policy_data_fetch_failed',
        details: { events: events.error || null, conversations: conv.error || null }
      });
    }

    let heuristicCrossSellViolations = 0;
    for (const row of conv.data || []) {
      const text = String(row?.message_text || '').toLowerCase();
      const isPlumbElec = text.includes('plumbing') || text.includes('electrical') || text.includes('сантех') || text.includes('электр');
      const hasCrossSell = text.includes('bundle') || text.includes('same visit') || text.includes('кстати') || text.includes('por cierto');
      if (isPlumbElec && hasCrossSell) heuristicCrossSellViolations += 1;
    }

    const explicitViolations = (events.data || []).length;
    const totalViolations = explicitViolations + heuristicCrossSellViolations;

    return res.status(200).json({
      ok: true,
      policy_violation_count: totalViolations,
      explicit_policy_violations: explicitViolations,
      heuristic_cross_sell_policy_violations: heuristicCrossSellViolations,
      policy_status: totalViolations ? 'FAIL' : 'PASS',
      window_hours: 24
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'policy_health_failed') });
  }
}

/* ── funnel analytics (ex funnel-health) ── */
async function funnelHealth(req, res) {
  const config = getConfig();
  if (!config) {
    return res.status(200).json({ ok: false, status: 'degraded', error: 'supabase_not_configured' });
  }

  const windowHours = clampHours(req.query?.hours);
  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const [eventsRes, leadsRes] = await Promise.all([
      fetchSupabase(config, `lead_events?select=event_type,event_data,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=2000`),
      fetchSupabase(config, `leads?select=id,created_at,status,source&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=2000`)
    ]);

    if (!eventsRes.ok || !leadsRes.ok) {
      return res.status(502).json({
        ok: false, status: 'degraded', error: 'supabase_fetch_failed',
        details: { events: eventsRes.error || null, leads: leadsRes.error || null }
      });
    }

    return res.status(200).json({
      ok: true, status: 'healthy',
      window_hours: windowHours, since: sinceIso,
      generated_at: new Date().toISOString(),
      metrics: buildMetrics(eventsRes.data || [], leadsRes.data || [])
    });
  } catch (err) {
    return res.status(500).json({
      ok: false, status: 'degraded',
      error: String(err?.message || 'funnel_health_failed').slice(0, 240)
    });
  }
}

/* ── data quality diagnostic ── */
async function dataQualityHealth(req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const windowHours = clampHours(req.query?.hours || 168);
  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const rows = await fetchSupabase(
      config,
      `leads?select=id,is_test,channel,service_type,source,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=2000`
    );

    if (!rows.ok) {
      return res.status(502).json({ ok: false, error: rows.error || 'data_quality_fetch_failed' });
    }

    const leads = rows.data || [];
    const total = leads.length;
    const checks = [];
    const failReasons = [];

    // 1. Test contamination rate (on is_test column — requires 013 migration)
    const hasIsTest = total > 0 && leads[0].hasOwnProperty('is_test');
    let testCount = 0;
    let prodCount = 0;
    if (hasIsTest) {
      testCount = leads.filter(l => l.is_test === true).length;
      prodCount = total - testCount;
      const contamRate = total ? Number((testCount / total).toFixed(4)) : 0;
      const pass = contamRate < 0.5; // For overall DB; new leads should be 0%
      checks.push({
        name: 'test_contamination_rate',
        value: contamRate,
        test_count: testCount,
        prod_count: prodCount,
        status: pass ? 'PASS' : 'WARN',
        note: hasIsTest ? null : 'is_test column missing — run 013_test_isolation.sql'
      });
      if (!pass) failReasons.push(`test_contamination=${(contamRate * 100).toFixed(1)}% (${testCount}/${total})`);
    } else {
      checks.push({
        name: 'test_contamination_rate',
        value: null,
        status: 'UNKNOWN',
        note: 'is_test column missing — run 013_test_isolation.sql'
      });
      failReasons.push('is_test column not available');
    }

    // 2. Channel completeness rate
    const withChannel = leads.filter(l => l.channel && l.channel !== 'null').length;
    const channelRate = total ? Number((withChannel / total).toFixed(4)) : 1;
    const channelPass = channelRate >= 0.9;
    checks.push({
      name: 'channel_completeness_rate',
      value: channelRate,
      populated: withChannel,
      missing: total - withChannel,
      status: channelPass ? 'PASS' : 'FAIL'
    });
    if (!channelPass) failReasons.push(`channel_missing=${total - withChannel}/${total}`);

    // 3. Service type quality rate
    const badServicePatterns = ['[object object]', 'unknown', 'not specified', '', 'null', 'test'];
    const badServiceCount = leads.filter(l => {
      const svc = String(l.service_type || '').toLowerCase().trim();
      return badServicePatterns.includes(svc) || !svc;
    }).length;
    const serviceQuality = total ? Number((1 - badServiceCount / total).toFixed(4)) : 1;
    const servicePass = serviceQuality >= 0.90;

    // Count [object Object] specifically
    const objectObjectCount = leads.filter(l =>
      String(l.service_type || '').toLowerCase().includes('[object object]')
    ).length;

    checks.push({
      name: 'service_type_quality_rate',
      value: serviceQuality,
      bad_count: badServiceCount,
      object_object_count: objectObjectCount,
      unknown_count: leads.filter(l => {
        const s = String(l.service_type || '').toLowerCase().trim();
        return s === 'unknown' || s === 'not specified' || !s;
      }).length,
      status: servicePass ? 'PASS' : (objectObjectCount > 0 ? 'FAIL' : 'WARN')
    });
    if (objectObjectCount > 0) failReasons.push(`[object Object] service_type count=${objectObjectCount}`);
    if (!servicePass) failReasons.push(`service_quality=${(serviceQuality * 100).toFixed(1)}%`);

    // Overall status
    const allPass = checks.every(c => c.status === 'PASS');
    const hasFail = checks.some(c => c.status === 'FAIL');

    return res.status(200).json({
      ok: true,
      data_quality_status: hasFail ? 'FAIL' : (allPass ? 'PASS' : 'WARN'),
      window_hours: windowHours,
      total_leads: total,
      checks,
      fail_reasons: failReasons
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'data_quality_failed') });
  }
}

/* ── helpers ── */
function clampHours(input) {
  const n = Number(input || 24);
  if (!Number.isFinite(n)) return 24;
  return Math.min(168, Math.max(1, Math.floor(n)));
}

async function fetchSupabase(config, path) {
  const response = await fetch(`${config.projectUrl}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: 'application/json'
    }
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { ok: false, error: `postgrest_${response.status}:${text.slice(0, 200)}` };
  }
  return { ok: true, data: await response.json().catch(() => []) };
}

/* ── stats report (dashboard_stats + analytics views) ── */
const STATS_VIEW_MAP = {
  funnel: 'v_lead_funnel', conversion: 'v_conversion_rates',
  channels: 'v_channel_roi', services: 'v_service_performance',
  geo: 'v_geo_heatmap', daily: 'v_daily_trends',
  weekly: 'v_weekly_summary', response_time: 'v_response_time_dist',
  chat: 'v_chat_analytics', losses: 'v_loss_reasons',
  reviews: 'v_reviews_summary', capacity: 'v_capacity',
  pnl: 'v_monthly_pl', repeat: 'v_repeat_customers',
};

async function statsReport(req, res) {
  const config = getConfig();
  if (!config) {
    return res.status(500).json({ ok: false, error: 'supabase_not_configured' });
  }

  const secret = process.env.STATS_SECRET || config.serviceRoleKey.slice(0, 16);
  const providedKey = String(req.query?.key || '');
  if (!providedKey || providedKey !== secret) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  const view = String(req.query?.view || '').toLowerCase();
  const days = Math.min(Math.max(parseInt(req.query?.days) || 30, 1), 365);

  try {
    if (view && STATS_VIEW_MAP[view]) {
      const r = await fetchSupabase(config, `${STATS_VIEW_MAP[view]}?limit=500`);
      if (!r.ok) return res.status(502).json({ ok: false, error: r.error });
      return res.status(200).json({ ok: true, type: STATS_VIEW_MAP[view], rows: (r.data || []).length, data: r.data });
    }

    const response = await fetch(`${config.projectUrl}/rest/v1/rpc/dashboard_stats`, {
      method: 'POST',
      headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_days: days }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return res.status(502).json({ ok: false, error: `supabase_${response.status}`, details: body.slice(0, 500) });
    }
    const data = await response.json();
    return res.status(200).json({ ok: true, type: 'dashboard', days, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || 'stats_error' });
  }
}

function buildMetrics(events, leads) {
  const byType = {};
  let aiChatForwardEvents = 0;
  let photosForwardedCount = 0;
  let dedupSkippedCount = 0;
  let photoFailedCount = 0;
  const failureReasons = {};

  for (const e of events) {
    const type = String(e?.event_type || 'unknown');
    byType[type] = (byType[type] || 0) + 1;
    // DB column is `event_data` (migration 034 / ADR-001). Kept `event_payload`
    // fallback for any stale row written before the column rename ran to
    // completion — harmless on current rows, robust against replay.
    const payload = (e?.event_data && typeof e.event_data === 'object')
      ? e.event_data
      : (e?.event_payload && typeof e.event_payload === 'object' ? e.event_payload : {});
    if (payload.stage === 'ai_chat_forward' && (type === 'telegram_sent' || type === 'telegram_failed')) {
      aiChatForwardEvents += 1;
      photosForwardedCount += Number(payload.photos_forwarded_count || 0);
      dedupSkippedCount += Number(payload.dedup_skipped_count || 0);
    }
    if (type === 'chat_photo_telegram_failed') {
      photoFailedCount += Number(payload.failed_count || 0);
      const list = Array.isArray(payload.failed) ? payload.failed : [];
      for (const item of list) {
        const reason = String(item?.error || 'unknown_error');
        failureReasons[reason] = (failureReasons[reason] || 0) + 1;
      }
    }
  }

  const leadStatus = {}, leadSource = {};
  for (const lead of leads) {
    const status = String(lead?.status || 'unknown');
    const source = String(lead?.source || 'unknown');
    leadStatus[status] = (leadStatus[status] || 0) + 1;
    leadSource[source] = (leadSource[source] || 0) + 1;
  }

  const totalPhotoAttempts = photosForwardedCount + photoFailedCount;
  return {
    leads_24h: leads.length,
    lead_status_breakdown: leadStatus,
    lead_source_breakdown: leadSource,
    event_type_counts: byType,
    ai_chat_forward_events: aiChatForwardEvents,
    photos_forwarded_count: photosForwardedCount,
    dedup_skipped_count: dedupSkippedCount,
    chat_photo_failed_count: photoFailedCount,
    photo_forward_success_rate: totalPhotoAttempts > 0 ? Number((photosForwardedCount / totalPhotoAttempts).toFixed(4)) : null,
    chat_photo_failure_reasons: failureReasons
  };
}

function containsAll(text, needles) {
  const t = String(text || '');
  return needles.every((n) => t.includes(String(n)));
}

function containsAny(text, needles) {
  const t = String(text || '');
  return needles.some((n) => t.includes(String(n)));
}

function jsonLdHasExpected(indexHtml, serviceId, expectedPrice) {
  const html = String(indexHtml || '');
  if (!html) return false;

  const mapping = {
    tv_mounting: 'TV Mounting',
    furniture_assembly: 'Furniture Assembly',
    art_mirrors: 'Art & Mirror Hanging',
    interior_painting: 'Interior Painting',
    flooring: 'Flooring Installation',
    kitchen_cabinet_painting: 'Kitchen Cabinet Painting',
    furniture_painting: 'Furniture Painting',
    plumbing: 'Plumbing',
    electrical: 'Electrical'
  };
  const serviceName = mapping[serviceId];
  if (!serviceName) return false;

  const idx = html.indexOf(`\"name\":\"${serviceName}\"`);
  if (idx === -1) return false;
  const chunk = html.slice(idx, idx + 300);
  return chunk.includes(`\"price\":\"${Number(expectedPrice).toFixed(2)}\"`) || chunk.includes(`\"price\":\"${Number(expectedPrice)}\"`);
}

// ─── Outbox SLO Health ────────────────────────────────────────────────────────
// GET /api/health?type=outbox
// Returns 200 if queue is healthy, 503 if SLO breach (oldest_pending_sec > 900)
// Also shows business pipeline invariants (orphan events, unalerted leads, etc.)

async function outboxHealth(req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const headers = {
    apikey:        config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    Accept:        'application/json'
  };

  const [sloResp, metricsResp, invariantsResp] = await Promise.all([
    fetch(`${config.projectUrl}/rest/v1/v_outbox_slo?limit=1`, { headers }).catch(() => null),
    fetch(`${config.projectUrl}/rest/v1/v_outbox_metrics?order=count.desc&limit=20`, { headers }).catch(() => null),
    fetch(`${config.projectUrl}/rest/v1/v_pipeline_invariants?limit=20`, { headers }).catch(() => null)
  ]);

  const sloRows        = sloResp?.ok        ? await sloResp.json().catch(() => [])        : [];
  const metricsRows    = metricsResp?.ok     ? await metricsResp.json().catch(() => [])    : [];
  const invariantRows  = invariantsResp?.ok  ? await invariantsResp.json().catch(() => []) : [];

  const slo = Array.isArray(sloRows) && sloRows.length ? sloRows[0] : null;
  const oldestPendingSec = slo?.oldest_pending_sec ?? null;
  const dlqTotal         = slo?.dlq_total          ?? 0;
  const queueDepth       = slo?.queue_depth         ?? 0;

  // SLO breach thresholds
  const sloBreached = oldestPendingSec !== null && oldestPendingSec > 900;
  const dlqBreached = dlqTotal > 0;
  const healthy     = !sloBreached;

  const report = {
    ok:       healthy,
    slo,
    slo_breached:    sloBreached,
    dlq_alert:       dlqBreached,
    queue_depth:     queueDepth,
    dlq_total:       dlqTotal,
    oldest_pending_sec: oldestPendingSec,
    metrics:         metricsRows,
    pipeline_invariants: invariantRows,
    replay_endpoint: 'POST /api/process-outbox?action=replay_dlq&job_id=<id>',
    checked_at:      new Date().toISOString()
  };

  return res.status(healthy ? 200 : 503).json(report);
}
