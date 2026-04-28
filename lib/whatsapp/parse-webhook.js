/**
 * Normalize Meta WhatsApp webhook payload.
 * Returns { messages: [...], statuses: [...], errors: [...] }.
 */

function normalizeMessage(m, value) {
  const wamid = m.id;
  const from = String(m.from || '').replace(/^\+/, '');
  const ts = Number(m.timestamp || 0);
  const type = m.type;
  let body = '';
  let media = null;
  if (type === 'text') body = m.text?.body || '';
  else if (type === 'button') body = m.button?.text || '';
  else if (type === 'interactive') {
    const intr = m.interactive || {};
    body = intr.button_reply?.title || intr.list_reply?.title || JSON.stringify(intr);
  } else if (['image', 'video', 'audio', 'document', 'sticker'].includes(type)) {
    media = { type, id: m[type]?.id, mime: m[type]?.mime_type, caption: m[type]?.caption || '', sha256: m[type]?.sha256 };
    body = m[type]?.caption || '';
  } else {
    body = `[${type}]`;
  }
  return {
    wamid,
    from,
    to: value?.metadata?.display_phone_number?.replace(/[^0-9]/g, '') || '',
    phone_number_id: value?.metadata?.phone_number_id || '',
    type,
    body,
    media,
    timestamp: ts,
    contextWamid: m.context?.id || null,
    pushName: value?.contacts?.[0]?.profile?.name || null,
    waId: value?.contacts?.[0]?.wa_id || from,
  };
}

function normalizeStatus(s) {
  return {
    wamid: s.id,
    status: s.status, // sent | delivered | read | failed
    timestamp: Number(s.timestamp || 0),
    recipient: s.recipient_id,
    conversationId: s.conversation?.id || null,
    pricing: s.pricing || null,
    errors: s.errors || null,
  };
}

function parseWebhook(payload) {
  const out = { messages: [], statuses: [], errors: [], objectMatch: false };
  if (!payload || payload.object !== 'whatsapp_business_account') return out;
  out.objectMatch = true;
  for (const entry of payload.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value || {};
      for (const m of value.messages || []) out.messages.push(normalizeMessage(m, value));
      for (const s of value.statuses || []) out.statuses.push(normalizeStatus(s));
      for (const e of value.errors || []) out.errors.push(e);
    }
  }
  return out;
}

module.exports = { parseWebhook };
