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
const { createOrMergeLead, transitionLead, logEvent: pipelineLogEvent } = require('../lib/lead-pipeline.js');
const { normalizeAttribution, buildSourceDetails } = require('../lib/attribution.js');

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

  console.log('[LEAD_CAPTURED]', JSON.stringify(leadData));
  saveLeadContext(leadData).catch((err) => console.error('[LEAD_CONTEXT_ASYNC_ERROR]', err.message));

  // Create or merge lead using smart dedup
  let pipelineResult;
  let leadId;
  try {
    pipelineResult = await createOrMergeLead({
      name: String(name || 'Unknown'),
      email,
      phone,
      service_type: String(service || 'Not specified'),
      message: String(message || 'No message'),
      source: leadData.source,
      source_details: leadData.sourceDetails,
      zip: String(zip || ''),
      ga4ClientId: normalizedAttribution.ga4ClientId || ''
    });
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

  // === SEND EMAIL ===

  // OPTION 1: Resend API (recommended, free 3000/month)
  if (process.env.RESEND_API_KEY) {
    try {
      const resendPayload = {
        from: 'Handy & Friend Leads <leads@handyandfriend.com>',
        to: [process.env.OWNER_EMAIL || 'hello@handyandfriend.com'],
        subject: subjectLine,
        html: emailHtml
      };
      if (email) resendPayload.reply_to = email;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resendPayload)
      });

      if (!resendRes.ok) {
        const err = await resendRes.json().catch(() => ({}));
        console.error('[RESEND_ERROR]', resendRes.status, err);
        await safeLogLeadEvent(leadId, 'owner_email_failed', {
          provider: 'resend',
          status: resendRes.status,
          error: String(err?.message || JSON.stringify(err) || 'resend_error').slice(0, 300)
        });
        // Fall through to demo mode
      } else {
        const data = await resendRes.json();
        console.log('[RESEND_SENT]', data.id, 'to', process.env.OWNER_EMAIL || 'hello@handyandfriend.com');
        await safeLogLeadEvent(leadId, 'owner_email_sent', {
          provider: 'resend',
          email_id: data?.id || null,
          to: process.env.OWNER_EMAIL || 'hello@handyandfriend.com'
        });

        // Auto-responder: send confirmation to the customer (async, non-blocking)
        if (email) {
          sendCustomerAutoResponder({ leadId, name, email, service, phone }).catch(err =>
            console.error('[AUTO_RESPONDER_ERROR]', err.message)
          );
        }

        // Best-effort Telegram delivery (serverless-safe with timeout)
        await notifyViaTelegramBestEffort({ ...leadData, leadId });

        return res.status(200).json({
          success: true,
          mode: 'resend',
          leadId
        });
      }
    } catch (err) {
      console.error('[RESEND_FETCH_ERROR]', err.message);
      // Fall through to demo mode
    }
  }

  // OPTION 2: Sendgrid fallback
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sendgridPayload = {
        personalizations: [{ to: [{ email: process.env.OWNER_EMAIL || 'hello@handyandfriend.com' }] }],
        from: { email: 'leads@handyandfriend.com', name: 'Handy & Friend Leads' },
        subject: subjectLine,
        content: [{ type: 'text/html', value: emailHtml }]
      };
      if (email) sendgridPayload.reply_to = { email };

      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sendgridPayload)
      });

      if (sgRes.ok || sgRes.status === 202) {
        console.log('[SENDGRID_SENT] to', process.env.OWNER_EMAIL || 'hello@handyandfriend.com');
        await safeLogLeadEvent(leadId, 'owner_email_sent', {
          provider: 'sendgrid',
          status: sgRes.status,
          to: process.env.OWNER_EMAIL || 'hello@handyandfriend.com'
        });

        // Best-effort Telegram delivery (serverless-safe with timeout)
        await notifyViaTelegramBestEffort({ ...leadData, leadId });

        return res.status(200).json({ success: true, mode: 'sendgrid', leadId });
      }
    } catch (err) {
      console.error('[SENDGRID_ERROR]', err.message);
    }
  }

  // OPTION 3: Demo mode (no email sent — lead logged to console only)
  console.log('[DEMO_MODE] No email API configured. Lead logged only.');
  console.log('[DEMO_LEAD]', JSON.stringify(leadData, null, 2));

  // Best-effort Telegram delivery even in demo mode
  await notifyViaTelegramBestEffort({ ...leadData, leadId });

  return res.status(200).json({
    success: true,
    mode: 'demo',
    leadId,
    note: 'Lead captured. Add RESEND_API_KEY to Vercel env vars to receive email notifications.'
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

/**
 * Send lead notification via Telegram Bot (fire and forget, doesn't block main response)
 */
function notifyViaTelegram(leadData) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    return Promise.resolve(false); // Silently skip if not configured
  }

  const { leadId, name, phone, email, zip, preferredContact, service, message, attachments, attribution } = leadData;
  const safePhoneDigits = String(phone || '').replace(/\D/g, '');
  const displayName = String(name || 'there').trim() || 'there';
  const quickReplyEn = `Hi ${displayName}, thanks for your request. We can help with ${String(service || 'your project')}. What time works best today for a quick confirmation call?`;
  const quickReplyRu = `Здравствуйте, ${displayName}! Спасибо за заявку. Поможем с работой: ${String(service || 'ваш проект')}. Подскажите, когда вам удобно коротко созвониться сегодня?`;

  const waText = encodeURIComponent(quickReplyEn);
  const panelBase = `https://handyandfriend.com/r/one-tap/?leadId=${encodeURIComponent(String(leadId || ''))}&phone=${encodeURIComponent(safePhoneDigits)}`;
  const panelEn = `${panelBase}&lang=en&action=reply_en&text=${encodeURIComponent(quickReplyEn)}`;
  const panelRu = `${panelBase}&lang=ru&action=reply_ru&text=${encodeURIComponent(quickReplyRu)}`;

  const telegramMessage = `🔧 <b>NEW LEAD!</b>

<b>Name:</b> ${escapeHtml(name)}
<b>Phone:</b> <code>${escapeHtml(phone)}</code>
<b>Email:</b> ${escapeHtml(email || 'Not provided')}
<b>Service:</b> ${escapeHtml(service || 'General')}
<b>ZIP:</b> ${escapeHtml(zip || '—')}
<b>Preferred Contact:</b> ${escapeHtml(preferredContact || 'call')}
<b>Photos:</b> ${Array.isArray(attachments) ? attachments.length : 0}

<b>Message:</b>
${escapeHtml(message || '—')}

<b>Attribution:</b> <code>${escapeHtml((attribution && attribution.summary) || leadData.source || 'direct')}</code>

<b>Lead ID:</b> <code>${leadId}</code>
<b>CTX:</b> <code>CTX:${leadId}:${phone}</code>
<b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PT

<b>Quick Reply EN:</b>
<code>${escapeHtml(quickReplyEn)}</code>

<b>Quick Reply RU:</b>
<code>${escapeHtml(quickReplyRu)}</code>

${email ? `<a href="tel:${phone}">📞 Call</a> • <a href="https://wa.me/${safePhoneDigits}">💬 WhatsApp</a> • <a href="mailto:${email}">📧 Email</a>` : `<a href="tel:${phone}">📞 Call</a> • <a href="https://wa.me/${safePhoneDigits}">💬 WhatsApp</a>`}`;

  // URL-only buttons work without Telegram webhook handling.
  const keyboardRows = [];
  keyboardRows.push([
    { text: '📝 Reply EN', url: panelEn },
    { text: '📝 Reply RU', url: panelRu }
  ]);
  if (safePhoneDigits) {
    keyboardRows.push([{ text: '💬 WhatsApp', url: `https://wa.me/${safePhoneDigits}?text=${waText}` }]);
  }
  keyboardRows.push([{ text: '🧩 One-Tap Panel', url: panelEn }]);

  const replyMarkup = { inline_keyboard: keyboardRows };

  // Non-blocking fetch to Telegram API
  return fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: telegramMessage,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: replyMarkup
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        console.log('[TELEGRAM_SENT]', data.result.message_id, 'Lead ID:', leadId);
        logLeadEvent(leadId, 'telegram_sent', {
          message_id: data.result.message_id || null
        }).catch(() => {});
      } else {
        console.error('[TELEGRAM_ERROR]', data.error_code, data.description);
        logLeadEvent(leadId, 'telegram_failed', {
          error_code: data.error_code || null,
          description: String(data.description || '').slice(0, 240)
        }).catch(() => {});
      }
    })
    .catch(err => {
      console.error('[TELEGRAM_FETCH_ERROR]', err.message);
      logLeadEvent(leadId, 'telegram_failed', {
        error: String(err.message || 'telegram_fetch_error').slice(0, 240)
      }).catch(() => {});
      return false;
    });
}

async function notifyViaTelegramBestEffort(leadData, timeoutMs = 1500) {
  try {
    await Promise.race([
      Promise.resolve(notifyViaTelegram(leadData)),
      new Promise((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  } catch (err) {
    console.error('[TELEGRAM_BEST_EFFORT_ERROR]', err.message || err);
  }
}

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
