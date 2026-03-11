/**
 * SLA Escalation Cron — runs every 5 minutes via Vercel Cron
 *
 * Checks for leads in stage=new that haven't been contacted.
 * Sends Telegram escalation alerts at 5, 15, and 30 minute thresholds.
 *
 * Vercel Cron config in vercel.json:
 *   { "path": "/api/cron/sla-escalation", "schedule": "*/5 * * * *" }
 *
 * Required ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * Optional ENV: CRON_SECRET (to protect endpoint from unauthorized calls)
 */

export default async function handler(req, res) {
  // Verify cron secret if configured (Vercel sends Authorization header)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';

  if (!supabaseUrl || !supabaseKey || !telegramToken || !telegramChatId) {
    return res.status(500).json({ error: 'Missing required env vars' });
  }

  const headers = {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: 'application/json'
  };

  try {
    // Find leads in stage=new that are older than 5 minutes and NOT test
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get all leads that are stage=new, not test, created in last 24h
    const url = `${supabaseUrl}/rest/v1/leads?select=id,full_name,phone,service_type,created_at,stage&stage=eq.new&is_test=eq.false&created_at=gte.${twentyFourHoursAgo}&order=created_at.asc`;
    const resp = await fetch(url, { method: 'GET', headers });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[SLA_CRON] Supabase query failed:', resp.status, text);
      return res.status(500).json({ error: 'Supabase query failed' });
    }

    const staleLeads = await resp.json();

    if (!staleLeads.length) {
      return res.status(200).json({ ok: true, stale: 0, alerts_sent: 0 });
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
    const uncontacted = staleLeads.filter(l => !contactedLeadIds.has(l.id));

    if (!uncontacted.length) {
      return res.status(200).json({ ok: true, stale: staleLeads.length, contacted: contactedLeadIds.size, alerts_sent: 0 });
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
        // Check if 30-min alert already sent
        const check30 = await checkEventExists(supabaseUrl, headers, lead.id, 'sla_escalation_30');
        if (!check30) {
          level = '30 MIN — REVENUE AT RISK';
          emoji = '🚨';
          eventType = 'sla_escalation_30';
        }
      } else if (ageMs >= 15 * 60 * 1000) {
        const check15 = await checkEventExists(supabaseUrl, headers, lead.id, 'sla_escalation_15');
        if (!check15) {
          level = '15 MIN — CRITICAL';
          emoji = '🔴';
          eventType = 'sla_escalation_15';
        }
      } else if (ageMs >= 5 * 60 * 1000) {
        const check5 = await checkEventExists(supabaseUrl, headers, lead.id, 'sla_escalation_5');
        if (!check5) {
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
      await logEvent(supabaseUrl, headers, lead.id, eventType, {
        age_min: ageMin,
        telegram_ok: tgData.ok || false,
        message_id: tgData.result?.message_id || null
      });

      if (tgData.ok) alertsSent++;
      console.log(`[SLA_CRON] ${eventType} for ${lead.id} (${ageMin}min) — telegram: ${tgData.ok ? 'sent' : 'failed'}`);
    }

    return res.status(200).json({
      ok: true,
      stale: staleLeads.length,
      uncontacted: uncontacted.length,
      alerts_sent: alertsSent
    });
  } catch (err) {
    console.error('[SLA_CRON] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

async function checkEventExists(supabaseUrl, headers, leadId, eventType) {
  const url = `${supabaseUrl}/rest/v1/lead_events?select=id&lead_id=eq.${leadId}&event_type=eq.${eventType}&limit=1`;
  const resp = await fetch(url, { method: 'GET', headers });
  if (!resp.ok) return false;
  const rows = await resp.json();
  return rows.length > 0;
}

async function logEvent(supabaseUrl, headers, leadId, eventType, payload) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/lead_events`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        lead_id: leadId,
        event_type: eventType,
        event_payload: payload
      })
    });
  } catch (err) {
    console.error('[SLA_CRON] logEvent failed:', err.message);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
