/**
 * Lead Submission Endpoint - Vercel Serverless Function
 * Replaces Formspree (which was using placeholder ID "xyzqwert")
 *
 * Sends email notification to owner via Resend API (free tier: 3000/month)
 * Falls back to console log in demo mode if RESEND_API_KEY not set
 *
 * SETUP: Add RESEND_API_KEY to Vercel → Settings → Environment Variables
 * Get free key at: https://resend.com/signup
 */

const { saveLeadContext } = require('./_lib/lead-context-store.js');
const { restInsert, logLeadEvent } = require('./_lib/supabase-admin.js');
const { getClientIp, checkRateLimit } = require('./_lib/rate-limit.js');
const { createOrMergeLead, processInbound, transitionLead, logEvent: pipelineLogEvent, enqueueOutboundJob } = require('../lib/lead-pipeline.js');
const { normalizeAttribution, buildSourceDetails } = require('../lib/attribution.js');
const { createEnvelope } = require('../lib/inbound-envelope.js');

const SUBMIT_DEDUP_TTL_MS = 10 * 60 * 1000;
const SUBMIT_RESULT_CACHE = globalThis.__HF_SUBMIT_RESULT_CACHE || new Map();
const SUBMIT_INFLIGHT = globalThis.__HF_SUBMIT_INFLIGHT || new Map();
globalThis.__HF_SUBMIT_RESULT_CACHE = SUBMIT_RESULT_CACHE;
globalThis.__HF_SUBMIT_INFLIGHT = SUBMIT_INFLIGHT;

function cleanupSubmitCache(now = Date.now()) {
  for (const [key, item] of SUBMIT_RESULT_CACHE.entries()) {
    if (!item?.ts || now - item.ts > SUBMIT_DEDUP_TTL_MS) SUBMIT_RESULT_CACHE.delete(key);
  }
  for (const [key, item] of SUBMIT_INFLIGHT.entries()) {
    if (!item?.ts || now - item.ts > 60 * 1000) SUBMIT_INFLIGHT.delete(key);
  }
}

function normalizePhoneDigits(raw) {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
  return digits.slice(-10);
}

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function normalizeService(raw) {
  return String(raw || 'unknown').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function buildSubmitDedupKeys({ requestId, phone, email, service, ip }) {
  const keys = [];
  const reqKey = String(requestId || '').trim();
  if (reqKey) keys.push(`req:${reqKey}`);
  const phoneDigits = normalizePhoneDigits(phone);
  const safeEmail = normalizeEmail(email);
  const safeService = normalizeService(service);
  const fingerprint = [phoneDigits || '-', safeEmail || '-', safeService, String(ip || '')].join('|');
  keys.push(`fp:${fingerprint}`);
  return keys;
}

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function startSubmitDedup(payload) {
  cleanupSubmitCache();
  const keys = buildSubmitDedupKeys(payload);

  for (const key of keys) {
    const cached = SUBMIT_RESULT_CACHE.get(key);
    if (cached?.leadId) {
      return { duplicate: true, leadId: cached.leadId, mode: 'cache', keys };
    }
    const inflight = SUBMIT_INFLIGHT.get(key);
    if (inflight?.deferred?.promise) {
      return { duplicate: true, pending: inflight.deferred.promise, mode: 'inflight', keys };
    }
  }

  const deferred = createDeferred();
  const ticket = { keys, deferred };
  for (const key of keys) {
    SUBMIT_INFLIGHT.set(key, { deferred, ts: Date.now() });
  }
  return { duplicate: false, ticket };
}

function resolveSubmitDedup(ticket, leadId) {
  if (!ticket?.keys?.length) return;
  const ts = Date.now();
  for (const key of ticket.keys) {
    SUBMIT_INFLIGHT.delete(key);
    if (leadId) {
      SUBMIT_RESULT_CACHE.set(key, { leadId, ts });
    }
  }
  ticket.deferred?.resolve?.(leadId || null);
}

function rejectSubmitDedup(ticket, err) {
  if (!ticket?.keys?.length) return;
  for (const key of ticket.keys) SUBMIT_INFLIGHT.delete(key);
  if (err) {
    console.warn('[SUBMIT_DEDUP_RELEASE]', err.message || err);
  }
  ticket.deferred?.resolve?.(null);
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const submitIp = getClientIp(req);
  const submitRate = checkRateLimit({
    key: `submit-lead:${submitIp}`,
    limit: 8,
    windowMs: 60 * 1000
  });
  if (!submitRate.ok) {
    res.setHeader('Retry-After', String(submitRate.retryAfterSec));
    return res.status(429).json({
      success: false,
      error: 'Too many lead submissions. Please try again shortly.'
    });
  }

  const {
    name,
    email,
    phone,
    zip,
    preferredContact,
    service,
    message,
    attachments,
    attribution,
    lang,
    timestamp,
    recaptchaToken,
    recaptchaAction,
    requestId,
    _subject
  } = req.body || {};
  const normalizedAttribution = normalizeAttribution(attribution);

  // Basic validation
  if (!name || (!phone && !email)) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: name, phone or email'
    });
  }

  // Email validation (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  const dedupState = startSubmitDedup({
    requestId,
    phone,
    email,
    service,
    ip: submitIp
  });
  if (dedupState.duplicate) {
    if (dedupState.pending) {
      const existingLeadId = await dedupState.pending.catch(() => null);
      if (existingLeadId) {
        return res.status(200).json({ success: true, mode: 'dedup_inflight', deduped: true, leadId: existingLeadId });
      }
    } else if (dedupState.leadId) {
      return res.status(200).json({ success: true, mode: 'dedup_cache', deduped: true, leadId: dedupState.leadId });
    }
  }

  if (process.env.RECAPTCHA_SECRET_KEY) {
    if (!recaptchaToken) {
      rejectSubmitDedup(dedupState.ticket, new Error('missing_recaptcha_token'));
      return res.status(400).json({
        success: false,
        error: 'Missing reCAPTCHA token'
      });
    }

    try {
      const verifyBody = new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: recaptchaToken,
        remoteip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || ''
      });

      const recaptchaResp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyBody
      });
      const recaptchaData = await recaptchaResp.json();
      const expectedAction = recaptchaAction || 'lead_submit';
      const minScore = Number(process.env.RECAPTCHA_MIN_SCORE || 0.5);

      if (
        !recaptchaData.success ||
        recaptchaData.action !== expectedAction ||
        Number(recaptchaData.score || 0) < minScore
      ) {
        console.warn('[RECAPTCHA_BLOCKED]', recaptchaData);
        rejectSubmitDedup(dedupState.ticket, new Error('recaptcha_blocked'));
        return res.status(403).json({
          success: false,
          error: 'reCAPTCHA validation failed'
        });
      }
    } catch (err) {
      console.error('[RECAPTCHA_ERROR]', err.message);
      rejectSubmitDedup(dedupState.ticket, err);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify reCAPTCHA'
      });
    }
  }

  // === PIPELINE: Smart deduplication + lead creation ===
  // Using lib/lead-pipeline.js for intelligent merging of duplicate leads
  const safeAttachments = Array.isArray(attachments)
    ? attachments.slice(0, 6).map((item) => ({
      name: String(item?.name || 'photo.jpg'),
      type: String(item?.type || 'image/jpeg'),
      size: Number(item?.size || 0)
    }))
    : [];

  const leadData = {
    name,
    email,
    phone,
    zip: String(zip || ''),
    preferredContact: String(preferredContact || 'call'),
    service: service || 'Not specified',
    message: message || 'No message',
    attachments: safeAttachments,
    attribution: normalizedAttribution,
    lang: lang || 'en',
    timestamp: timestamp || new Date().toISOString(),
    ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    source: normalizedAttribution.channel || 'website_form',
    sourceDetails: buildSourceDetails(normalizedAttribution)
  };

  console.log('[LEAD_CAPTURED]', JSON.stringify({
    service: leadData.service,
    source: leadData.source,
    has_phone: Boolean(leadData.phone),
    has_email: Boolean(leadData.email),
    has_name: Boolean(leadData.name),
    attachments: leadData.attachments?.length || 0
  }));
  saveLeadContext(leadData).catch((err) => console.error('[LEAD_CONTEXT_ASYNC_ERROR]', err.message));

  // Create or merge lead using Unified Lead System v3 (multi-key dedupe + side effects via outbox)
  const envelope = createEnvelope({
    source:        'website',
    lead_phone:    phone,
    lead_email:    email,
    lead_name:     name,
    raw_text:      String(message || service || ''),
    service_hint:  service,
    attachments:   safeAttachments.map(a => ({ type: a.type, url: a.name })),
    attribution: {
      utm_source:   normalizedAttribution.utmSource   || req.query?.utm_source,
      utm_medium:   normalizedAttribution.utmMedium   || req.query?.utm_medium,
      utm_campaign: normalizedAttribution.utmCampaign || req.query?.utm_campaign,
      gclid:        normalizedAttribution.gclid,
      referrer:     req.headers.referer || ''
    },
    meta: { zip, preferred_contact: preferredContact, lang }
  });

  let pipelineResult;
  let leadId;
  try {
    pipelineResult = await processInbound(envelope);
    leadId = pipelineResult.id;

    // Log to pipeline event trail (includes requestId for idempotency tracking)
    await pipelineLogEvent(leadId, 'form_submission', {
      service: service,
      source: leadData.source,
      has_email: Boolean(email),
      has_phone: Boolean(phone),
      is_new: pipelineResult.isNew,
      attachments_count: safeAttachments.length,
      request_id: requestId || null
    }).catch(err => console.error('[PIPELINE_LOG]', err.message));
    await transitionLead(leadId, 'contacted', {
      contacted_at: new Date().toISOString()
    }).catch(() => {});

    if (pipelineResult.isNew) {
      console.log('[LEAD_CREATED_NEW]', leadId);
    } else {
      console.log('[LEAD_MERGED_EXISTING]', leadId);
    }
  } catch (err) {
    console.error('[PIPELINE_ERROR]', err.message);
    // Fallback to legacy insertion method
    console.warn('[FALLBACK_TO_LEGACY_INSERT]');
    leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const legacyRecord = {
      id: leadId,
      source: leadData.source || 'website_form',
      status: (!phone && !email) ? 'partial' : 'new',
      full_name: String(name || '').slice(0, 160),
      phone: String(phone || '').slice(0, 40),
      email: String(email || '').slice(0, 160),
      city: '',
      zip: String(zip || '').slice(0, 20),
      service_type: String(service || 'Not specified').slice(0, 120),
      problem_description: String(message || '').slice(0, 4000),
      budget_range: '',
      preferred_date: '',
      lead_score: 0,
      ai_summary_short: buildShortSummary({ service, zip, message }),
      ai_summary_full: buildFullSummary({ service, message, preferredContact, source: leadData.source }),
      assigned_to: '',
      next_action_at: null,
      last_contact_at: null,
      source_details: leadData.sourceDetails || {}
    };
    await insertLeadWithSchemaFallback(legacyRecord);
  }
  resolveSubmitDedup(dedupState.ticket, leadId);

  // Build email HTML
  const safePhoneDigits = String(phone || '').replace(/\D/g, '');
  const subjectLine = _subject || `New Quote Request: ${service || 'General'} from ${name}`;
  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9f7f4">
  <div style="background:#3a3a3a;padding:20px;border-radius:12px 12px 0 0">
    <h1 style="color:#b88924;margin:0;font-size:22px">🔧 Handy & Friend</h1>
    <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:14px">New Quote Request</p>
  </div>

  <div style="background:#fff;padding:24px;border:1px solid #e5dfd5">
    <h2 style="color:#3a3a3a;font-size:18px;margin:0 0 20px">
      ${subjectLine}
    </h2>

    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px;width:120px">Name</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${name}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Email</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">
          ${email ? `<a href="mailto:${email}" style="color:#b88924">${email}</a>` : 'Not provided'}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Phone</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">
          <a href="tel:${phone}" style="color:#b88924">${phone}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Service</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${service || 'Not specified'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">ZIP</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${escapeHtml(leadData.zip || 'Not provided')}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Preferred Contact</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${escapeHtml(leadData.preferredContact || 'call')}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#666;font-size:13px">Attachments</td>
        <td style="padding:10px 0;border-bottom:1px solid #f0ebe3;color:#3a3a3a;font-weight:600">${leadData.attachments.length} photo(s)</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top">Message</td>
        <td style="padding:10px 0;color:#3a3a3a">${message || '—'}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#666;font-size:13px;vertical-align:top">Attribution</td>
        <td style="padding:10px 0;color:#3a3a3a">${escapeHtml(leadData.source || 'direct')}</td>
      </tr>
    </table>
  </div>

  <div style="background:#f9f7f4;padding:16px;border:1px solid #e5dfd5;border-top:0;border-radius:0 0 12px 12px">
    <div style="display:flex;gap:10px;margin-bottom:12px">
      <a href="tel:${phone}" style="background:#b88924;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">📞 Call Now</a>
      ${email ? `<a href="mailto:${email}" style="background:#3a3a3a;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">📧 Reply Email</a>` : ''}
      <a href="https://wa.me/${safePhoneDigits}" style="background:#25d366;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px">💬 WhatsApp</a>
    </div>
    <p style="margin:0;font-size:11px;color:#999">
      Lead ID: ${leadId} · Received: ${new Date().toLocaleString('en-US', {timeZone: 'America/Los_Angeles'})} PT
      · IP: ${leadData.ip}
    </p>
  </div>
</body>
</html>
  `.trim();

  // === SEND NOTIFICATIONS VIA OUTBOX (durable delivery) ===
  // Owner Telegram alert already enqueued via processInbound → outbox.
  // Owner email and customer auto-responder also go through outbox for retry/DLQ.

  // Owner email via outbox (retries 5× with backoff)
  await enqueueOutboundJob('resend_owner', leadId, {
    subject: subjectLine,
    html: emailHtml,
    reply_to: email || undefined,
    lead_id: leadId,
    phone: safePhoneDigits,
    service_type: service
  }, `owner_email:${leadId}`).catch(err => {
    console.warn('[OUTBOX_OWNER_EMAIL_ENQUEUE_FAIL]', err.message);
    // Direct fallback if outbox table not available
    if (process.env.RESEND_API_KEY) {
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Handy & Friend Leads <leads@handyandfriend.com>',
          to: [process.env.OWNER_EMAIL || 'hello@handyandfriend.com'],
          subject: subjectLine,
          html: emailHtml,
          ...(email ? { reply_to: email } : {})
        })
      }).catch(() => {});
    }
  });

  // Customer auto-responder via outbox (retries 3× with backoff)
  if (email) {
    const customerHtml = buildCustomerAutoResponderHtml({ name, service, phone });
    await enqueueOutboundJob('resend_customer', leadId, {
      to: email,
      subject: `Your request has been received — Handy & Friend`,
      html: customerHtml,
      lead_id: leadId
    }, `customer_email:${leadId}`).catch(err => {
      console.warn('[OUTBOX_CUSTOMER_EMAIL_ENQUEUE_FAIL]', err.message);
      // Direct fallback
      sendCustomerAutoResponder({ leadId, name, email, service, phone }).catch(() => {});
    });
  }

  return res.status(200).json({
    success: true,
    mode: 'outbox',
    leadId
  });
}

async function insertLeadWithSchemaFallback(leadRecord) {
  const payload = { ...leadRecord };
  let attempt = await restInsert('leads', payload, { returning: false });
  const dropped = [];

  // Handle partial Supabase schemas by removing unknown columns one-by-one.
  while (!attempt.ok && !attempt.skipped) {
    const missingColumn = getMissingColumnFromPostgrestDetails(attempt.details);
    if (!missingColumn || !(missingColumn in payload)) break;
    delete payload[missingColumn];
    dropped.push(missingColumn);
    attempt = await restInsert('leads', payload, { returning: false });
  }

  if (dropped.length) {
    console.warn('[SUPABASE_SCHEMA_FALLBACK]', JSON.stringify({ dropped }));
  }

  return attempt;
}

function getMissingColumnFromPostgrestDetails(details) {
  const text = String(details || '');
  const match = text.match(/'([^']+)' column/);
  return match ? match[1] : '';
}

async function safeLogLeadEvent(leadId, eventType, eventPayload) {
  try {
    await logLeadEvent(leadId, eventType, eventPayload);
  } catch (err) {
    console.error('[LEAD_EVENT_LOG_ERROR]', eventType, err?.message || err);
  }
}

// Legacy notifyViaTelegram/notifyViaTelegramBestEffort removed — owner Telegram alerts
// are now enqueued via processInbound → enqueueSideEffects → outbox (with DLQ + retry).

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildShortSummary({ service, zip, message }) {
  const pieces = [];
  if (service) pieces.push(String(service));
  if (zip) pieces.push(`ZIP ${String(zip)}`);
  if (message) pieces.push(String(message).slice(0, 90));
  return pieces.join(' · ').slice(0, 200);
}

function buildFullSummary({ service, message, preferredContact, source }) {
  return [
    `Service: ${String(service || 'Not specified')}`,
    `Preferred contact: ${String(preferredContact || 'call')}`,
    `Source: ${String(source || 'direct')}`,
    `Problem: ${String(message || 'No message')}`
  ].join(' | ').slice(0, 1200);
}

/**
 * Send auto-responder email to the customer after form submission.
 * Only works when RESEND_API_KEY is configured and domain is verified.
 */
function buildCustomerAutoResponderHtml({ name, service, phone }) {
  const firstName = String(name || 'there').split(' ')[0] || 'there';
  const serviceName = String(service || 'your project');
  const safePhone = String(phone || '').replace(/\D/g, '');
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f7f4">
  <div style="background:#1a237e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">🔧 Handy & Friend</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Los Angeles Handyman Service</p>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5dfd5">
    <h2 style="color:#1a237e;font-size:20px;margin-top:0">Got your request, ${escapeHtml(firstName)}!</h2>
    <p style="font-size:15px;line-height:1.6;color:#333">
      Thanks for reaching out about <strong>${escapeHtml(serviceName)}</strong>.
      We've received your details and typically respond within <strong>1 hour</strong> during business hours (8am-8pm PT, Mon-Sat).
    </p>
    <h3 style="color:#1a237e;font-size:16px">What happens next:</h3>
    <ol style="font-size:14px;line-height:1.8;color:#333;padding-left:20px">
      <li>We review your project details</li>
      <li>You'll get a call or text with your exact price — no surprises</li>
      <li>We schedule at your convenience (same-day often available)</li>
    </ol>
    <div style="text-align:center;margin:24px 0">
      <a href="tel:+12133611700" style="display:inline-block;background:#1a237e;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">📞 Call Us: (213) 361-1700</a>
    </div>
    ${safePhone ? `<p style="text-align:center;font-size:14px;color:#666">Or text/WhatsApp: <a href="https://wa.me/12133611700" style="color:#1a237e">(213) 361-1700</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #e5dfd5;margin:24px 0">
    <p style="font-size:13px;color:#888;text-align:center">
      Insured · Upfront pricing · No hidden fees<br>
      <a href="https://handyandfriend.com" style="color:#1a237e">handyandfriend.com</a>
    </p>
  </div>
</body></html>`;
}

// Legacy direct sender — used as fallback when outbox table unavailable
async function sendCustomerAutoResponder({ leadId, name, email, service, phone }) {
  if (!process.env.RESEND_API_KEY || !email) return;

  const firstName = String(name || 'there').split(' ')[0] || 'there';
  const serviceName = String(service || 'your project');
  const safePhone = String(phone || '').replace(/\D/g, '');

  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9f7f4">
  <div style="background:#1a237e;padding:24px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">🔧 Handy & Friend</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px">Los Angeles Handyman Service</p>
  </div>
  <div style="background:#fff;padding:28px;border:1px solid #e5dfd5">
    <h2 style="color:#1a237e;font-size:20px;margin-top:0">Got your request, ${escapeHtml(firstName)}!</h2>
    <p style="font-size:15px;line-height:1.6;color:#333">
      Thanks for reaching out about <strong>${escapeHtml(serviceName)}</strong>.
      We've received your details and typically respond within <strong>1 hour</strong> during business hours (8am-8pm PT, Mon-Sat).
    </p>
    <h3 style="color:#1a237e;font-size:16px">What happens next:</h3>
    <ol style="font-size:14px;line-height:1.8;color:#333;padding-left:20px">
      <li>We review your project details</li>
      <li>You'll get a call or text with your exact price — no surprises</li>
      <li>We schedule at your convenience (same-day often available)</li>
    </ol>
    <div style="text-align:center;margin:24px 0">
      <a href="tel:+12133611700" style="display:inline-block;background:#1a237e;color:#fff;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px">📞 Call Us: (213) 361-1700</a>
    </div>
    ${safePhone ? `<p style="text-align:center;font-size:14px;color:#666">Or text/WhatsApp: <a href="https://wa.me/12133611700" style="color:#1a237e">(213) 361-1700</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #e5dfd5;margin:24px 0">
    <p style="font-size:13px;color:#888;text-align:center">
      Insured · Upfront pricing · No hidden fees<br>
      <a href="https://handyandfriend.com" style="color:#1a237e">handyandfriend.com</a>
    </p>
  </div>
</body></html>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Handy & Friend <hello@handyandfriend.com>',
        to: [email],
        subject: `Got your request — here's what happens next | Handy & Friend`,
        html: html,
        reply_to: 'hello@handyandfriend.com'
      })
    });
    if (resp.ok) {
      const data = await resp.json().catch(() => ({}));
      console.log('[AUTO_RESPONDER_SENT]', email);
      await safeLogLeadEvent(leadId, 'customer_email_sent', {
        provider: 'resend',
        email_id: data?.id || null,
        to: email
      });
    } else {
      const err = await resp.json().catch(() => ({}));
      console.error('[AUTO_RESPONDER_FAILED]', resp.status, err);
      await safeLogLeadEvent(leadId, 'customer_email_failed', {
        provider: 'resend',
        status: resp.status,
        to: email,
        error: String(err?.message || JSON.stringify(err) || 'autoresponder_failed').slice(0, 300)
      });
    }
  } catch (err) {
    console.error('[AUTO_RESPONDER_ERROR]', err.message);
    await safeLogLeadEvent(leadId, 'customer_email_failed', {
      provider: 'resend',
      to: email,
      error: String(err.message || 'autoresponder_error').slice(0, 300)
    });
  }
}
