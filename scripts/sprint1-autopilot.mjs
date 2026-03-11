#!/usr/bin/env node
/**
 * Sprint 1 Autopilot:
 * 1) Reactivation packet for stale lead 310-663-5792
 * 2) Review request push for up to 3 recently won leads
 *
 * Uses: Supabase REST + Resend + Telegram
 */

function clean(v) {
  return String(v || '').trim().replace(/\\n$/, '');
}

const ENV = {
  SUPABASE_URL: clean(process.env.SUPABASE_URL).replace(/\/$/, ''),
  SUPABASE_SERVICE_ROLE_KEY: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  RESEND_API_KEY: clean(process.env.RESEND_API_KEY),
  TELEGRAM_BOT_TOKEN: clean(process.env.TELEGRAM_BOT_TOKEN),
  TELEGRAM_CHAT_ID: clean(process.env.TELEGRAM_CHAT_ID),
  OWNER_PHONE: clean(process.env.OWNER_PHONE || '2133611700'),
  OWNER_EMAIL: clean(process.env.OWNER_EMAIL || process.env.REPORT_EMAIL_TO || '2133611700c@gmail.com'),
};

const REVIEW_URL = 'https://handyandfriend.com/review';
const LOST_LEAD_PHONE = '3106635792';

function assertEnv() {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'];
  const missing = required.filter((k) => !ENV[k]);
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`);
  }
}

function headers(json = true) {
  const h = {
    apikey: ENV.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
    Accept: 'application/json',
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function sbGet(path) {
  const resp = await fetch(`${ENV.SUPABASE_URL}/rest/v1/${path}`, { headers: headers(false) });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase GET ${path} failed: ${resp.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : [];
}

async function sbInsert(table, body) {
  const resp = await fetch(`${ENV.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers(true), Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`Supabase INSERT ${table} failed: ${resp.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : [];
}

async function sendTelegramHtml(html) {
  if (!ENV.TELEGRAM_BOT_TOKEN || !ENV.TELEGRAM_CHAT_ID) return { ok: false, skipped: true };
  const resp = await fetch(`https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ENV.TELEGRAM_CHAT_ID,
      text: html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  const json = await resp.json().catch(() => ({}));
  if (!json.ok) {
    return { ok: false, error: json };
  }
  return json;
}

async function sendOwnerEmail(subject, html) {
  if (!ENV.RESEND_API_KEY || !ENV.OWNER_EMAIL) return { ok: false, reason: 'resend_or_owner_missing' };
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Handy & Friend Ops <hello@handyandfriend.com>',
      to: ENV.OWNER_EMAIL,
      subject,
      html,
    }),
  });
  const text = await resp.text().catch(() => '');
  if (!resp.ok) return { ok: false, status: resp.status, detail: text.slice(0, 300) };
  return { ok: true };
}

async function sendReviewEmail(lead) {
  if (!ENV.RESEND_API_KEY || !lead.email) return { sent: false, reason: 'missing_resend_or_email' };
  const firstName = (lead.full_name || '').split(' ')[0] || 'there';
  const service = lead.service_type || 'your project';

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Handy & Friend <hello@handyandfriend.com>',
      to: lead.email,
      subject: 'Quick favor? 30-second Google review',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
          <p>Hi ${firstName},</p>
          <p>Thank you for choosing Handy & Friend for your <b>${service}</b>.</p>
          <p>If you have 30 seconds, we'd really appreciate a quick Google review:</p>
          <p><a href="${REVIEW_URL}">${REVIEW_URL}</a></p>
          <p>Thank you,<br/>Sergii<br/>Handy & Friend<br/>(213) 361-1700</p>
        </div>`,
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    return { sent: false, reason: `resend_${resp.status}`, detail: txt.slice(0, 200) };
  }
  return { sent: true };
}

function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function buildReactivationText() {
  return `Hi there! This is Sergii from Handy & Friend. You reached out about cabinet painting — are you still looking for help with that?

I have availability this week. Cabinet painting starts at $75/door, paint included.

Just reply here or call/text (213) 361-1700 for a free estimate!

— Sergii`;
}

function buildReviewSms(lead) {
  const firstName = (lead.full_name || '').split(' ')[0] || '';
  const greet = firstName ? `Hi ${firstName}! ` : 'Hi! ';
  return `${greet}Thanks again for choosing Handy & Friend. If you have 30 seconds, a Google review helps us a lot: ${REVIEW_URL}`;
}

async function findLostLead() {
  const rows = await sbGet(
    `leads?select=id,full_name,phone,email,service_type,stage,is_test,created_at&is_test=eq.false&stage=eq.new&order=created_at.asc&limit=200`
  );
  return rows.find((r) => normalizePhoneDigits(r.phone).endsWith(LOST_LEAD_PHONE)) || null;
}

async function findReviewTargets(limit = 3) {
  const rows = await sbGet(
    `leads?select=id,full_name,phone,email,service_type,stage,outcome,is_test,updated_at,created_at&is_test=eq.false&stage=eq.closed&outcome=eq.won&order=updated_at.desc&limit=25`
  );
  if (!rows.length) return [];

  const ids = rows.map((r) => r.id);
  const ev = await sbGet(
    `lead_events?select=lead_id,event_type&event_type=eq.review_request_sent&lead_id=in.(${ids.join(',')})`
  );
  const seen = new Set((ev || []).map((x) => x.lead_id));
  return rows.filter((r) => !seen.has(r.id)).slice(0, limit);
}

async function logLeadEvent(leadId, type, payload = {}) {
  await sbInsert('lead_events', {
    lead_id: leadId,
    event_type: type,
    event_payload: payload,
  });
}

async function main() {
  assertEnv();

  const summary = {
    ts: new Date().toISOString(),
    reactivation: { found: false, lead_id: null, telegram_sent: false, owner_email_sent: false, event_logged: false },
    reviews: { targets: 0, emails_sent: 0, sms_manual: 0, owner_email_sent: 0, events_logged: 0, errors: [] },
  };

  const lostLead = await findLostLead();
  if (lostLead) {
    summary.reactivation.found = true;
    summary.reactivation.lead_id = lostLead.id;

    const text = buildReactivationText();
    const phoneDigits = normalizePhoneDigits(lostLead.phone);
    const waLink = phoneDigits ? `https://wa.me/1${phoneDigits}?text=${encodeURIComponent(text)}` : null;
    const smsLink = phoneDigits ? `sms:+1${phoneDigits}&body=${encodeURIComponent(text)}` : null;

    const tg = [
      '🔥 <b>Sprint 1 Reactivation — READY NOW</b>',
      `<b>Lead:</b> ${lostLead.full_name || 'Unknown'} (${lostLead.phone || 'no phone'})`,
      `<b>Service:</b> ${lostLead.service_type || 'unknown'}`,
      `<b>Lead ID:</b> <code>${lostLead.id}</code>`,
      '',
      '<b>Message:</b>',
      `<code>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`,
      '',
      waLink ? `<a href="${waLink}">Open WhatsApp (prefilled)</a>` : '',
      smsLink ? `<a href="${smsLink}">Open SMS (prefilled)</a>` : '',
    ].filter(Boolean).join('\n');

    const tgResult = await sendTelegramHtml(tg);
    summary.reactivation.telegram_sent = Boolean(tgResult?.ok);
    if (!tgResult?.ok) {
      const emailResult = await sendOwnerEmail(
        'Sprint 1 Reactivation Packet',
        `<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace">${tg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
      );
      summary.reactivation.owner_email_sent = Boolean(emailResult?.ok);
      if (!emailResult?.ok) {
        summary.reviews.errors.push({ lead_id: lostLead.id, error: `owner_email_failed:${emailResult?.status || emailResult?.reason || 'unknown'}` });
      }
    }

    await logLeadEvent(lostLead.id, 'reactivation_attempt_prepared', {
      channel: 'telegram_handoff',
      phone: lostLead.phone || null,
      prepared_at: new Date().toISOString(),
    });
    summary.reactivation.event_logged = true;
  }

  const reviewTargets = await findReviewTargets(3);
  summary.reviews.targets = reviewTargets.length;

  for (const lead of reviewTargets) {
    try {
      const emailResult = await sendReviewEmail(lead);
      let channel = 'sms_manual';
      if (emailResult.sent) {
        summary.reviews.emails_sent += 1;
        channel = 'email';
      } else {
        summary.reviews.sms_manual += 1;
      }

      const smsText = buildReviewSms(lead);
      const phoneDigits = normalizePhoneDigits(lead.phone);
      const waLink = phoneDigits ? `https://wa.me/1${phoneDigits}?text=${encodeURIComponent(smsText)}` : null;

      const tgResult = await sendTelegramHtml(
        [
          '📝 <b>Review Request Packet</b>',
          `<b>Lead:</b> ${lead.full_name || 'Unknown'} (${lead.phone || 'no phone'})`,
          `<b>Service:</b> ${lead.service_type || 'unknown'}`,
          `<b>Channel:</b> ${channel}`,
          lead.email ? `<b>Email:</b> ${lead.email}` : '',
          '',
          '<b>SMS fallback text:</b>',
          `<code>${smsText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`,
          waLink ? `<a href="${waLink}">Open WhatsApp (prefilled)</a>` : '',
        ].filter(Boolean).join('\n')
      );
      if (!tgResult?.ok) {
        const emailResult = await sendOwnerEmail(
          `Review Request Packet: ${lead.full_name || lead.id}`,
          [
            `<p><b>Lead:</b> ${lead.full_name || 'Unknown'} (${lead.phone || 'no phone'})</p>`,
            `<p><b>Service:</b> ${lead.service_type || 'unknown'}</p>`,
            `<p><b>Channel:</b> ${channel}</p>`,
            `<p><b>SMS fallback:</b><br/>${smsText}</p>`,
          ].join('\n')
        );
        if (emailResult?.ok) {
          summary.reviews.owner_email_sent += 1;
        } else {
          summary.reviews.errors.push({ lead_id: lead.id, error: `telegram_and_email_failed:${emailResult?.status || emailResult?.reason || 'unknown'}` });
        }
      }

      await logLeadEvent(lead.id, 'review_request_sent', {
        channel,
        email: lead.email || null,
        phone: lead.phone || null,
        sent_at: new Date().toISOString(),
      });
      summary.reviews.events_logged += 1;
    } catch (err) {
      summary.reviews.errors.push({ lead_id: lead.id, error: String(err.message || err) });
    }
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('[sprint1-autopilot] fatal:', err.message);
  process.exit(1);
});
