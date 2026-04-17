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
const { getCanonicalPriceMatrix, getMessengerPostbackTexts, getPricingSourceVersion } = require('../lib/price-registry.js');
const { checkMigration007 } = require('../lib/lead-pipeline.js');
const { analyzeMessengerPricingPolicy } = require('../lib/pricing-policy.js');
const { normalizeAttribution } = require('../lib/attribution.js');
const { sendTelegramMessage } = require('../lib/telegram/send.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'HEAD') {
    const healthy = Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
    return res.status(healthy ? 200 : 503).end();
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const type = String(req.query?.type || 'basic').toLowerCase();

  if (type === 'funnel') return funnelHealth(req, res);
  if (type === 'fb') return fbHealth(req, res);
  if (type === 'pricing') return pricingHealth(req, res);
  if (type === 'attribution') return attributionHealth(req, res);
  if (type === 'traffic') return trafficHealth(req, res);
  if (type === 'lead_integrity') return leadIntegrityHealth(req, res);
  if (type === 'policy') return policyHealth(req, res);
  if (type === 'stats') return statsReport(req, res);
  if (type === 'data_quality') return dataQualityHealth(req, res);
  if (type === 'outbox') return outboxHealth(req, res);
  if (type === 'telegram') return telegramHealth(req, res);
  if (type === 'telegram_watchdog') return telegramWatchdog(req, res);
  return basicHealth(req, res);
}

/* ── Telegram watchdog (cron) ──
 * GET /api/health?type=telegram_watchdog
 * Auth: Vercel's own cron infrastructure sets the x-vercel-cron header
 * on scheduled invocations. External callers cannot spoof it — Vercel
 * strips incoming x-vercel-cron at the edge. External/manual callers
 * may authenticate with Authorization: Bearer <CRON_SECRET> (or the
 * legacy alias VERCEL_CRON_SECRET). This matches api/process-outbox.js
 * auth after Task 1.1.
 * Runs daily via vercel.json crons. Queries v_leads_without_telegram
 * and fires ONE aggregated Telegram alert if any real lead in the last
 * 7 days has zero telegram_proofs. Uses unified sender.
 *
 * Exists inside /api/health to stay under Hobby plan's 12-function cap.
 */
async function telegramWatchdog(req, res) {
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || '';
  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  const authHeader = String(req.headers.authorization || '');
  const secretMatches = cronSecret && authHeader === `Bearer ${cronSecret}`;
  const authorized = isVercelCron || secretMatches;
  if (!authorized) {
    return res.status(403).json({ ok: false, error: 'forbidden' });
  }

  const config = getConfig();
  if (!config) return res.status(500).json({ ok: false, error: 'supabase_env_missing' });

  let rows;
  try {
    const r = await fetch(
      `${config.projectUrl}/rest/v1/v_leads_without_telegram?select=id,full_name,phone,source,service_type,minutes_since_created,telegram_proofs&order=created_at.desc&limit=50`,
      { headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}` } }
    );
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return res.status(502).json({ ok: false, error: `supabase_${r.status}`, details: t.slice(0, 300) });
    }
    rows = await r.json();
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'supabase_fetch_failed', details: String(err?.message || err).slice(0, 300) });
  }

  const missing = (Array.isArray(rows) ? rows : []).filter(r => Number(r.telegram_proofs) === 0);
  const summary = {
    ok: true,
    checked_at: new Date().toISOString(),
    total_real_leads_7d: Array.isArray(rows) ? rows.length : 0,
    missing_telegram_proof: missing.length
  };

  if (missing.length === 0) {
    return res.status(200).json({ ...summary, alert_sent: false });
  }

  const lines = missing.slice(0, 10).map(r => {
    const mins = Math.round(Number(r.minutes_since_created || 0));
    return ` • <code>${escapeHtmlBasic(String(r.id).slice(0, 40))}</code> | ${escapeHtmlBasic(r.source || '?')} | ${escapeHtmlBasic(r.service_type || '?')} | ${mins} min ago`;
  });
  const overflow = missing.length > 10 ? `\n(+ ${missing.length - 10} more)` : '';

  const text = `🟠 <b>Watchdog: leads without Telegram proof</b>\n` +
    `Missing: <b>${missing.length}</b> of ${summary.total_real_leads_7d} real leads in last 7 days\n\n` +
    lines.join('\n') + overflow +
    `\n\nView: <code>v_leads_without_telegram</code> (Supabase)`;

  const send = await sendTelegramMessage({
    source: 'watchdog',
    text,
    timeoutMs: 4000,
    extra: { lead_ids_sample: missing.slice(0, 10).map(r => r.id) }
  });

  return res.status(200).json({
    ...summary,
    alert_sent: send.ok,
    alert_message_id: send.messageId,
    alert_telegram_send_id: send.telegramSendId,
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
 *   - count of leads without telegram proof (from v_leads_without_telegram)
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
    sb('v_leads_without_telegram?select=id,source,minutes_since_created,telegram_proofs&order=created_at.desc&limit=20'),
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

  const leadsWithoutProof = Array.isArray(missingProof)
    ? missingProof.filter(r => Number(r.telegram_proofs) === 0)
    : [];

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

/* ── channel taxonomy diagnostic ── */
async function trafficHealth(req, res) {
  const config = getConfig();
  if (!config) return res.status(200).json({ ok: false, error: 'supabase_not_configured' });

  const windowHours = clampHours(req.query?.hours || 168);
  const sinceIso = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

  try {
    const [leadsRows, convRows, real7dRows] = await Promise.all([
      fetchSupabase(
        config,
        `leads?select=id,source,traffic_source,is_test,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=3000`
      ),
      fetchSupabase(
        config,
        `ai_conversations?select=session_id,source,channel_source,message_role,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=5000`
      ),
      fetchSupabase(config, 'v_real_leads_7d?select=id,traffic_source,created_at&limit=3000')
    ]);

    if (!leadsRows.ok || !convRows.ok || !real7dRows.ok) {
      return res.status(502).json({
        ok: false,
        error: 'traffic_data_fetch_failed',
        details: {
          leads: leadsRows.error || null,
          conversations: convRows.error || null,
          v_real_leads_7d: real7dRows.error || null
        }
      });
    }

    const leadCounts = {
      all_channels_including_test_and_probe: 0,
      real_customer_channels_total: 0,
      by_channel: {},
      unknown: 0
    };
    for (const row of leadsRows.data || []) {
      leadCounts.all_channels_including_test_and_probe += 1;
      const channel = deriveLeadChannel(row);
      leadCounts.by_channel[channel] = (leadCounts.by_channel[channel] || 0) + 1;
      if (channel === 'unknown') {
        leadCounts.unknown += 1;
      }
      const isTest = Boolean(row?.is_test);
      if (!isTest && (channel === 'real_website_chat' || channel === 'fb_messenger')) {
        leadCounts.real_customer_channels_total += 1;
      }
    }

    const convCounts = {
      messages_total: 0,
      sessions_total: 0,
      sessions_by_channel: {},
      unknown_sessions: 0
    };
    const sessionChannel = new Map();
    for (const row of convRows.data || []) {
      convCounts.messages_total += 1;
      const sid = String(row?.session_id || '');
      if (!sid) continue;
      const channel = deriveConversationChannel(row);
      if (!sessionChannel.has(sid)) {
        sessionChannel.set(sid, channel);
      }
    }

    convCounts.sessions_total = sessionChannel.size;
    for (const channel of sessionChannel.values()) {
      convCounts.sessions_by_channel[channel] = (convCounts.sessions_by_channel[channel] || 0) + 1;
      if (channel === 'unknown') convCounts.unknown_sessions += 1;
    }

    const real7dCounts = {};
    for (const row of real7dRows.data || []) {
      const channel = normalizeChannelValue(row?.traffic_source) || 'real_website_chat';
      real7dCounts[channel] = (real7dCounts[channel] || 0) + 1;
    }

    return res.status(200).json({
      ok: true,
      window_hours: windowHours,
      generated_at: new Date().toISOString(),
      taxonomy_values: [
        'real_website_chat',
        'fb_messenger',
        'test',
        'probe',
        'cron',
        'e2e',
        'internal_admin',
        'unknown'
      ],
      leads: leadCounts,
      conversations: convCounts,
      real_leads_7d: {
        total: (real7dRows.data || []).length,
        by_channel: real7dCounts
      }
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'traffic_health_failed') });
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

function normalizeChannelValue(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  const allowed = new Set([
    'real_website_chat',
    'fb_messenger',
    'test',
    'probe',
    'cron',
    'e2e',
    'internal_admin'
  ]);
  return allowed.has(v) ? v : '';
}

function deriveLeadChannel(row) {
  const explicit = normalizeChannelValue(row?.traffic_source);
  if (explicit) return explicit;
  const src = String(row?.source || '').toLowerCase();
  if (src === 'messenger' || src === 'facebook_messenger') return 'fb_messenger';
  if (src === 'test' || src === 'synthetic') return 'test';
  if (src === 'cron' || src === 'scheduler') return 'cron';
  if (src === 'internal_admin' || src === 'admin') return 'internal_admin';
  if (src.includes('probe')) return 'probe';
  if (src) return 'real_website_chat';
  return 'unknown';
}

function deriveConversationChannel(row) {
  const explicit = normalizeChannelValue(row?.channel_source);
  if (explicit) return explicit;
  const src = String(row?.source || '').toLowerCase();
  const sid = String(row?.session_id || '').toLowerCase();
  if (src === 'messenger' || src === 'facebook_messenger' || sid.startsWith('fb_')) return 'fb_messenger';
  if (sid.startsWith('probe_') || src.includes('probe')) return 'probe';
  if (sid.startsWith('e2e_') || sid.startsWith('test_') || src === 'test' || src === 'synthetic') return 'e2e';
  if (src === 'cron' || src === 'scheduler') return 'cron';
  if (src === 'internal_admin' || src === 'admin') return 'internal_admin';
  if (src === 'website_chat' || src === 'web' || src === 'site' || !src) return 'real_website_chat';
  return 'unknown';
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
