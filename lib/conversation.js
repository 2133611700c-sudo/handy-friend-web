/**
 * Conversation Intelligence — summary, intent, urgency, budget, next action.
 * Called after each inbound message to update the lead record with fresh signals.
 * Fire-and-forget: never throws, never blocks the response path.
 */

'use strict';

// ─── Supabase REST helpers (inline, no dependency on lead-pipeline.js) ────────

function getConfig() {
  const projectUrl     = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!projectUrl || !serviceRoleKey) return null;
  return { projectUrl, serviceRoleKey };
}

function buildHeaders(config, extra = {}) {
  return {
    apikey:        config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra
  };
}

// ─── Intent / urgency / budget detection ─────────────────────────────────────

function detectIntent(text) {
  if (!text) return 'low';
  const t = String(text).toLowerCase();
  if (/today|asap|urgent|emergency|right now|this morning|tonight|immediately/i.test(t)) return 'high';
  if (/this week|soon|looking for|need|help with|can you|would like|estimate|quote/i.test(t)) return 'medium';
  return 'low';
}

function detectUrgency(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  if (/today|asap|urgent|emergency|right now|this morning|tonight/.test(t)) return 'same_day';
  if (/this week|by friday|before weekend/.test(t)) return 'this_week';
  if (/next week|next month/.test(t)) return 'flexible';
  return null;
}

function detectBudget(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const match = t.match(/\$(\d+[\d,]*)/);
  if (match) return '$' + match[1];
  if (/cheap|budget|affordable|low cost|inexpensive/.test(t)) return 'price_sensitive';
  if (/premium|quality|best|top/.test(t)) return 'premium';
  return null;
}

function detectNeedsOwner(envelope, events) {
  const text = String(envelope.raw_text || '').toLowerCase();
  if (/price|cost|how much|quote|estimate|book|schedule|when can you/i.test(text)) return true;
  if (detectIntent(text) === 'high') return true;
  if (envelope.attachments && envelope.attachments.length > 0) return true;
  // 3+ interactions and no phone captured yet
  if (events && events.length >= 3 && !envelope.lead_phone) return true;
  return false;
}

function suggestNextAction(lead, envelope, events) {
  const intent   = detectIntent(envelope.raw_text);
  const hasPhone = Boolean(lead.phone || envelope.lead_phone);
  const status   = lead.status || lead.stage || 'new';

  if (intent === 'high' && hasPhone) return '🚨 Call within 15 min';
  if (intent === 'high' && !hasPhone) return '💬 Ask for phone — urgent lead';
  if (!hasPhone) return '📞 Capture phone number';
  if (status === 'new' || status === 'engaged') return '📞 Call to qualify & quote';
  if (status === 'quoted') return '📞 Follow up on quote';
  return '⏳ Monitor conversation';
}

function summarizeMessages(events, currentText) {
  if ((!events || events.length === 0) && !currentText) return null;
  const count = (events || []).length;
  const latest = currentText
    ? String(currentText).slice(0, 100)
    : (events[0]?.event_data?.raw_text || events[0]?.event_payload?.raw_text || events[0]?.event_type || 'message');
  return `${count} interaction(s). Latest: "${latest}"`;
}

// ─── Main function: updateConversationSummary ─────────────────────────────────

/**
 * Update lead record with fresh intelligence signals after each inbound.
 * Fire-and-forget: call without await, catches all errors internally.
 *
 * @param {string} leadId
 * @param {import('./inbound-envelope').InboundMessageEnvelope} envelope
 * @param {object} lead - current lead row from DB
 */
async function updateConversationSummary(leadId, envelope, lead = {}) {
  const config = getConfig();
  if (!config || !leadId) return;

  try {
    // Get recent events for context
    const eventsResp = await fetch(
      `${config.projectUrl}/rest/v1/lead_events?lead_id=eq.${encodeURIComponent(leadId)}&order=created_at.desc&limit=10`,
      { headers: buildHeaders(config, { Accept: 'application/json' }) }
    );
    const events = eventsResp.ok ? await eventsResp.json().catch(() => []) : [];

    const intentLevel  = detectIntent(envelope.raw_text);
    const urgency      = detectUrgency(envelope.raw_text);
    const budget       = detectBudget(envelope.raw_text);
    const needsOwner   = detectNeedsOwner(envelope, events);
    const nextAction   = suggestNextAction(lead, envelope, events);
    const summary      = summarizeMessages(events, envelope.raw_text);

    const update = {
      last_inbound_at:      envelope.created_at,
      intent_level:         intentLevel,
      needs_owner_now:      needsOwner,
      next_best_action:     nextAction,
      conversation_summary: summary,
      updated_at:           new Date().toISOString()
    };

    if (urgency)  update.urgency_signal = urgency;
    if (budget)   update.budget_signal  = budget;
    if (envelope.attachments && envelope.attachments.length > 0) update.has_photos = true;

    await fetch(
      `${config.projectUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`,
      {
        method:  'PATCH',
        headers: buildHeaders(config, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body:    JSON.stringify(update)
      }
    );
  } catch (err) {
    // Never crash the caller — this is purely analytical
    console.warn('[conversation] updateConversationSummary error:', err.message);
  }
}

/**
 * Append a new source to leads.sources[] if not already present.
 * Fire-and-forget.
 */
async function appendLeadSource(leadId, source) {
  const config = getConfig();
  if (!config || !leadId || !source) return;
  try {
    // Use PostgreSQL array_append via RPC is not available without a stored function.
    // Instead: fetch current sources, append, update.
    const resp = await fetch(
      `${config.projectUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=sources`,
      { headers: buildHeaders(config, { Accept: 'application/json' }) }
    );
    const rows = resp.ok ? await resp.json().catch(() => []) : [];
    const current = rows[0]?.sources || [];
    if (current.includes(source)) return; // already present
    const updated = [...current, source];
    await fetch(
      `${config.projectUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`,
      {
        method:  'PATCH',
        headers: buildHeaders(config, { 'Content-Type': 'application/json', Prefer: 'return=minimal' }),
        body:    JSON.stringify({ sources: updated })
      }
    );
  } catch (err) {
    console.warn('[conversation] appendLeadSource error:', err.message);
  }
}

module.exports = {
  updateConversationSummary,
  appendLeadSource,
  detectIntent,
  detectUrgency,
  detectBudget,
  detectNeedsOwner,
  suggestNextAction
};
