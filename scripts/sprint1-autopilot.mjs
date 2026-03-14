#!/usr/bin/env node
/**
 * Sprint Autopilot:
 * 1) Reactivation packet for highest-priority stale/open lead.
 * 2) Review request push for up to 3 won leads.
 * 3) Review follow-up packet for won leads with no review after 3+ days.
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
  OWNER_EMAIL: clean(process.env.OWNER_EMAIL || process.env.REPORT_EMAIL_TO || 'hello@handyandfriend.com'),
};

const REVIEW_URL = 'https://handyandfriend.com/review';
const REACTIVATION_COOLDOWN_HOURS = 6;
const REVIEW_FOLLOWUP_DAYS = 3;
const CONTACT_EVENT_TYPES = new Set(['status_contacted', 'stage_contacted', 'owner_email_sent', 'telegram_sent']);

function toMs(v) {
  const n = new Date(v || '').getTime();
  return Number.isFinite(n) ? n : 0;
}

function hoursSince(v) {
  const ms = toMs(v);
  if (!ms) return Number.POSITIVE_INFINITY;
  return (Date.now() - ms) / (1000 * 60 * 60);
}

function daysSince(v) {
  return hoursSince(v) / 24;
}

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

function getServiceMeta(serviceRaw) {
  const key = String(serviceRaw || '').toLowerCase().trim();
  const map = {
    cabinet_painting: { label: 'cabinet painting', price: '$75/door' },
    kitchen_cabinet_painting: { label: 'cabinet painting', price: '$75/door' },
    tv_mounting: { label: 'TV mounting', price: '$105' },
    tv_mounting_hidden: { label: 'TV mounting with hidden wires', price: '$185' },
    mirrors: { label: 'art & mirror hanging', price: '$95' },
    art_hanging: { label: 'art & mirror hanging', price: '$95' },
    furniture_assembly: { label: 'furniture assembly', price: '$75' },
    interior_painting: { label: 'interior painting', price: '$3.00/sq ft' },
    flooring: { label: 'flooring installation', price: '$3.00/sq ft' },
    flooring_lvp: { label: 'LVP flooring installation', price: '$3.00/sq ft' },
    plumbing: { label: 'minor plumbing repair', price: '$115' },
    faucet_install: { label: 'faucet installation', price: '$115' },
    electrical: { label: 'electrical fixture service', price: '$95' },
    light_install: { label: 'light fixture installation', price: '$95' },
    curtain_rods: { label: 'curtain rod installation', price: '$75' },
    smart_device: { label: 'smart device installation', price: '$95' }
  };
  return map[key] || { label: key.replace(/_/g, ' ') || 'your project', price: '' };
}

function buildReactivationText(lead, mode = 'initial') {
  const meta = getServiceMeta(lead?.service_type);
  if (mode === 'followup') {
    return `Hi! Sergii from Handy & Friend following up on your ${meta.label} request.

I can hold a time slot this week for you.${meta.price ? ` Current pricing starts at ${meta.price}.` : ''}

If you still want the quote, just reply to this message or call/text (213) 361-1700.

— Sergii`;
  }
  return `Hi there! This is Sergii from Handy & Friend. You reached out about ${meta.label} — are you still looking for help with that?

I have availability this week.${meta.price ? ` ${meta.label[0].toUpperCase() + meta.label.slice(1)} starts at ${meta.price}.` : ''}

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
    `leads?select=id,full_name,phone,email,service_type,stage,is_test,created_at,updated_at&is_test=eq.false&stage=in.(new,contacted)&order=created_at.asc&limit=200`
  );
  if (!rows.length) return null;
  const ids = rows.map((r) => r.id);
  const ev = await sbGet(
    `lead_events?select=lead_id,event_type,created_at&lead_id=in.(${ids.join(',')})&order=created_at.desc&limit=500`
  );
  const byLead = new Map();
  for (const e of ev) {
    if (!byLead.has(e.lead_id)) byLead.set(e.lead_id, []);
    byLead.get(e.lead_id).push(e);
  }

  const ranked = rows
    .filter((r) => normalizePhoneDigits(r.phone))
    .map((r) => {
      const events = byLead.get(r.id) || [];
      const hasContact = events.some((e) => CONTACT_EVENT_TYPES.has(e.event_type));
      const lastReactivation = events
        .filter((e) => e.event_type === 'reactivation_attempt_prepared' || e.event_type === 'reactivation_followup_prepared')
        .sort((a, b) => toMs(b.created_at) - toMs(a.created_at))[0];
      const lastReactivationHours = lastReactivation ? hoursSince(lastReactivation.created_at) : Number.POSITIVE_INFINITY;
      const ageHours = hoursSince(r.created_at);
      const stage = String(r.stage || 'new').toLowerCase();
      let rank = 4;
      if (stage === 'new' && !hasContact) rank = 1;
      else if (stage === 'new') rank = 2;
      else if (stage === 'contacted') rank = 3;
      return { lead: r, events, rank, ageHours, hasContact, lastReactivationHours };
    })
    .sort((a, b) => (a.rank - b.rank) || (b.ageHours - a.ageHours));

  return ranked[0] || null;
}

async function findReviewTargets(limit = 3) {
  const rows = await sbGet(
    `leads?select=id,full_name,phone,email,service_type,stage,outcome,is_test,updated_at,created_at&is_test=eq.false&stage=eq.closed&outcome=eq.won&order=updated_at.desc&limit=25`
  );
  if (!rows.length) return { fresh: [], followup: [] };

  const ids = rows.map((r) => r.id);
  const ev = await sbGet(
    `lead_events?select=lead_id,event_type,created_at&lead_id=in.(${ids.join(',')})&order=created_at.desc&limit=500`
  );
  const byLead = new Map();
  for (const e of ev || []) {
    if (!byLead.has(e.lead_id)) byLead.set(e.lead_id, []);
    byLead.get(e.lead_id).push(e);
  }

  const fresh = [];
  const followup = [];

  for (const lead of rows) {
    const events = byLead.get(lead.id) || [];
    const lastReviewSent = events
      .filter((e) => e.event_type === 'review_request_sent')
      .sort((a, b) => toMs(b.created_at) - toMs(a.created_at))[0];
    const hasReviewPosted = events.some((e) => e.event_type === 'review_posted');
    const hasFollowup = events.some((e) => e.event_type === 'review_followup_prepared');

    if (!lastReviewSent) {
      fresh.push(lead);
      continue;
    }
    if (!hasReviewPosted && !hasFollowup && daysSince(lastReviewSent.created_at) >= REVIEW_FOLLOWUP_DAYS) {
      followup.push(lead);
    }
  }

  return { fresh: fresh.slice(0, limit), followup: followup.slice(0, limit) };
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
    reactivation: { found: false, lead_id: null, mode: null, telegram_sent: false, owner_email_sent: false, event_logged: false },
    reviews: {
      targets_fresh: 0,
      targets_followup: 0,
      emails_sent: 0,
      sms_manual: 0,
      owner_email_sent: 0,
      events_logged: 0,
      errors: []
    },
  };

  const reactivationTarget = await findLostLead();
  if (reactivationTarget?.lead) {
    const lostLead = reactivationTarget.lead;
    summary.reactivation.found = true;
    summary.reactivation.lead_id = lostLead.id;
    const isFollowup = reactivationTarget.lastReactivationHours < Number.POSITIVE_INFINITY;
    const mode = isFollowup ? 'followup' : 'initial';
    summary.reactivation.mode = mode;

    if (reactivationTarget.lastReactivationHours < REACTIVATION_COOLDOWN_HOURS) {
      summary.reactivation.skipped = `cooldown_${Math.floor(REACTIVATION_COOLDOWN_HOURS - reactivationTarget.lastReactivationHours)}h`;
      console.log(`[sprint1] Reactivation cooldown active for ${lostLead.id}, skipping`);
    } else {
      const text = buildReactivationText(lostLead, mode);
      const phoneDigits = normalizePhoneDigits(lostLead.phone);
      const waLink = phoneDigits ? `https://wa.me/1${phoneDigits}?text=${encodeURIComponent(text)}` : null;
      const smsLink = phoneDigits ? `sms:+1${phoneDigits}&body=${encodeURIComponent(text)}` : null;

      const tg = [
        `🔥 <b>${mode === 'followup' ? 'Reactivation Follow-up' : 'Sprint Reactivation'} — READY NOW</b>`,
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
          `${mode === 'followup' ? 'Reactivation Follow-up' : 'Sprint Reactivation'} Packet`,
          `<pre style="white-space:pre-wrap;font-family:ui-monospace,Menlo,monospace">${tg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`
        );
        summary.reactivation.owner_email_sent = Boolean(emailResult?.ok);
        if (!emailResult?.ok) {
          summary.reviews.errors.push({ lead_id: lostLead.id, error: `reactivation_owner_email_failed:${emailResult?.status || emailResult?.reason || 'unknown'}` });
        }
      }

      await logLeadEvent(lostLead.id, mode === 'followup' ? 'reactivation_followup_prepared' : 'reactivation_attempt_prepared', {
        channel: 'telegram_handoff',
        phone: lostLead.phone || null,
        mode,
        prepared_at: new Date().toISOString(),
      });
      summary.reactivation.event_logged = true;
    } // end dedup else
  }

  const reviewTargets = await findReviewTargets(3);
  summary.reviews.targets_fresh = reviewTargets.fresh.length;
  summary.reviews.targets_followup = reviewTargets.followup.length;

  const combinedTargets = [
    ...reviewTargets.fresh.map((lead) => ({ lead, kind: 'fresh' })),
    ...reviewTargets.followup.map((lead) => ({ lead, kind: 'followup' })),
  ];

  for (const item of combinedTargets) {
    const lead = item.lead;
    const kind = item.kind;
    try {
      const emailResult = await sendReviewEmail(lead);
      let channel = 'sms_manual';
      if (emailResult.sent) {
        summary.reviews.emails_sent += 1;
        channel = 'email';
      } else {
        summary.reviews.sms_manual += 1;
      }

      const smsText = kind === 'followup'
        ? `${buildReviewSms(lead)} Just a gentle follow-up in case you missed my first message.`
        : buildReviewSms(lead);
      const phoneDigits = normalizePhoneDigits(lead.phone);
      const waLink = phoneDigits ? `https://wa.me/1${phoneDigits}?text=${encodeURIComponent(smsText)}` : null;

      const tgResult = await sendTelegramHtml(
        [
          `📝 <b>${kind === 'followup' ? 'Review Follow-up Packet' : 'Review Request Packet'}</b>`,
          `<b>Lead:</b> ${lead.full_name || 'Unknown'} (${lead.phone || 'no phone'})`,
          `<b>Service:</b> ${lead.service_type || 'unknown'}`,
          `<b>Channel:</b> ${channel}`,
          `<b>Mode:</b> ${kind}`,
          lead.email ? `<b>Email:</b> ${lead.email}` : '',
          '',
          '<b>SMS fallback text:</b>',
          `<code>${smsText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>`,
          waLink ? `<a href="${waLink}">Open WhatsApp (prefilled)</a>` : '',
        ].filter(Boolean).join('\n')
      );
      if (!tgResult?.ok) {
        const emailResult = await sendOwnerEmail(
          `${kind === 'followup' ? 'Review Follow-up Packet' : 'Review Request Packet'}: ${lead.full_name || lead.id}`,
          [
            `<p><b>Lead:</b> ${lead.full_name || 'Unknown'} (${lead.phone || 'no phone'})</p>`,
            `<p><b>Service:</b> ${lead.service_type || 'unknown'}</p>`,
            `<p><b>Channel:</b> ${channel}</p>`,
            `<p><b>Mode:</b> ${kind}</p>`,
            `<p><b>SMS fallback:</b><br/>${smsText}</p>`,
          ].join('\n')
        );
        if (emailResult?.ok) {
          summary.reviews.owner_email_sent += 1;
        } else {
          summary.reviews.errors.push({ lead_id: lead.id, error: `telegram_and_email_failed:${emailResult?.status || emailResult?.reason || 'unknown'}` });
        }
      }

      await logLeadEvent(lead.id, kind === 'followup' ? 'review_followup_prepared' : 'review_request_sent', {
        channel,
        mode: kind,
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
