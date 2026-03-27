/**
 * InboundMessageEnvelope — Unified input normalization
 *
 * Every input channel (website, facebook, telegram, hunter)
 * normalizes its data into this one shape BEFORE touching the pipeline.
 *
 * @typedef {Object} InboundMessageEnvelope
 * @property {string} source              - 'website'|'facebook'|'telegram'|'hunter_nextdoor'|'hunter_facebook'
 * @property {string|null} source_user_id - platform-specific user ID (FB psid, TG chat_id)
 * @property {string|null} source_message_id - platform message ID (for idempotency)
 * @property {string|null} source_thread_id  - conversation thread / session ID
 * @property {string|null} lead_phone    - normalized E.164 (+1XXXXXXXXXX)
 * @property {string|null} lead_email    - lowercase trimmed
 * @property {string|null} lead_name     - as provided
 * @property {string} raw_text           - original message/form text
 * @property {string|null} service_hint  - normalized service slug
 * @property {string|null} area_hint     - neighborhood/zip if known
 * @property {string} created_at         - ISO timestamp
 * @property {Array}  attachments        - [{type, url}]
 * @property {Object} attribution        - {utm_source, utm_campaign, utm_medium, referrer, post_url}
 * @property {Object} meta               - any source-specific extra data
 */

'use strict';

const SERVICE_SLUG_MAP = {
  'tv':              'tv_mounting',
  'television':      'tv_mounting',
  'mount tv':        'tv_mounting',
  'tv mount':        'tv_mounting',
  'tv mounting':     'tv_mounting',
  'cabinet':         'kitchen_cabinet_painting',
  'kitchen':         'kitchen_cabinet_painting',
  'kitchen paint':   'kitchen_cabinet_painting',
  'cabinet paint':   'kitchen_cabinet_painting',
  'paint':           'interior_painting',
  'painter':         'interior_painting',
  'interior paint':  'interior_painting',
  'floor':           'flooring',
  'laminate':        'flooring',
  'lvp':             'flooring',
  'vinyl':           'flooring',
  'flooring':        'flooring',
  'plumb':           'plumbing',
  'faucet':          'plumbing',
  'toilet':          'plumbing',
  'shower':          'plumbing',
  'pipe':            'plumbing',
  'electr':          'electrical',
  'outlet':          'electrical',
  'switch':          'electrical',
  'light':           'electrical',
  'fixture':         'electrical',
  'furniture':       'furniture_assembly',
  'assemble':        'furniture_assembly',
  'assembly':        'furniture_assembly',
  'ikea':            'furniture_assembly',
  'shelf':           'art_hanging',
  'mirror':          'art_hanging',
  'art':             'art_hanging',
  'picture':         'art_hanging',
  'curtain':         'curtain_rods',
  'rod':             'curtain_rods',
  'drywall':         'drywall',
  'patch':           'drywall',
  'door':            'door_installation',
  'handyman':        'general',
  'repair':          'general',
  'fix':             'general',
  'general':         'general',
};

/**
 * Normalize phone to E.164 format (+1XXXXXXXXXX for US).
 * Returns null if not a valid phone number.
 */
function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length >= 7) return '+' + digits;
  return null;
}

/**
 * Normalize service hint to canonical slug.
 * Scans text for keyword matches.
 */
function normalizeService(hint) {
  if (!hint) return null;
  const lower = String(hint).toLowerCase();
  // Exact match first
  for (const [key, value] of Object.entries(SERVICE_SLUG_MAP)) {
    if (lower === key) return value;
  }
  // Substring match
  for (const [key, value] of Object.entries(SERVICE_SLUG_MAP)) {
    if (lower.includes(key)) return value;
  }
  return 'other';
}

/**
 * Create a normalized InboundMessageEnvelope.
 * Call this at the very top of each API route handler.
 */
function createEnvelope({
  source,
  source_user_id  = null,
  source_message_id = null,
  source_thread_id  = null,
  lead_phone      = null,
  lead_email      = null,
  lead_name       = null,
  raw_text        = '',
  service_hint    = null,
  area_hint       = null,
  attachments     = [],
  attribution     = {},
  meta            = {}
}) {
  if (!source) throw new Error('InboundMessageEnvelope requires source');

  return {
    source:            String(source),
    source_user_id:    source_user_id  ? String(source_user_id)  : null,
    source_message_id: source_message_id ? String(source_message_id) : null,
    source_thread_id:  source_thread_id  ? String(source_thread_id)  : null,
    lead_phone:        normalizePhone(lead_phone),
    lead_email:        lead_email ? String(lead_email).toLowerCase().trim() : null,
    lead_name:         lead_name  ? String(lead_name).trim()  : null,
    raw_text:          String(raw_text || ''),
    service_hint:      normalizeService(service_hint),
    area_hint:         area_hint ? String(area_hint).trim() : null,
    created_at:        new Date().toISOString(),
    attachments:       Array.isArray(attachments) ? attachments : [],
    attribution:       attribution && typeof attribution === 'object' ? attribution : {},
    meta:              meta       && typeof meta       === 'object' ? meta       : {}
  };
}

module.exports = { createEnvelope, normalizePhone, normalizeService };
