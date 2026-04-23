'use strict';

const DEFAULT_GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || process.env.FB_GRAPH_VERSION || 'v19.0';
const DEDUP_TTL_MS = 5 * 60 * 1000;

function createMessageDeduper(ttlMs = DEDUP_TTL_MS) {
  const seen = new Map();
  return {
    hasSeen(messageId) {
      const key = String(messageId || '').trim();
      if (!key) return false;
      const now = Date.now();
      if (seen.size > 1000) {
        for (const [k, ts] of seen.entries()) {
          if (now - ts > ttlMs) seen.delete(k);
        }
      }
      const prev = seen.get(key);
      if (prev && now - prev < ttlMs) return true;
      seen.set(key, now);
      return false;
    }
  };
}

function parseWhatsAppWebhook(body) {
  if (!body || body.object !== 'whatsapp_business_account') {
    return { messages: [], statuses: [] };
  }

  const messages = [];
  const statuses = [];

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change?.value || {};
      const metadata = value.metadata || {};
      const contacts = Array.isArray(value.contacts) ? value.contacts : [];
      const incomingMessages = Array.isArray(value.messages) ? value.messages : [];
      const incomingStatuses = Array.isArray(value.statuses) ? value.statuses : [];

      for (const message of incomingMessages) {
        messages.push({ message, value, metadata, contacts });
      }
      for (const status of incomingStatuses) {
        statuses.push({ status, value, metadata, contacts });
      }
    }
  }

  return { messages, statuses };
}

function extractInboundText(message) {
  const m = message || {};
  const type = String(m.type || '').toLowerCase();
  if (type === 'text') return String(m.text?.body || '').trim();
  if (type === 'button') return String(m.button?.text || '').trim();
  if (type === 'interactive') {
    const listTitle = m.interactive?.list_reply?.title;
    const buttonTitle = m.interactive?.button_reply?.title;
    const choice = String(listTitle || buttonTitle || '').trim();
    return choice ? `Selected option: ${choice}` : '';
  }
  if (type === 'image') return String(m.image?.caption || '').trim();
  if (type === 'document') return String(m.document?.caption || '').trim();
  if (type === 'video') return String(m.video?.caption || '').trim();
  if (type === 'audio') return 'Customer sent audio message';
  if (type === 'voice') return 'Customer sent voice message';
  if (type === 'location') {
    const name = String(m.location?.name || '').trim();
    return name ? `Customer shared location: ${name}` : 'Customer shared location';
  }
  if (type === 'contacts') return 'Customer shared contact card';
  return '';
}

function extractInboundAttachments(message) {
  const m = message || {};
  const out = [];
  const push = (kind, obj) => {
    if (!obj || typeof obj !== 'object') return;
    out.push({
      type: kind,
      media_id: obj.id ? String(obj.id) : null,
      mime_type: obj.mime_type ? String(obj.mime_type) : null,
      sha256: obj.sha256 ? String(obj.sha256) : null,
      caption: obj.caption ? String(obj.caption).slice(0, 500) : null
    });
  };

  if (m.image) push('image', m.image);
  if (m.video) push('video', m.video);
  if (m.audio) push('audio', m.audio);
  if (m.document) push('document', m.document);
  if (m.sticker) push('sticker', m.sticker);
  return out;
}

function normalizeWhatsAppInbound(payload) {
  const message = payload?.message || {};
  const contacts = Array.isArray(payload?.contacts) ? payload.contacts : [];
  const contact = contacts[0] || {};
  const waFrom = String(message.from || '').trim();
  const waMessageId = String(message.id || '').trim();
  const timestampRaw = String(message.timestamp || '').trim();
  const createdAt = /^\d+$/.test(timestampRaw)
    ? new Date(Number(timestampRaw) * 1000).toISOString()
    : new Date().toISOString();
  const text = extractInboundText(message);
  const attachments = extractInboundAttachments(message);
  const type = String(message.type || 'unknown').toLowerCase();
  const profileName = String(contact?.profile?.name || '').trim();
  const referral = message?.referral && typeof message.referral === 'object' ? message.referral : null;

  return {
    waFrom,
    waMessageId,
    createdAt,
    type,
    text,
    attachments,
    profileName: profileName || null,
    referral
  };
}

function classifyLeadVisibility({ text, serviceHint }) {
  const body = String(text || '').toLowerCase();
  const hasBuyingSignal = /quote|estimate|price|how much|need|help|install|repair|today|asap|book|schedule|available/.test(body);
  const hasServiceSignal = Boolean(serviceHint && serviceHint !== 'unknown' && serviceHint !== 'other');
  const isVeryShort = body.replace(/\s+/g, ' ').trim().length < 6;

  if ((hasBuyingSignal && hasServiceSignal) || (hasServiceSignal && !isVeryShort)) {
    return { kind: 'lead', reason: 'actionable' };
  }
  if (hasBuyingSignal || hasServiceSignal) {
    return { kind: 'pre_lead', reason: 'incomplete_scope' };
  }
  return { kind: 'pre_lead', reason: 'low_context' };
}

function isLikelySyntheticWhatsApp({ text, waFrom, profileName }) {
  const t = String(text || '').toLowerCase();
  const p = String(profileName || '').toLowerCase();
  const from = String(waFrom || '');
  if (/e2e|synthetic|probe|qa only|test only|ignore this|audit test/.test(t)) return true;
  if (/^2130000\d{3,}$/.test(from)) return true;
  if (p.includes('test') || p.includes('qa')) return true;
  return false;
}

async function sendWhatsAppText({ accessToken, phoneNumberId, to, text, replyToMessageId }) {
  const token = String(accessToken || '').trim();
  const phoneId = String(phoneNumberId || '').trim();
  const recipient = String(to || '').trim();
  const bodyText = String(text || '').trim();
  if (!token || !phoneId || !recipient || !bodyText) {
    return { ok: false, errorCode: 'bad_args', errorDescription: 'missing token/phoneNumberId/to/text', messageId: null };
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: false,
      body: bodyText.slice(0, 1800)
    }
  };
  if (replyToMessageId) {
    payload.context = { message_id: String(replyToMessageId) };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/${DEFAULT_GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = String(data?.error?.code || response.status);
      const desc = String(data?.error?.message || `wa_send_failed_${response.status}`);
      return { ok: false, errorCode: code, errorDescription: desc.slice(0, 300), messageId: null };
    }
    const messageId = data?.messages?.[0]?.id ? String(data.messages[0].id) : null;
    return { ok: true, messageId, errorCode: null, errorDescription: null };
  } catch (err) {
    return {
      ok: false,
      errorCode: 'network_error',
      errorDescription: String(err?.message || 'network_error').slice(0, 300),
      messageId: null
    };
  }
}

module.exports = {
  createMessageDeduper,
  parseWhatsAppWebhook,
  normalizeWhatsAppInbound,
  classifyLeadVisibility,
  isLikelySyntheticWhatsApp,
  sendWhatsAppText,
  extractInboundText,
  extractInboundAttachments
};
