/**
 * Unified Telegram Alert Formats
 *
 * ALL owner Telegram messages use these functions. No exceptions.
 * Every alert looks identical regardless of which channel produced the lead.
 * Uses HTML parse_mode (consistent with existing outbox dispatcher).
 */

'use strict';

// ─── Escape HTML for Telegram HTML parse_mode ────────────────────────────────

function esc(s) {
  return String(s || '').replace(/[<>&"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;'
  }[c]));
}

// ─── Source metadata ──────────────────────────────────────────────────────────

const SOURCE_EMOJI = {
  website:          '🌐',
  facebook:         '💬',
  telegram:         '📱',
  hunter_nextdoor:  '🔍',
  hunter_facebook:  '🔍',
  phone:            '📞',
  referral:         '🤝',
  google_business:  '🔍',
  other:            '⬜'
};

const SOURCE_LABEL = {
  website:          'Website Form',
  facebook:         'FB Messenger',
  telegram:         'Telegram Bot',
  hunter_nextdoor:  'Nextdoor Hunter',
  hunter_facebook:  'FB Hunter',
  phone:            'Phone',
  referral:         'Referral',
  google_business:  'Google Business',
};

// ─── Intent detection ─────────────────────────────────────────────────────────

function detectIntent(text) {
  if (!text) return 'low';
  const t = String(text).toLowerCase();
  if (/today|asap|urgent|emergency|right now|this morning|tonight|immediately/i.test(t)) return 'high';
  if (/this week|soon|looking for|need|help with|can you|would like|estimate|quote/i.test(t)) return 'medium';
  return 'low';
}

const INTENT_EMOJI = { high: '🔴', medium: '🟡', low: '🔵' };

// ─── Next action suggestion ───────────────────────────────────────────────────

function getNextAction(lead, intentLevel) {
  if (intentLevel === 'high') return '🚨 Call within 15 min';
  if (!lead.phone) return '💬 Ask for phone number';
  const status = lead.status || lead.stage || 'new';
  if (status === 'new') return '📞 Call to introduce & qualify';
  if (status === 'engaged' || status === 'contacted') return '📋 Send quote';
  if (status === 'quoted') return '📞 Follow up on quote';
  return '⏳ Wait for response';
}

// ─── SLA deadline ─────────────────────────────────────────────────────────────

function slaDeadline(intentLevel) {
  const ms = intentLevel === 'high' ? 15 * 60 * 1000 : 60 * 60 * 1000;
  return new Date(Date.now() + ms)
    .toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Los_Angeles' }) + ' PT';
}

// ─── NEW LEAD ALERT ───────────────────────────────────────────────────────────

function formatNewLeadAlert(lead, envelope) {
  const intentLevel = detectIntent(envelope.raw_text);
  const srcEmoji = SOURCE_EMOJI[envelope.source] || '⬜';
  const srcLabel = SOURCE_LABEL[envelope.source] || esc(envelope.source);
  const snippet  = esc(String(envelope.raw_text || '').slice(0, 140));

  return (
    `🔔 <b>NEW LEAD</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${srcEmoji} Source: <b>${srcLabel}</b>\n` +
    `👤 Name: <b>${esc(lead.full_name || lead.name || 'Unknown')}</b>\n` +
    `📱 Phone: <code>${esc(lead.phone || 'Not provided')}</code>\n` +
    `📧 Email: ${esc(lead.email || '—')}\n` +
    `🔧 Service: <b>${esc(envelope.service_hint || lead.service_type || 'Not specified')}</b>\n` +
    `📍 Area: ${esc(envelope.area_hint || '—')}\n` +
    `${INTENT_EMOJI[intentLevel]} Intent: <b>${intentLevel.toUpperCase()}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    (snippet ? `💬 "${snippet}"\n\n` : '') +
    `Lead ID: <code>${esc(lead.id)}</code>\n` +
    `⏰ SLA: ${slaDeadline(intentLevel)}\n` +
    `✅ Next: <b>${getNextAction(lead, intentLevel)}</b>`
  );
}

// ─── LEAD UPDATE ALERT ────────────────────────────────────────────────────────

function formatLeadUpdateAlert(lead, envelope) {
  const intentLevel = detectIntent(envelope.raw_text);
  const srcEmoji = SOURCE_EMOJI[envelope.source] || '⬜';
  const snippet  = esc(String(envelope.raw_text || '').slice(0, 140));

  return (
    `👀 <b>LEAD UPDATE</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${srcEmoji} Source: ${SOURCE_LABEL[envelope.source] || esc(envelope.source)}\n` +
    `👤 ${esc(lead.full_name || lead.name || 'Unknown')} — <code>${esc(lead.phone || 'no phone')}</code>\n` +
    `🔧 Service: ${esc(lead.service_type || '—')}\n` +
    `📊 Status: <b>${esc(lead.status || lead.stage || 'new')}</b>\n` +
    `${INTENT_EMOJI[intentLevel]} Intent: ${intentLevel}\n` +
    (snippet ? `💬 "${snippet}"\n\n` : '') +
    `Lead ID: <code>${esc(lead.id)}</code>\n` +
    `✅ Next: <b>${getNextAction(lead, intentLevel)}</b>`
  );
}

// ─── HUNTER ALERT ────────────────────────────────────────────────────────────

function formatHunterAlert(post) {
  const priorityEmoji = { hot: '🔴', warm: '🟡', cool: '🔵' };
  const emoji = priorityEmoji[post.priority] || '⬜';
  const snippet = esc(String(post.post_text || '').slice(0, 120));
  const platform = post.platform === 'nextdoor' ? 'Nextdoor' : 'Facebook';

  return (
    `🔍 <b>HUNTER SIGNAL — ${platform}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${emoji} <b>${esc(post.author_name || 'Unknown')}</b> — ${esc(post.author_area || '—')}\n` +
    `🔧 Prospect needs: <b>${esc(post.service_detected || '—')}</b>\n` +
    `📋 Scope: ${esc(post.scope || '—')}\n` +
    (snippet ? `💬 "${snippet}..."\n\n` : '') +
    `✅ <b>Responded</b> (template #${post.response_template || '?'})\n` +
    `🔗 ${esc(post.post_url || '—')}\n\n` +
    `<i>No direct contact yet. This is a prospect signal, not a booked lead.</i>`
  );
}

// ─── DAILY DIGEST ─────────────────────────────────────────────────────────────

function formatDailyDigest(stats) {
  const dateStr = stats.date || new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' });
  const total = stats.total_new || 0;
  const src = stats.by_source || {};
  const pipe = stats.by_status || {};
  const hot = stats.hot_leads || [];

  // No leads = short message
  if (total === 0 && hot.length === 0) {
    const quoted = pipe.quoted || 0;
    const pending = pipe.new || 0;
    let msg = `📊 <b>${esc(dateStr)}</b> — No new leads today.`;
    if (quoted) msg += `\n📋 ${quoted} quoted — follow up`;
    if (pending) msg += `\n📞 ${pending} pending — contact`;
    return msg;
  }

  // Build sources line — only show sources that have leads
  const sources = [];
  if (src.website)  sources.push(`🌐 Site ${src.website}`);
  if (src.facebook)  sources.push(`💬 FB ${src.facebook}`);
  if (src.telegram)  sources.push(`📱 TG ${src.telegram}`);
  if (src.hunter || src.hunter_nextdoor || src.hunter_facebook) {
    const h = (src.hunter || 0) + (src.hunter_nextdoor || 0) + (src.hunter_facebook || 0);
    sources.push(`🔍 Hunter ${h}`);
  }
  if (src.phone)     sources.push(`📞 Phone ${src.phone}`);
  if (src.referral)  sources.push(`🤝 Referral ${src.referral}`);

  let msg = `📊 <b>${esc(dateStr)}</b> — <b>${total} new lead${total > 1 ? 's' : ''}</b>\n`;
  msg += sources.join(' | ') + '\n';

  // Hot leads — action required
  if (hot.length > 0) {
    msg += `\n🔴 <b>Action now:</b>\n`;
    for (const l of hot) {
      msg += `• ${esc(l.name || '?')} — ${esc(l.service || '?')} — ${esc(l.next_action || 'call')}\n`;
    }
  }

  // Pipeline — only non-zero stages
  const stages = [];
  if (pipe.quoted) stages.push(`${pipe.quoted} quoted`);
  if (pipe.new)    stages.push(`${pipe.new} new`);
  if (pipe.engaged) stages.push(`${pipe.engaged} engaged`);
  if (stages.length > 0) {
    msg += `\n📋 Pipeline: ${stages.join(', ')}`;
  }

  return msg;
}

// ─── WEEKLY DIGEST ────────────────────────────────────────────────────────────

function formatWeeklyDigest(stats) {
  const total = stats.total_leads || 0;
  const prev = stats.prev_week_leads || 0;
  const src = stats.by_source || {};
  const revenue = stats.revenue || 0;

  // No leads this week = short message
  if (total === 0 && revenue === 0) {
    return `📈 <b>${esc(stats.week_label || 'This week')}</b> — No leads, no revenue.`;
  }

  // Trend arrow
  const trend = total > prev ? '↑' : total < prev ? '↓' : '→';

  let msg = `📈 <b>${esc(stats.week_label || 'This week')}</b>\n`;
  msg += `<b>${total} leads</b> ${trend} (was ${prev})`;
  if (revenue) msg += ` | <b>$${revenue}</b>`;
  msg += '\n';

  // Sources — only non-zero
  const sources = [];
  if (src.website)  sources.push(`🌐 ${src.website}`);
  if (src.facebook)  sources.push(`💬 ${src.facebook}`);
  if (src.telegram)  sources.push(`📱 ${src.telegram}`);
  if (src.hunter || src.hunter_nextdoor || src.hunter_facebook) {
    const h = (src.hunter || 0) + (src.hunter_nextdoor || 0) + (src.hunter_facebook || 0);
    sources.push(`🔍 ${h}`);
  }
  if (src.phone)    sources.push(`📞 ${src.phone}`);
  if (src.referral) sources.push(`🤝 ${src.referral}`);
  if (sources.length) msg += sources.join(' | ') + '\n';

  // Top services — only if present
  const services = (stats.top_services || []).filter(s => s.count > 0);
  if (services.length) {
    msg += '\n' + services.map(s => `• ${esc(s.service)}: ${s.count}`).join('\n');
  }

  return msg;
}

module.exports = {
  formatNewLeadAlert,
  formatLeadUpdateAlert,
  formatHunterAlert,
  formatDailyDigest,
  formatWeeklyDigest,
  detectIntent,
  getNextAction,
  esc
};
