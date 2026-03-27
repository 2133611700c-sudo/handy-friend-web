/**
 * Outbox Processor — Guaranteed Delivery Worker
 * GET  /api/process-outbox                              → Vercel cron (daily on Hobby plan)
 * POST /api/process-outbox                              → manual trigger (requires x-cron-secret)
 * POST /api/process-outbox?action=replay_dlq&job_id=XX  → requeue one DLQ job
 * GET  /api/process-outbox?action=slo                   → SLO health check
 *
 * Uses PostgreSQL stored functions (migration 027):
 *   outbox_claim_batch(worker_id, batch_size, lock_ttl_minutes)  — SKIP LOCKED atomic claim
 *   outbox_complete_job(job_id, provider_message_id)             — mark sent
 *   outbox_fail_job(job_id, error_code, error_text, backoff_sec) — retry or DLQ
 *   outbox_replay_dlq(job_id, reason)                            — requeue from DLQ
 *
 * Per-channel retry policy:
 *   telegram_owner:  3 attempts — backoff 0 / 120 / 480s (±20% jitter)
 *   resend_owner:    5 attempts — backoff 0 /  60 / 180 / 600 / 1800s
 *   resend_customer: 3 attempts — backoff 0 / 120 / 480s
 *   ga4_event:       2 attempts — backoff 0 /  60s
 */

const CRON_SECRET      = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET || '';
const BATCH_SIZE       = 20;
const LOCK_TTL_MINUTES = 5;
const WORKER_ID        = `process-outbox:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;

// Per-channel backoff tiers (base seconds), indexed by attempt_count (1-based, already incremented by claim)
const CHANNEL_BACKOFF = {
  telegram_owner:  [0, 120, 480],
  resend_owner:    [0,  60, 180, 600, 1800],
  resend_customer: [0, 120, 480],
  ga4_event:       [0,  60],
};

function getBackoffSeconds(jobType, attemptCount) {
  const tiers = CHANNEL_BACKOFF[jobType] || [0, 120, 480];
  const base  = tiers[Math.min(attemptCount, tiers.length - 1)] ?? 480;
  // ±20% jitter to prevent thundering herd
  const jitter = base * 0.2;
  return Math.max(1, Math.round(base - jitter + Math.random() * jitter * 2));
}

// ─── Handler ─────────────────────────────────────────────────────────────────

async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  const secret  = req.headers['x-cron-secret'] || String(req.headers['authorization'] || '').replace('Bearer ', '');
  const authorized = (CRON_SECRET && secret === CRON_SECRET) || (!CRON_SECRET && isVercelCron);
  if (!authorized && req.method === 'POST') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const action = String(req.query?.action || '').toLowerCase();

  // ── SLO health check ──────────────────────────────────────────────────────
  if (action === 'slo') {
    try {
      const slo = await querySlo();
      const healthy = !slo || slo.oldest_pending_sec == null || slo.oldest_pending_sec <= 900;
      return res.status(healthy ? 200 : 503).json({ ok: healthy, slo });
    } catch (err) {
      return res.status(200).json({ ok: true, slo: null, slo_error: err.message });
    }
  }

  // ── DLQ replay ────────────────────────────────────────────────────────────
  if (action === 'replay_dlq') {
    const jobId = String(req.query?.job_id || '').trim();
    if (!jobId) return res.status(400).json({ error: 'job_id required' });
    try {
      await rpcCall('outbox_replay_dlq', { p_job_id: jobId, p_reason: 'manual_replay' });
      console.log(`[OUTBOX] DLQ replay queued for job ${jobId}`);
      return res.status(200).json({ ok: true, replayed: jobId });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ── Normal batch processing ───────────────────────────────────────────────
  const startedAt = Date.now();
  const result = { processed: 0, sent: 0, retried: 0, dlq: 0, errors: [] };

  try {
    const jobs = await claimJobs();
    result.processed = jobs.length;

    for (const job of jobs) {
      try {
        await processJob(job, result);
      } catch (err) {
        result.errors.push({ job_id: job.id, error: String(err.message || err).slice(0, 200) });
        console.error(`[OUTBOX] Unhandled error on job ${job.id}:`, err.message);
        // Lock will expire via TTL recovery in next outbox_claim_batch call
      }
    }
  } catch (err) {
    console.error('[OUTBOX] Fatal error fetching jobs:', err.message);
    return res.status(500).json({ ok: false, error: err.message, ...result });
  }

  const duration = Date.now() - startedAt;
  console.log(`[OUTBOX] Done in ${duration}ms:`, JSON.stringify(result));
  return res.status(200).json({ ok: true, duration_ms: duration, ...result });
}

module.exports = handler;

// ─── Claim (SKIP LOCKED via stored function) ─────────────────────────────────

async function claimJobs() {
  const rows = await rpcCall('outbox_claim_batch', {
    p_worker_id:        WORKER_ID,
    p_batch_size:       BATCH_SIZE,
    p_lock_ttl_minutes: LOCK_TTL_MINUTES
  });
  return Array.isArray(rows) ? rows : [];
}

// ─── Job Processor ────────────────────────────────────────────────────────────

async function processJob(job, result) {
  // attempt_count is already incremented by outbox_claim_batch
  const attemptCount = Number(job.attempt_count || 1);
  const maxAttempts  = Number(job.max_attempts  || 3);
  console.log(`[OUTBOX] Processing job ${job.id} type=${job.job_type} attempt=${attemptCount}/${maxAttempts}`);

  // Provider idempotency: if provider already confirmed delivery, mark sent without re-sending
  if (job.provider_message_id) {
    console.log(`[OUTBOX] Job ${job.id} has provider_message_id — idempotent skip, marking sent`);
    await rpcCall('outbox_complete_job', { p_job_id: job.id, p_provider_message_id: job.provider_message_id }).catch(() => {});
    result.sent++;
    return;
  }

  let deliveryResult;
  try {
    deliveryResult = await dispatchJob(job);
  } catch (err) {
    deliveryResult = { ok: false, error: err.message, error_code: 'DISPATCH_ERROR' };
  }

  if (deliveryResult.ok) {
    await rpcCall('outbox_complete_job', {
      p_job_id:              job.id,
      p_provider_message_id: deliveryResult.provider_message_id || null
    });
    result.sent++;
    console.log(`[OUTBOX] ✓ Job ${job.id} sent${deliveryResult.provider_message_id ? ` (pid: ${deliveryResult.provider_message_id})` : ''}`);
  } else {
    const backoffSec = getBackoffSeconds(job.job_type, attemptCount);
    const errorCode  = String(deliveryResult.error_code || 'DELIVERY_FAILED').slice(0, 50);
    const errorText  = String(deliveryResult.error || 'unknown').slice(0, 500);

    // outbox_fail_job decides retry vs DLQ based on attempt_count vs max_attempts in DB
    await rpcCall('outbox_fail_job', {
      p_job_id:               job.id,
      p_error_code:           errorCode,
      p_error_text:           errorText,
      p_retry_backoff_seconds: backoffSec
    });

    if (attemptCount >= maxAttempts) {
      result.dlq++;
      console.error(`[OUTBOX] ✗ Job ${job.id} → DLQ after ${attemptCount} attempts: ${errorText}`);
      notifyDlqAlert(job, attemptCount, maxAttempts, errorText).catch(() => {});
    } else {
      result.retried++;
      console.warn(`[OUTBOX] ↩ Job ${job.id} retry in ${backoffSec}s (attempt ${attemptCount}/${maxAttempts})`);
    }
  }
}

// ─── Dispatchers ─────────────────────────────────────────────────────────────

async function dispatchJob(job) {
  switch (job.job_type) {
    case 'telegram_owner':  return deliverTelegramOwner(job.payload);
    case 'resend_owner':    return deliverResendOwner(job.payload);
    case 'resend_customer': return deliverResendCustomer(job.payload);
    case 'ga4_event':       return deliverGA4Event(job.payload);
    default:
      return { ok: false, error: `Unknown job_type: ${job.job_type}`, error_code: 'UNKNOWN_JOB_TYPE' };
  }
}

// ─── Telegram Owner ───────────────────────────────────────────────────────────

async function deliverTelegramOwner(payload) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set', error_code: 'ENV_MISSING' };

  const text = payload?.text || buildDefaultTelegramText(payload);
  const res  = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...(payload?.reply_markup ? { reply_markup: payload.reply_markup } : {})
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    const code = data.error_code ? `TG_${data.error_code}` : `TG_HTTP_${res.status}`;
    return { ok: false, error: data.description || `HTTP ${res.status}`, error_code: code };
  }
  return { ok: true, provider_message_id: String(data.result?.message_id || '') };
}

function buildDefaultTelegramText(payload) {
  const esc = s => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
  return `🔔 <b>Lead Notification</b>\n` +
    `📱 Phone: <code>${esc(payload?.phone)}</code>\n` +
    `🔧 Service: ${esc(payload?.service_type)}\n` +
    `🌐 Source: ${esc(payload?.source)}\n` +
    `Lead: <code>${esc(payload?.lead_id)}</code>`;
}

// ─── Resend Owner Email ───────────────────────────────────────────────────────

async function deliverResendOwner(payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set', error_code: 'ENV_MISSING' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Handy & Friend Leads <leads@handyandfriend.com>',
      to:      [process.env.OWNER_EMAIL || 'hello@handyandfriend.com'],
      subject: payload?.subject || `New Lead: ${payload?.service_type || 'Unknown service'}`,
      html:    payload?.html    || `<p>Lead ID: ${payload?.lead_id}</p><p>Phone: ${payload?.phone}</p>`,
      ...(payload?.reply_to ? { reply_to: payload.reply_to } : {})
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, error_code: `RESEND_${res.status}` };
  return { ok: true, provider_message_id: data.id || '' };
}

// ─── Resend Customer Email ────────────────────────────────────────────────────

async function deliverResendCustomer(payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set', error_code: 'ENV_MISSING' };
  if (!payload?.to) return { ok: false, error: 'No recipient email in payload', error_code: 'MISSING_TO' };

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Handy & Friend <hello@handyandfriend.com>',
      to:      [payload.to],
      subject: payload?.subject || 'Your request has been received — Handy & Friend',
      html:    payload?.html    || `<p>Thank you for contacting Handy & Friend! We'll be in touch shortly.</p><p>📞 (213) 361-1700</p>`
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message || `HTTP ${res.status}`, error_code: `RESEND_CUST_${res.status}` };
  return { ok: true, provider_message_id: data.id || '' };
}

// ─── GA4 Server-Side Event ────────────────────────────────────────────────────

async function deliverGA4Event(payload) {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret     = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return { ok: false, error: 'GA4 env not set', error_code: 'ENV_MISSING' };

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: payload?.client_id || `server.${Date.now()}`,
      events: [{
        name: payload?.event_name || 'generate_lead',
        params: {
          currency:     'USD',
          value:        payload?.value        || 0,
          lead_id:      payload?.lead_id      || '',
          source:       payload?.source       || '',
          service_type: payload?.service_type || '',
          ...(payload?.params || {})
        }
      }]
    })
  });
  // GA4 MP returns 204 on success, no body
  if (res.status === 204 || res.ok) return { ok: true, provider_message_id: `ga4_${Date.now()}` };
  const body = await res.text().catch(() => '');
  return { ok: false, error: `GA4 ${res.status}: ${body.slice(0, 200)}`, error_code: `GA4_${res.status}` };
}

// ─── DLQ Alert (meta-notification) ───────────────────────────────────────────

async function notifyDlqAlert(job, attempts, maxAttempts, lastError) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const text = `⚠️ <b>OUTBOX DLQ</b>\n` +
    `Job <code>${job.id}</code> → DLQ after ${attempts}/${maxAttempts} attempts.\n` +
    `Type: <code>${job.job_type}</code>\n` +
    `Lead: <code>${job.lead_id || 'N/A'}</code>\n` +
    `Error: ${String(lastError || '').slice(0, 200)}\n` +
    `Replay: POST /api/process-outbox?action=replay_dlq&job_id=${encodeURIComponent(job.id)}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  }).catch(() => {});
}

// ─── SLO Query ────────────────────────────────────────────────────────────────

async function querySlo() {
  const config = getConfig();
  if (!config) return null;
  const resp = await fetch(`${config.projectUrl}/rest/v1/v_outbox_slo?limit=1`, {
    headers: {
      apikey:        config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept:        'application/json'
    }
  });
  if (!resp.ok) return null;
  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

// ─── Supabase RPC ─────────────────────────────────────────────────────────────

async function rpcCall(funcName, params = {}) {
  const config = getConfig();
  if (!config) throw new Error('Supabase not configured');

  const resp = await fetch(`${config.projectUrl}/rest/v1/rpc/${funcName}`, {
    method: 'POST',
    headers: {
      apikey:          config.serviceRoleKey,
      Authorization:   `Bearer ${config.serviceRoleKey}`,
      Accept:          'application/json',
      'Content-Type':  'application/json'
    },
    body: JSON.stringify(params)
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`RPC ${funcName} ${resp.status}: ${body.slice(0, 300)}`);
  }
  if (resp.status === 204) return null;
  return resp.json().catch(() => null);
}

function getConfig() {
  const projectUrl     = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!projectUrl || !serviceRoleKey) return null;
  return { projectUrl, serviceRoleKey };
}
