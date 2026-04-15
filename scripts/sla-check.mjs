#!/usr/bin/env node
/**
 * SLA Escalation Check — runs every 5 minutes via GitHub Actions
 *
 * Checks for leads in stage=new that haven't been contacted.
 * Sends Telegram escalation alerts at 5, 15, and 30 minute thresholds.
 *
 * Required ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';

if (!supabaseUrl || !supabaseKey || !telegramToken || !telegramChatId) {
  console.error('[SLA] Missing required env vars');
  process.exit(1);
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  Accept: 'application/json'
};

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hasValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10;
}

async function checkEventExists(leadId, eventType) {
  const url = `${supabaseUrl}/rest/v1/lead_events?select=id&lead_id=eq.${leadId}&event_type=eq.${eventType}&limit=1`;
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) return false;
  const rows = await resp.json();
  return rows.length > 0;
}

async function logEvent(leadId, eventType, payload) {
  try {
    const resp = await fetch(`${supabaseUrl}/rest/v1/lead_events`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        lead_id: leadId,
        event_type: eventType,
        event_data: payload,
        created_by: 'sla-check'
      })
    });
    if (!resp.ok) {
      const body = await resp.text();
      console.error('[SLA] logEvent failed response:', resp.status, body);
    }
  } catch (err) {
    console.error('[SLA] logEvent failed:', err.message);
  }
}

async function main() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get all leads that are stage=new, not test, created in last 24h
  const url = `${supabaseUrl}/rest/v1/leads?select=id,full_name,phone,service_type,created_at,stage,status,is_test,source,channel,attribution_source,problem_description&stage=eq.new&is_test=eq.false&created_at=gte.${twentyFourHoursAgo}&order=created_at.asc`;
  const resp = await fetch(url, { method: 'GET', headers });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('[SLA] Supabase query failed:', resp.status, text);
    process.exit(1);
  }

  const staleLeads = await resp.json();

  if (!staleLeads.length) {
    console.log('[SLA] No stale leads. All clear.');
    return;
  }

  // Check which leads already have contact events (to avoid false alerts)
  const contactedLeadIds = new Set();
  for (const lead of staleLeads) {
    const eventsUrl = `${supabaseUrl}/rest/v1/lead_events?select=id&lead_id=eq.${lead.id}&event_type=in.(status_contacted,stage_contacted,telegram_sent,owner_email_sent,sla_escalation_30)&limit=1`;
    const evResp = await fetch(eventsUrl, { method: 'GET', headers });
    if (evResp.ok) {
      const events = await evResp.json();
      if (events.length > 0) contactedLeadIds.add(lead.id);
    }
  }

  // Filter to truly uncontacted leads
  const uncontacted = staleLeads.filter((l) => {
    if (contactedLeadIds.has(l.id)) return false;
    if (!hasValidPhone(l.phone)) return false;
    const nm = String(l.full_name || '').toLowerCase();
    const src = String(l.source || '').toLowerCase();
    const ch = String(l.channel || '').toLowerCase();
    const attr = String(l.attribution_source || '').toLowerCase();
    const problem = String(l.problem_description || '').toLowerCase();
    if (String(l.id || '').startsWith('social_')) return false;
    if (nm.includes('synthetic') || nm.includes('test')) return false;
    if (problem.includes('synthetic') || problem.includes('[e2e-synthetic]')) return false;
    if (src === 'facebook' || src === 'nextdoor' || src === 'craigslist' || src === 'social') return false;
    if (ch.includes('social')) return false;
    if (attr.startsWith('social_leads:')) return false;
    return true;
  });

  if (!uncontacted.length) {
    console.log(`[SLA] ${staleLeads.length} stale leads, all contacted. No alerts needed.`);
    return;
  }

  let alertsSent = 0;

  for (const lead of uncontacted) {
    const ageMs = Date.now() - new Date(lead.created_at).getTime();
    const ageMin = Math.round(ageMs / 60000);

    // Determine escalation level
    let level = null;
    let emoji = '';
    let eventType = '';

    if (ageMs >= 30 * 60 * 1000) {
      const exists = await checkEventExists(lead.id, 'sla_escalation_30');
      if (!exists) {
        level = '30 MIN — REVENUE AT RISK';
        emoji = '🚨';
        eventType = 'sla_escalation_30';
      }
    } else if (ageMs >= 15 * 60 * 1000) {
      const exists = await checkEventExists(lead.id, 'sla_escalation_15');
      if (!exists) {
        level = '15 MIN — CRITICAL';
        emoji = '🔴';
        eventType = 'sla_escalation_15';
      }
    } else if (ageMs >= 5 * 60 * 1000) {
      const exists = await checkEventExists(lead.id, 'sla_escalation_5');
      if (!exists) {
        level = '5 MIN — CALL NOW';
        emoji = '⚠️';
        eventType = 'sla_escalation_5';
      }
    }

    if (!level) continue;

    // Send Telegram alert
    const phone = lead.phone || 'no phone';
    const service = (lead.service_type || 'unknown').replace(/_/g, ' ');
    const name = lead.full_name || 'Unknown';
    const safePhone = String(phone).replace(/\D/g, '');

    const message = `${emoji} <b>SLA ESCALATION: ${level}</b>\n\n` +
      `<b>Lead:</b> ${escapeHtml(name)}\n` +
      `<b>Phone:</b> <code>${escapeHtml(phone)}</code>\n` +
      `<b>Service:</b> ${escapeHtml(service)}\n` +
      `<b>Age:</b> ${ageMin} min\n` +
      `<b>Lead ID:</b> <code>${lead.id}</code>\n\n` +
      `<a href="tel:${phone}">📞 Call</a>` +
      (safePhone ? ` • <a href="https://wa.me/${safePhone}">💬 WhatsApp</a>` : '');

    const tgResp = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const tgData = await tgResp.json().catch(() => ({}));

    // Log escalation event (prevents re-alerting)
    await logEvent(lead.id, eventType, {
      age_min: ageMin,
      telegram_ok: tgData.ok || false,
      message_id: tgData.result?.message_id || null
    });

    if (tgData.ok) alertsSent++;
    console.log(`[SLA] ${eventType} for ${lead.id} (${ageMin}min) — telegram: ${tgData.ok ? 'sent' : 'failed'}`);
  }

  console.log(`[SLA] Done. Stale: ${staleLeads.length}, Uncontacted: ${uncontacted.length}, Alerts sent: ${alertsSent}`);
}

main().catch(err => {
  console.error('[SLA] Fatal error:', err.message);
  process.exit(1);
});
