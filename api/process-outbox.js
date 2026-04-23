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
const { sendTelegramMessage: unifiedTelegramSend } = require('../lib/telegram/send.js');
const BATCH_SIZE       = 20;
const LOCK_TTL_MINUTES = 5;
const WORKER_ID        = `process-outbox:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;
const OUTBOX_AUTO_DAILY_REPORT_ENABLED = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.OUTBOX_AUTO_DAILY_REPORT_ENABLED || '').toLowerCase());
const OUTBOX_AUTO_WEEKLY_REPORT_ENABLED = ['1', 'true', 'yes', 'on']
  .includes(String(process.env.OUTBOX_AUTO_WEEKLY_REPORT_ENABLED || '').toLowerCase());

// Per-channel backoff tiers (base seconds), indexed by attempt_count (1-based, already incremented by claim)
const CHANNEL_BACKOFF = {
  telegram_owner:  [0, 120, 480],
  resend_owner:    [0,  60, 180, 600, 1800],
  resend_customer: [0, 120, 480],
  ga4_event:       [0,  60],
  meta_capi:       [0,  60, 300, 1200],
};

// ─── Circuit Breaker (per batch, in-memory) ──────────────────────────────────
// If a provider fails consecutively within a batch, skip remaining jobs of that
// type to avoid hammering a broken provider and wasting retry budgets.
const CIRCUIT_BREAKER_THRESHOLD = 3; // consecutive failures before tripping
const circuitState = {};             // { [jobType]: { failures: N, tripped: bool } }

function circuitTripped(jobType) {
  return circuitState[jobType]?.tripped === true;
}

function circuitRecordSuccess(jobType) {
  circuitState[jobType] = { failures: 0, tripped: false };
}

function circuitRecordFailure(jobType) {
  const s = circuitState[jobType] || { failures: 0, tripped: false };
  s.failures++;
  if (s.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    s.tripped = true;
    console.warn(`[OUTBOX] ⚡ Circuit breaker TRIPPED for ${jobType} after ${s.failures} consecutive failures`);
  }
  circuitState[jobType] = s;
}

function resetCircuitBreakers() {
  for (const k of Object.keys(circuitState)) delete circuitState[k];
}

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

  // Auth: Vercel's own cron infrastructure always sends x-vercel-cron header
  // on scheduled invocations. External callers cannot spoof it — Vercel
  // strips this header from incoming requests at the edge. See:
  // https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  // In addition, manual external invocations can authenticate with
  // x-cron-secret or Authorization: Bearer <CRON_SECRET>.
  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  const secret  = req.headers['x-cron-secret'] || String(req.headers['authorization'] || '').replace('Bearer ', '');
  const secretMatches = CRON_SECRET && secret === CRON_SECRET;
  const authorized = isVercelCron || secretMatches;

  const action = String(req.query?.action || '').toLowerCase();

  // ── SLO health check (read-only, no auth required) ─────────────────────────
  if (action === 'slo' && req.method === 'GET') {
    try {
      const slo = await querySlo();
      const healthy = !slo || slo.oldest_pending_sec == null || slo.oldest_pending_sec <= 900;
      return res.status(healthy ? 200 : 503).json({ ok: healthy, slo });
    } catch (err) {
      return res.status(200).json({ ok: true, slo: null, slo_error: err.message });
    }
  }

  // ── ALL other actions require authorization ────────────────────────────────
  if (!authorized) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // ── Daily / weekly report (authorized only) ─────────────────────────────────
  if (action === 'daily_report') {
    try {
      await handleDailyReport();
      return res.status(200).json({ ok: true, action: 'daily_report' });
    } catch (err) {
      console.error('[OUTBOX] Daily report error:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  if (action === 'weekly_report') {
    try {
      await handleWeeklyReport();
      return res.status(200).json({ ok: true, action: 'weekly_report' });
    } catch (err) {
      console.error('[OUTBOX] Weekly report error:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  }

  // ── DLQ replay (authorized only) ───────────────────────────────────────────
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

  // ── Normal batch processing (authorized only) ──────────────────────────────
  const startedAt = Date.now();
  const result = { processed: 0, sent: 0, retried: 0, dlq: 0, circuit_skipped: 0, errors: [] };
  resetCircuitBreakers();

  try {
    const jobs = await claimJobs();
    result.processed = jobs.length;

    for (const job of jobs) {
      // Circuit breaker: skip jobs for providers that are failing consecutively
      if (circuitTripped(job.job_type)) {
        result.circuit_skipped++;
        // Don't count as failure — lock will expire via TTL, job retried next run
        continue;
      }
      try {
        await processJob(job, result);
      } catch (err) {
        result.errors.push({ job_id: job.id, error: String(err.message || err).slice(0, 200) });
        console.error(`[OUTBOX] Unhandled error on job ${job.id}:`, err.message);
        circuitRecordFailure(job.job_type);
        // Lock will expire via TTL recovery in next outbox_claim_batch call
      }
    }
  } catch (err) {
    console.error('[OUTBOX] Fatal error fetching jobs:', err.message);
    return res.status(500).json({ ok: false, error: err.message, ...result });
  }

  const duration = Date.now() - startedAt;

  // Structured JSON log for observability
  console.log(JSON.stringify({
    component: 'outbox_worker',
    worker_id: WORKER_ID,
    duration_ms: duration,
    processed: result.processed,
    sent: result.sent,
    retried: result.retried,
    dlq: result.dlq,
    circuit_skipped: result.circuit_skipped,
    errors_count: result.errors.length,
    timestamp: new Date().toISOString()
  }));

  // SLO alert: if DLQ spiked during this batch, notify owner immediately
  if (result.dlq > 0) {
    const alertText = `🚨 <b>[P1 BLOCKING] Outbox DLQ Alert</b>\n\n` +
      `${result.dlq} job(s) moved to DLQ this batch.\n` +
      `Sent: ${result.sent} | Retried: ${result.retried} | Circuit-skipped: ${result.circuit_skipped}\n` +
      `Duration: ${duration}ms\n\n` +
      `Replay: <code>POST /api/process-outbox?action=replay_dlq&amp;job_id=JOB_ID</code>`;
    deliverTelegramOwner({ text: alertText }).catch(() => {});
  }

  // Auto reports are opt-in only to prevent duplicate/noisy digest streams.
  // Keep explicit action endpoints (?action=daily_report / weekly_report) available.
  if (isVercelCron) {
    if (OUTBOX_AUTO_DAILY_REPORT_ENABLED) {
      handleDailyReport().catch(err => console.error('[OUTBOX] Auto daily report error:', err.message));
    }
    if (OUTBOX_AUTO_WEEKLY_REPORT_ENABLED) {
      // Weekly report on Sundays (PT): UTC day 1 (Mon) at 04:00 = Sun 9pm PT
      const utcDay = new Date().getUTCDay();
      if (utcDay === 1) {
        handleWeeklyReport().catch(err => console.error('[OUTBOX] Auto weekly report error:', err.message));
      }
    }
  }

  return res.status(200).json({ ok: true, duration_ms: duration, ...result });
}

module.exports = handler;

// ─── Daily / Weekly Reports ───────────────────────────────────────────────────

const { formatDailyDigest, formatWeeklyDigest } = require('../lib/alert-formats.js');

async function handleDailyReport() {
  const config = getConfig();
  if (!config) { console.warn('[OUTBOX] Daily report: Supabase not configured'); return; }

  const stats = await gatherDailyStats(config);
  const text  = `ℹ️ <b>[P3 INFO] Daily Digest</b>\n` + formatDailyDigest(stats);

  const result = await deliverTelegramOwner({ text, severity: 'P3', actionable: false, category: 'daily_digest' });
  if (!result.ok) throw new Error(result.error);
  console.log('[OUTBOX] Daily report sent');
}

async function handleWeeklyReport() {
  const config = getConfig();
  if (!config) { console.warn('[OUTBOX] Weekly report: Supabase not configured'); return; }

  const stats = await gatherWeeklyStats(config);
  const text  = `ℹ️ <b>[P3 INFO] Weekly Digest</b>\n` + formatWeeklyDigest(stats);

  const result = await deliverTelegramOwner({ text, severity: 'P3', actionable: false, category: 'weekly_digest' });
  if (!result.ok) throw new Error(result.error);
  console.log('[OUTBOX] Weekly report sent');
}

// ─── Stats Gathering ──────────────────────────────────────────────────────────

async function sbGet(config, table, params) {
  const url = new URL(`${config.projectUrl}/rest/v1/${table}`);
  for (const [k, v] of Object.entries(params || {})) url.searchParams.append(k, v);
  const resp = await fetch(url.toString(), {
    headers: {
      apikey:        config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept:        'application/json',
      'Range-Unit':  'items',
      Range:         '0-999'
    }
  });
  if (!resp.ok) return [];
  return resp.json().catch(() => []);
}

async function gatherDailyStats(config) {
  // Date boundaries in PT
  const today   = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); // YYYY-MM-DD
  const todayTs = `${today}T00:00:00-07:00`;

  const [leadsToday, allActive, hunterPosts, hunterScans, sloRows] = await Promise.all([
    sbGet(config, 'leads', {
      select:     'id,source,stage,status,full_name,phone,service_type,intent_level,needs_owner_now',
      created_at: `gte.${todayTs}`,
      is_test:    'eq.false',
      order:      'created_at.desc'
    }),
    sbGet(config, 'leads', {
      select:  'stage,status',
      is_test: 'eq.false',
      status:  'not.in.(won,lost,spam)'
    }),
    sbGet(config, 'hunter_posts', {
      select:       'id,priority,platform',
      responded_at: `gte.${todayTs}`
    }),
    sbGet(config, 'hunter_scans', {
      select:    'posts_found,posts_responded,tokens_used',
      scan_time: `gte.${todayTs}`
    }),
    sbGet(config, 'v_outbox_slo', { limit: '1' }).catch(() => [])
  ]);

  const bySource = {};
  const hotLeads = [];
  for (const l of leadsToday) {
    const src = l.source === 'facebook' ? 'facebook'
              : l.source === 'telegram' ? 'telegram'
              : (l.source || '').includes('hunter') ? 'hunter' : 'website';
    bySource[src] = (bySource[src] || 0) + 1;
    if (l.intent_level === 'high' || l.needs_owner_now) {
      hotLeads.push({ name: l.full_name, service: l.service_type, area: null, next_action: 'Call NOW' });
    }
  }

  const byStatus = {};
  for (const l of allActive) {
    const s = l.stage || l.status || 'new';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }

  const hunterFound     = hunterScans.reduce((n, r) => n + (r.posts_found    || 0), 0);
  const hunterResponded = hunterPosts.length;
  const hunterTokens    = hunterScans.reduce((n, r) => n + (r.tokens_used    || 0), 0);

  const slo = Array.isArray(sloRows) && sloRows.length ? sloRows[0] : null;

  return {
    date:                today,
    total_new:           leadsToday.length,
    by_source:           bySource,
    by_status:           byStatus,
    hunter:              { scans: hunterScans.length, found: hunterFound, responded: hunterResponded, cost: (hunterTokens * 0.000001).toFixed(4) },
    hot_leads:           hotLeads,
    response_median_min: null,
    queue_health:        slo ? {
      queue_depth: slo.queue_depth || 0,
      dlq_total:   slo.dlq_total || 0,
      slo_ok:      slo.oldest_pending_sec == null || slo.oldest_pending_sec <= 900
    } : null
  };
}

async function gatherWeeklyStats(config) {
  const now            = new Date();
  const weekAgo        = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo    = new Date(now.getTime() - 14 * 86400000);
  const weekAgoStr     = weekAgo.toISOString().split('T')[0];
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];

  const [thisWeek, prevWeek, jobs, hunterPosts] = await Promise.all([
    sbGet(config, 'leads', {
      select:     'id,source,stage,status,service_type,won_amount',
      created_at: `gte.${weekAgoStr}T00:00:00`,
      is_test:    'eq.false'
    }),
    sbGet(config, 'leads', {
      select:     'id',
      created_at: `gte.${twoWeeksAgoStr}T00:00:00`,
      is_test:    'eq.false'
    }),
    sbGet(config, 'jobs', {
      select:    'revenue',
      completed_at: `gte.${weekAgoStr}T00:00:00`
    }),
    sbGet(config, 'hunter_posts', {
      select:       'id,lead_id',
      responded_at: `gte.${weekAgoStr}T00:00:00`
    })
  ]);

  // prev week = leads from 14d ago but NOT in this week (client-side filter)
  const prevWeekCount = prevWeek.filter(l => l.created_at < `${weekAgoStr}T00:00:00`).length || prevWeek.length - thisWeek.length;

  const bySource = {};
  const svcCount = {};
  let revenue = 0;
  let won = 0;

  for (const l of thisWeek) {
    const src = l.source === 'facebook' ? 'facebook'
              : l.source === 'telegram' ? 'telegram'
              : (l.source || '').includes('hunter') ? 'hunter' : 'website';
    bySource[src] = (bySource[src] || 0) + 1;
    const svc = l.service_type || 'other';
    svcCount[svc] = (svcCount[svc] || 0) + 1;
    if (l.status === 'won' || l.stage === 'closed') won++;
    if (l.won_amount) revenue += Number(l.won_amount);
  }

  for (const j of jobs) revenue += Number(j.revenue || 0);

  const topServices = Object.entries(svcCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([service, count]) => ({ service, count }));

  const hunterConverted = hunterPosts.filter(p => p.lead_id).length;

  const weekLabel = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return {
    week_label:       weekLabel,
    total_leads:      thisWeek.length,
    prev_week_leads:  prevWeekCount,
    revenue:          revenue.toFixed(0),
    conversion_pct:   thisWeek.length ? ((won / thisWeek.length) * 100).toFixed(0) : 0,
    by_source:        bySource,
    top_services:     topServices,
    hunter:           { responded: hunterPosts.length, converted: hunterConverted }
  };
}

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
    circuitRecordSuccess(job.job_type);
    console.log(`[OUTBOX] ✓ Job ${job.id} sent${deliveryResult.provider_message_id ? ` (pid: ${deliveryResult.provider_message_id})` : ''}`);
  } else {
    circuitRecordFailure(job.job_type);
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
    case 'telegram_owner':  return deliverTelegramOwner(job.payload, job.lead_id);
    case 'resend_owner':    return deliverResendOwner(job.payload);
    case 'resend_customer': return deliverResendCustomer(job.payload);
    case 'ga4_event':       return deliverGA4Event(job.payload);
    case 'meta_capi':       return deliverMetaCapi(job.payload);
    default:
      return { ok: false, error: `Unknown job_type: ${job.job_type}`, error_code: 'UNKNOWN_JOB_TYPE' };
  }
}

// ─── Telegram Owner ───────────────────────────────────────────────────────────

async function deliverTelegramOwner(payload, leadId) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set', error_code: 'ENV_MISSING' };

  const text = payload?.text || buildDefaultTelegramText(payload);
  const send = await unifiedTelegramSend({
    source: 'process_outbox',
    leadId: leadId || payload?.lead_id || null,
    text,
    token,
    chatId,
    timeoutMs: 4000,
    replyMarkup: payload?.reply_markup,
    extra: {
      job_type: 'telegram_owner',
      category: payload?.category || null,
      severity: payload?.severity || null,
      actionable: payload?.actionable === true
    }
  });
  if (!send.ok) {
    const code = String(send.errorCode || 'TG_UNKNOWN');
    return { ok: false, error: send.errorDescription || code, error_code: code };
  }
  return { ok: true, provider_message_id: String(send.messageId || '') };
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

  await unifiedTelegramSend({
    source: 'process_outbox',
    leadId: job?.lead_id || null,
    text,
    token,
    chatId,
    timeoutMs: 4000,
    extra: {
      category: 'outbox_dlq',
      job_id: job?.id || null,
      job_type: job?.job_type || null,
      attempts,
      maxAttempts
    }
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
