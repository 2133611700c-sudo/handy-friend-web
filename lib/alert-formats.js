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
    `🔍 <b>LEAD HUNTER — ${platform}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `${emoji} <b>${esc(post.author_name || 'Unknown')}</b> — ${esc(post.author_area || '—')}\n` +
    `🔧 Looking for: <b>${esc(post.service_detected || '—')}</b>\n` +
    `📋 Scope: ${esc(post.scope || '—')}\n` +
    (snippet ? `💬 "${snippet}..."\n\n` : '') +
    `✅ <b>Responded</b> (template #${post.response_template || '?'})\n` +
    `🔗 ${esc(post.post_url || '—')}\n\n` +
    `<i>Waiting for reaction. Will update if they respond.</i>`
  );
}

// ─── DAILY DIGEST ─────────────────────────────────────────────────────────────

function formatDailyDigest(stats) {
  const dateStr = stats.date || new Date().toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric' });

  const hotLeadsText = (stats.hot_leads || []).length > 0
    ? stats.hot_leads.map(l =>
        `🔴 ${esc(l.name || '?')} — ${esc(l.service || '?')} — ${esc(l.area || '?')} — ${esc(l.next_action || '?')}`
      ).join('\n')
    : 'None';

  return (
    `📊 <b>Daily Report — ${esc(dateStr)}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>New leads: ${stats.total_new || 0}</b>\n` +
    `├── 🌐 Website: ${(stats.by_source || {}).website || 0}\n` +
    `├── 💬 FB Messenger: ${(stats.by_source || {}).facebook || 0}\n` +
    `├── 📱 Telegram: ${(stats.by_source || {}).telegram || 0}\n` +
    `└── 🔍 Lead Hunter: ${(stats.by_source || {}).hunter || 0}\n\n` +
    `<b>Pipeline:</b>\n` +
    `├── New: ${(stats.by_status || {}).new || 0}\n` +
    `├── Engaged: ${(stats.by_status || {}).engaged || 0}\n` +
    `├── Qualified: ${(stats.by_status || {}).qualified || 0}\n` +
    `├── Quoted: ${(stats.by_status || {}).quoted || 0}\n` +
    `├── Won: ${(stats.by_status || {}).won || 0}\n` +
    `└── Lost: ${(stats.by_status || {}).lost || 0}\n\n` +
    `<b>Hunter activity:</b>\n` +
    `├── Scans: ${(stats.hunter || {}).scans || 0}\n` +
    `├── Posts found: ${(stats.hunter || {}).found || 0}\n` +
    `├── Responded: ${(stats.hunter || {}).responded || 0}\n` +
    `└── Est. cost: $${(stats.hunter || {}).cost || '0.00'}\n\n` +
    `<b>Hot leads (need action):</b>\n` +
    `${hotLeadsText}\n\n` +
    `<b>Response SLA (median): ${stats.response_median_min != null ? stats.response_median_min + ' min' : 'N/A'}</b>`
  );
}

// ─── WEEKLY DIGEST ────────────────────────────────────────────────────────────

function formatWeeklyDigest(stats) {
  return (
    `📈 <b>Weekly Report — ${esc(stats.week_label || 'This week')}</b>\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Leads: ${stats.total_leads || 0}</b> (vs ${stats.prev_week_leads || 0} last week)\n` +
    `<b>Revenue: $${stats.revenue || 0}</b>\n` +
    `<b>Conversion: ${stats.conversion_pct || 0}%</b>\n\n` +
    `<b>By source:</b>\n` +
    `├── 🌐 Website: ${(stats.by_source || {}).website || 0}\n` +
    `├── 💬 Facebook: ${(stats.by_source || {}).facebook || 0}\n` +
    `├── 📱 Telegram: ${(stats.by_source || {}).telegram || 0}\n` +
    `└── 🔍 Hunter: ${(stats.by_source || {}).hunter || 0}\n\n` +
    `<b>Top services:</b>\n` +
    (stats.top_services || []).map(s => `  ${esc(s.service)}: ${s.count} leads`).join('\n') + '\n\n' +
    `<b>Hunter performance:</b>\n` +
    `├── Posts responded: ${(stats.hunter || {}).responded || 0}\n` +
    `└── Converted to leads: ${(stats.hunter || {}).converted || 0}\n\n` +
    `<i>Next actions: Check pipeline, follow up quoted leads</i>`
  );
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
