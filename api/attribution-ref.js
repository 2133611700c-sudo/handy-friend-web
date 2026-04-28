'use strict';
/**
 * POST /api/attribution-ref
 * Generates a short HF-XXXX ref, stores attribution in attribution_refs,
 * and returns the ref + a ready-to-use WhatsApp URL.
 *
 * Body (JSON):
 *   gclid, gbraid, wbraid, fbclid, msclkid
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term
 *   landing_page, page_path, referrer, source_widget, service_slug
 *
 * Response: { hf_ref, wa_url }
 */
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WA_NUMBER = '12133611700';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1

function genRef() {
  let s = 'HF-';
  for (let i = 0; i < 6; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

function sbHeaders(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Prefer: 'return=representation',
    ...extra,
  };
}

async function insertRef(row) {
  const res = await fetch(`${SB_URL}/rest/v1/attribution_refs`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify([row]),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`attribution_refs insert ${res.status}: ${txt}`);
  }
  return res.json();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  if (!body || typeof body !== 'object') body = {};

  const {
    gclid = '', gbraid = '', wbraid = '', fbclid = '', msclkid = '',
    utm_source = '', utm_medium = '', utm_campaign = '', utm_content = '', utm_term = '',
    landing_page = '', page_path = '', referrer = '', source_widget = '', service_slug = '',
    message_prefix = '',
  } = body;

  const hf_ref = genRef();
  const now = new Date();
  const expires_at = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const user_agent = req.headers['user-agent'] || '';

  const row = {
    hf_ref,
    gclid: gclid || null,
    gbraid: gbraid || null,
    wbraid: wbraid || null,
    fbclid: fbclid || null,
    msclkid: msclkid || null,
    utm_source: utm_source || null,
    utm_medium: utm_medium || null,
    utm_campaign: utm_campaign || null,
    utm_content: utm_content || null,
    utm_term: utm_term || null,
    landing_page: landing_page || null,
    page_path: page_path || null,
    referrer: referrer || null,
    user_agent: user_agent || null,
    source_widget: source_widget || null,
    service_slug: service_slug || null,
    raw: body,
    expires_at,
  };

  try {
    await insertRef(row);
  } catch (err) {
    console.error('[attribution-ref] insert failed:', err.message);
    // Still return a ref even if DB fails — client-side fallback
    const fallbackMsg = (message_prefix || 'Hi! I need help with your services') + `\n\nRef: ${hf_ref}`;
    return res.status(200).json({
      hf_ref,
      wa_url: `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(fallbackMsg)}`,
      stored: false,
    });
  }

  const baseMessage = message_prefix || 'Hi! I need help with your services';
  const prefilled = `${baseMessage}\n\nRef: ${hf_ref}`;
  const wa_url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(prefilled)}`;

  res.status(200).json({ hf_ref, wa_url, stored: true });
};
