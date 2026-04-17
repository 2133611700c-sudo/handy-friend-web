const { restInsert } = require('./_lib/supabase-admin.js');

const ALLOWED_EVENTS = new Set([
  'page_view',
  'widget_seen',
  'widget_open',
  'chat_first_message',
  'phone_captured',
  'quote_shown',
  'handoff_to_owner',
  'abandon'
]);

const REQUEST_BUCKET = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_PER_WINDOW = 60;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const body = parseBody(req.body);
    const sessionId = cleanText(body.session_id, 120);
    const eventName = cleanText(body.event_name, 64);
    const pagePath = cleanText(body.page_path || '/', 256);
    const channelSource = normalizeChannelSource(body.channel_source);
    const isTest = Boolean(body.is_test);

    if (!sessionId) return res.status(400).json({ ok: false, error: 'missing_session_id' });
    if (!ALLOWED_EVENTS.has(eventName)) return res.status(400).json({ ok: false, error: 'invalid_event_name' });

    const bucketKey = `${sessionId}|${extractClientIp(req)}`;
    if (!allowRate(bucketKey)) {
      return res.status(429).json({ ok: false, error: 'rate_limited' });
    }

    const payload = {
      session_id: sessionId,
      event_name: eventName,
      page_path: pagePath,
      metadata: sanitizeMetadata(body.metadata),
      is_test: isTest,
      channel_source: channelSource
    };

    const inserted = await restInsert('funnel_events', payload, { returning: false });
    if (!inserted.ok) {
      return res.status(502).json({
        ok: false,
        error: inserted.error || 'funnel_insert_failed',
        details: String(inserted.details || '').slice(0, 240)
      });
    }

    return res.status(200).json({ ok: true, event_name: eventName });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || 'funnel_event_failed').slice(0, 240) });
  }
}

function parseBody(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }
  return {};
}

function cleanText(value, maxLen) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.slice(0, maxLen);
}

function normalizeChannelSource(value) {
  const v = String(value || '').trim().toLowerCase();
  const allowed = new Set([
    'real_website_chat',
    'fb_messenger',
    'test',
    'probe',
    'cron',
    'e2e',
    'internal_admin'
  ]);
  return allowed.has(v) ? v : 'real_website_chat';
}

function sanitizeMetadata(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const src = JSON.parse(JSON.stringify(raw));

  // PII safety: reject common phone/email keys and long blobs.
  const blocked = new Set(['phone', 'email', 'full_name', 'name', 'contact']);
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    const k = String(key || '').toLowerCase();
    if (!k || blocked.has(k)) continue;
    if (typeof value === 'string') {
      if (value.length > 300) out[k] = value.slice(0, 300);
      else if (!looksLikePhoneOrEmail(value)) out[k] = value;
      continue;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      out[k] = value;
    }
  }
  return out;
}

function looksLikePhoneOrEmail(text) {
  const s = String(text || '');
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(s)) return true;
  if (/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(s)) return true;
  return false;
}

function extractClientIp(req) {
  const raw = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (raw) return raw.slice(0, 64);
  return 'unknown';
}

function allowRate(bucketKey) {
  const now = Date.now();
  const current = REQUEST_BUCKET.get(bucketKey);
  if (!current || now - current.startAt > RATE_WINDOW_MS) {
    REQUEST_BUCKET.set(bucketKey, { startAt: now, count: 1 });
    gcBuckets(now);
    return true;
  }
  current.count += 1;
  REQUEST_BUCKET.set(bucketKey, current);
  return current.count <= RATE_LIMIT_PER_WINDOW;
}

function gcBuckets(now) {
  for (const [key, value] of REQUEST_BUCKET.entries()) {
    if (now - value.startAt > RATE_WINDOW_MS * 3) REQUEST_BUCKET.delete(key);
  }
}
