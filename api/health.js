/**
 * Unified health endpoint (replaces factory-health + funnel-health).
 *   GET /api/health          -> basic runtime diagnostics
 *   GET /api/health?type=funnel&hours=24  -> funnel analytics
 */

const { getConfig } = require('./_lib/supabase-admin.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const type = String(req.query?.type || 'basic').toLowerCase();

  if (type === 'funnel') return funnelHealth(req, res);
  return basicHealth(req, res);
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
      fetchSupabase(config, `lead_events?select=event_type,event_payload,created_at&created_at=gte.${encodeURIComponent(sinceIso)}&order=created_at.desc&limit=2000`),
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
    const payload = e?.event_payload && typeof e.event_payload === 'object' ? e.event_payload : {};
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
