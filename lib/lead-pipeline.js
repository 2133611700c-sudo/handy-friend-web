/**
 * Lead Pipeline Module for Handy & Friend
 *
 * Core backend logic for:
 * - Source normalization
 * - Smart deduplication (soft dedup)
 * - Lead creation/merging
 * - Pipeline stage transitions
 * - Event logging
 *
 * Imported by: submit-lead.js, ai-chat.js, API handlers
 *
 * Uses direct PostgREST API calls for reliability (no @supabase/supabase-js dependency)
 *
 * GA4 MEASUREMENT PROTOCOL:
 * Server-side events sent to GA4 after lead creation and stage transitions.
 * Requires GA4_MEASUREMENT_ID + GA4_API_SECRET env vars.
 * Non-blocking: failures are logged but never crash the pipeline.
 *
 * AUTO-MIGRATION DETECTION:
 * Queries information_schema at startup to detect whether 007_pipeline_columns.sql
 * has been run. Enables stage/session_id features automatically once migration exists.
 * No code changes needed after running the migration.
 */

// ============================================================================
// PIPELINE VERSION & CONSTANTS
// ============================================================================

const PIPELINE_VERSION = '2026.03.27-v1';
const OWNER_ALERT_MIN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour between owner alerts

// ============================================================================
// GA4 MEASUREMENT PROTOCOL (server-side tracking)
// ============================================================================

const { trackLeadEvent } = require('./ga4-mp');
const { sendTelegramMessage: unifiedTelegramSend } = require('./telegram/send.js');

/**
 * Fire-and-forget GA4 server-side event.
 * Never throws, never blocks the pipeline.
 * Now logs result to lead_events for audit trail.
 */
function fireGA4(stage, leadData, clientId) {
  const leadId = leadData.lead_id || '';
  trackLeadEvent(stage, leadData, clientId)
    .then(res => {
      if (res.ok) {
        console.log(`[ga4-mp] ✓ ${stage} sent for ${leadId || 'unknown'}`);
      } else {
        console.warn(`[ga4-mp] ✗ ${stage} failed:`, res.reason || res.status);
      }
      // Log GA4 event result to lead_events for auditability
      if (leadId) {
        logEvent(leadId, res.ok ? 'ga4_event_sent' : 'ga4_event_failed', {
          event: stage, status: res.status, reason: res.reason || null
        });
      }
    })
    .catch(err => {
      console.warn(`[ga4-mp] ✗ ${stage} error:`, err.message);
      if (leadId) {
        logEvent(leadId, 'ga4_event_failed', { event: stage, error: err.message });
      }
    });
}

// ============================================================================
// SUPABASE REST HELPERS
// ============================================================================

function getConfig() {
  const projectUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!projectUrl || !serviceRoleKey) return null;
  return { projectUrl, serviceRoleKey };
}

function buildHeaders(config, extra = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra
  };
}

async function restGet(table, params) {
  const config = getConfig();
  if (!config) throw new Error('Supabase not configured');

  const query = new URLSearchParams(params).toString();
  const url = `${config.projectUrl}/rest/v1/${table}${query ? '?' + query : ''}`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(config, { Accept: 'application/json' })
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`PostgREST GET ${table} ${resp.status}: ${body.slice(0, 300)}`);
  }

  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) ? rows : [];
}

async function restPost(table, body) {
  const config = getConfig();
  if (!config) throw new Error('Supabase not configured');

  const url = `${config.projectUrl}/rest/v1/${table}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PostgREST POST ${table} ${resp.status}: ${text.slice(0, 300)}`);
  }
}

async function restPatch(table, filter, body) {
  const config = getConfig();
  if (!config) throw new Error('Supabase not configured');

  const query = new URLSearchParams(filter).toString();
  const url = `${config.projectUrl}/rest/v1/${table}?${query}`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    }),
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`PostgREST PATCH ${table} ${resp.status}: ${text.slice(0, 300)}`);
  }
}

// ============================================================================
// AUTO-MIGRATION DETECTION
// ============================================================================

// Cache migration state — TTL 60 min, reset on cold start
let _migrationCache = null;
let _migrationCheckedAt = 0;
const MIGRATION_CACHE_TTL_MS = 60 * 60 * 1000;
const EVENT_DEDUP_TTL_MS = 24 * 60 * 60 * 1000;
const EVENT_DEDUP_CACHE = globalThis.__HF_EVENT_DEDUP_CACHE || new Map();
globalThis.__HF_EVENT_DEDUP_CACHE = EVENT_DEDUP_CACHE;
const LEAD_RESULT_CACHE_TTL_MS = 2 * 60 * 1000;
const LEAD_RESULT_CACHE = globalThis.__HF_LEAD_RESULT_CACHE || new Map();
const LEAD_CREATE_LOCKS = globalThis.__HF_LEAD_CREATE_LOCKS || new Map();
globalThis.__HF_LEAD_RESULT_CACHE = LEAD_RESULT_CACHE;
globalThis.__HF_LEAD_CREATE_LOCKS = LEAD_CREATE_LOCKS;

function buildEventDedupKey(leadId, eventType, payload) {
  const idempotencyKey = String(payload?.idempotency_key || '').trim();
  if (!idempotencyKey) return '';
  return `${String(leadId || 'null')}|${String(eventType || 'unknown_event')}|${idempotencyKey}`;
}

function shouldSkipEventByIdempotency(leadId, eventType, payload) {
  const key = buildEventDedupKey(leadId, eventType, payload);
  if (!key) return false;
  const now = Date.now();
  const lastSeen = EVENT_DEDUP_CACHE.get(key);
  if (lastSeen && now - lastSeen < EVENT_DEDUP_TTL_MS) return true;
  EVENT_DEDUP_CACHE.set(key, now);

  // Opportunistic cleanup to keep memory bounded.
  if (EVENT_DEDUP_CACHE.size > 5000) {
    for (const [cacheKey, ts] of EVENT_DEDUP_CACHE.entries()) {
      if (now - ts > EVENT_DEDUP_TTL_MS) EVENT_DEDUP_CACHE.delete(cacheKey);
    }
  }
  return false;
}

function cleanupLeadResultCache(now = Date.now()) {
  if (LEAD_RESULT_CACHE.size < 2000) return;
  for (const [key, item] of LEAD_RESULT_CACHE.entries()) {
    if (!item?.ts || now - item.ts > LEAD_RESULT_CACHE_TTL_MS) {
      LEAD_RESULT_CACHE.delete(key);
    }
  }
}

function getLeadResultCache(key) {
  if (!key) return null;
  const item = LEAD_RESULT_CACHE.get(key);
  if (!item?.id || !item?.ts) return null;
  if (Date.now() - item.ts > LEAD_RESULT_CACHE_TTL_MS) {
    LEAD_RESULT_CACHE.delete(key);
    return null;
  }
  return { id: item.id, isNew: false };
}

function setLeadResultCache(key, value) {
  if (!key || !value?.id) return;
  LEAD_RESULT_CACHE.set(key, {
    id: value.id,
    ts: Date.now()
  });
  cleanupLeadResultCache();
}

/**
 * Check if migration 007_pipeline_columns.sql has been applied.
 * Uses a probe SELECT on 'stage,session_id' columns — if they exist the query
 * succeeds (HTTP 200), if not PostgreSQL returns error code 42703.
 * Result cached for 60 minutes to avoid schema probes on every request.
 *
 * @returns {Promise<{hasStage: boolean, hasSessionId: boolean}>}
 */
async function checkMigration007() {
  const now = Date.now();
  if (_migrationCache && now - _migrationCheckedAt < MIGRATION_CACHE_TTL_MS) {
    return _migrationCache;
  }

  try {
    const config = getConfig();
    if (!config) {
      _migrationCache = { hasStage: false, hasSessionId: false };
      _migrationCheckedAt = now;
      return _migrationCache;
    }

    // Probe: SELECT stage, session_id FROM leads LIMIT 0
    // Returns 200 if columns exist, 4xx with code 42703 if not
    const url = `${config.projectUrl}/rest/v1/leads?select=stage,session_id&limit=0`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(config, { Accept: 'application/json' })
    });

    if (resp.ok) {
      _migrationCache = { hasStage: true, hasSessionId: true };
      console.log('[lead-pipeline] Migration 007 detected: full pipeline mode ENABLED');
    } else {
      const body = await resp.json().catch(() => ({}));
      // code 42703 = column does not exist (PostgreSQL standard)
      const isMissing = body.code === '42703' || body.code === 'PGRST204';
      if (!isMissing) {
        // Unexpected error — log but default to safe fallback
        console.error('[lead-pipeline] Migration probe unexpected error:', JSON.stringify(body));
      }
      _migrationCache = { hasStage: false, hasSessionId: false };
      console.log('[lead-pipeline] Migration 007 not yet applied: compact mode');
    }

    _migrationCheckedAt = now;
  } catch (err) {
    // Network error — safe fallback, retry next request
    console.error('[lead-pipeline] Migration check failed:', err.message);
    _migrationCache = { hasStage: false, hasSessionId: false };
    _migrationCheckedAt = now;
  }

  return _migrationCache;
}

// ============================================================================
// SOURCE NORMALIZATION
// ============================================================================

const SOURCE_MAP = {
  'direct': 'website_form',
  'ai_chat': 'website_chat',
  'ai_intake': 'website_chat',
  'fb': 'facebook',
  'ig': 'instagram',
  'wa': 'whatsapp',
  'tel': 'phone',
  'call': 'phone',
  'ref': 'referral',
  'google': 'google_business',
  'gbp': 'google_business'
};

const VALID_SOURCES = new Set([
  'website_chat', 'website_form', 'exit_intent', 'calculator',
  'facebook', 'instagram', 'whatsapp', 'phone', 'referral',
  'nextdoor', 'craigslist', 'thumbtack', 'google_business', 'google_organic',
  'google_lsa', 'google_ads_search', 'google_ads_display', 'google_ads_pmax',
  'facebook_ads', 'facebook_organic', 'instagram_ads', 'instagram_organic',
  'yelp', 'other'
]);

/**
 * Normalize source to standardized value
 * Handles legacy values for backward compat: 'direct' and 'ai_chat'
 * @param {string} raw - Raw source from user/system
 * @returns {string} Normalized source value
 */
function normalizeSource(raw) {
  if (!raw) return 'other';
  const key = String(raw).toLowerCase().trim();
  if (SOURCE_MAP[key]) return SOURCE_MAP[key];
  if (VALID_SOURCES.has(key)) return key;
  return 'other';
}

// ============================================================================
// CHANNEL NORMALIZATION (from source + source_details)
// ============================================================================

const VALID_CHANNELS = new Set([
  'website_chat', 'website_form', 'facebook', 'nextdoor', 'craigslist',
  'google_ads_search', 'google_ads_display', 'google_ads_pmax', 'google_lsa',
  'google_business', 'google_organic', 'facebook_ads', 'facebook_organic',
  'instagram_ads', 'instagram_organic', 'thumbtack', 'yelp',
  'whatsapp', 'phone', 'referral', 'direct', 'other'
]);

/**
 * Derive canonical channel from source + source_details.
 * Priority: source_details.channel (from attribution.js) > source mapping > fallback.
 */
function deriveChannel(normalizedSource, sourceDetails) {
  // 1. If attribution.js already classified the channel
  const sdChannel = sourceDetails?.channel;
  if (sdChannel && typeof sdChannel === 'string') {
    const ch = sdChannel.toLowerCase().trim();
    if (VALID_CHANNELS.has(ch) && ch !== 'other' && ch !== 'website_form') {
      return ch;
    }
  }

  // 2. Source-based mapping
  if (normalizedSource === 'facebook') {
    // Check if it's from ads via UTM
    const med = String(sourceDetails?.utmMedium || '').toLowerCase();
    return /(paid|cpc|ads)/.test(med) ? 'facebook_ads' : 'facebook';
  }
  if (VALID_CHANNELS.has(normalizedSource)) return normalizedSource;

  // 3. Referrer-based fallback
  const ref = String(sourceDetails?.referrer || '').toLowerCase();
  if (/facebook\.com|fb\.com/.test(ref)) return 'facebook';
  if (/nextdoor\.com/.test(ref)) return 'nextdoor';
  if (/yelp\.com/.test(ref)) return 'yelp';
  if (/google\./.test(ref)) return 'google_organic';

  return normalizedSource || 'other';
}

// ============================================================================
// SERVICE TYPE NORMALIZATION (canonical map)
// ============================================================================

const SERVICE_CANONICAL_MAP = {
  // TV Mounting variants
  'tv mounting': 'tv_mounting',
  'tv-mounting': 'tv_mounting',
  'tv mount': 'tv_mounting',
  'tv_mounting': 'tv_mounting',
  'tv_mounting_hidden': 'tv_mounting_hidden',
  'tv mounting hidden': 'tv_mounting_hidden',
  'tv-mounting-hidden': 'tv_mounting_hidden',
  // Art & Mirrors
  'art hanging': 'art_hanging',
  'art-hanging': 'art_hanging',
  'art_hanging': 'art_hanging',
  'art & mirrors': 'art_hanging',
  'art_mirrors': 'art_hanging',
  'art & mirror hanging': 'art_hanging',
  // Cabinet Painting
  'cabinet painting': 'kitchen_cabinet_painting',
  'cabinet-painting': 'kitchen_cabinet_painting',
  'kitchen cabinet painting': 'kitchen_cabinet_painting',
  'kitchen_cabinet_painting': 'kitchen_cabinet_painting',
  'kitchen-cabinet-painting': 'kitchen_cabinet_painting',
  // Furniture Painting
  'furniture painting': 'furniture_painting',
  'furniture-painting': 'furniture_painting',
  'furniture_painting': 'furniture_painting',
  // Interior Painting
  'interior painting': 'interior_painting',
  'interior-painting': 'interior_painting',
  'interior_painting': 'interior_painting',
  'interior wall painting': 'interior_painting',
  'painting': 'interior_painting',
  // Flooring
  'flooring': 'flooring',
  'flooring_lvp': 'flooring',
  'flooring-lvp': 'flooring',
  'lvp flooring': 'flooring',
  'laminate flooring': 'flooring',
  // Furniture Assembly
  'furniture assembly': 'furniture_assembly',
  'furniture-assembly': 'furniture_assembly',
  'furniture_assembly': 'furniture_assembly',
  'assembly': 'furniture_assembly',
  // Curtain Rods
  'curtain rods': 'curtain_rods',
  'curtain-rods': 'curtain_rods',
  'curtain_rods': 'curtain_rods',
  'curtain rod': 'curtain_rods',
  // Plumbing
  'plumbing': 'plumbing',
  'plumbing-repairs': 'plumbing',
  'plumbing_repairs': 'plumbing',
  'faucet install': 'plumbing',
  'faucet_install': 'plumbing',
  'toilet install': 'plumbing',
  'toilet_install': 'plumbing',
  'shower head': 'plumbing',
  'shower_head': 'plumbing',
  // Electrical
  'electrical': 'electrical',
  'electrical-work': 'electrical',
  'electrical_work': 'electrical',
  'light install': 'electrical',
  'light_install': 'electrical',
  'smart device': 'electrical',
  'smart_device': 'electrical',
  // Other
  'unknown': 'unknown',
  'not specified': 'unknown',
  'test': 'test'
};

/**
 * Normalize service_type to canonical snake_case key.
 * Handles: string, object (extracts .serviceId), null/undefined.
 */
function normalizeServiceType(raw) {
  if (!raw) return 'unknown';

  // Handle object (e.g. {serviceId: 'plumbing', confidence: 0.9})
  if (typeof raw === 'object' && raw !== null) {
    const extracted = raw.serviceId || raw.service_id || raw.id || raw.name || '';
    return normalizeServiceType(extracted);
  }

  const key = String(raw).toLowerCase().trim();
  if (!key || key === '[object object]') return 'unknown';
  if (SERVICE_CANONICAL_MAP[key]) return SERVICE_CANONICAL_MAP[key];

  // Fuzzy: replace spaces/hyphens with underscores and retry
  const normalized = key.replace(/[\s-]+/g, '_');
  if (SERVICE_CANONICAL_MAP[normalized]) return SERVICE_CANONICAL_MAP[normalized];

  // Return cleaned but unmapped value (preserve for new services)
  return normalized || 'unknown';
}

// ============================================================================
// DEDUPLICATION (SOFT DEDUP)
// ============================================================================

/**
 * Find duplicate lead by phone, email, or session_id
 * Uses session_id dedup only if migration 007 has been applied.
 *
 * @param {object} params - {phone, email, session_id, service_type}
 * @returns {Promise<string|null>} Lead ID if duplicate found, null otherwise
 */

/**
 * Normalize phone to 10-digit US format.
 * Mirrors Postgres phone_normalize() from migration 014.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  // Strip US country code
  if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
  // Must be at least 10 digits
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

function normalizeEmail(raw) {
  if (!raw) return '';
  return String(raw).trim().toLowerCase();
}

/**
 * Build DB-level dedupe key for unique constraint: phone_normalized + service + date.
 * Used as the canonical lead identity across channels (FB / TG / form).
 */
function buildDedupeKey(normalizedPhone, canonicalService) {
  if (!normalizedPhone) return null;
  const service = (canonicalService && canonicalService !== 'unknown') ? canonicalService : 'any';
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${normalizedPhone}_${service}_${day}`;
}

function buildLeadCreateKey({ phone, email, session_id, service_type, source }) {
  const normPhone = normalizePhone(phone) || '';
  const normEmail = normalizeEmail(email);
  const safeSession = String(session_id || '').trim().slice(0, 128);
  const safeService = normalizeServiceType(service_type || '').slice(0, 64);
  const safeSource = normalizeSource(source || '').slice(0, 32);
  if (!normPhone && !normEmail && !safeSession) return '';
  return [normPhone, normEmail, safeSession, safeService, safeSource].join('|');
}

async function findRecentLeadByNormalizedPhone(normPhone, cutoffIso, serviceType) {
  if (!normPhone) return null;
  const rows = await restGet('leads', {
    select: 'id,phone,service_type',
    created_at: `gte.${cutoffIso}`,
    order: 'created_at.desc',
    limit: '80'
  });
  const match = rows.find((row) => {
    const samePhone = normalizePhone(row?.phone) === normPhone;
    if (!samePhone) return false;
    if (!serviceType) return true;
    return normalizeServiceType(row?.service_type) === serviceType;
  });
  return match?.id || null;
}

async function findDuplicate({ phone, email, session_id, service_type }) {
  const { hasSessionId } = await checkMigration007();
  const normPhone = normalizePhone(phone);
  const normEmail = normalizeEmail(email);

  // Priority 0: Rapid-fire guard — same phone within 60 seconds (any service)
  // Catches race conditions where multiple simultaneous requests bypass dedup
  if (normPhone) {
    const rapidCutoff = new Date(Date.now() - 60 * 1000).toISOString();
    const rapidId = await findRecentLeadByNormalizedPhone(normPhone, rapidCutoff);
    if (rapidId) {
      console.log('[lead-pipeline] Rapid-fire dedup: found recent lead for same phone within 60s');
      return rapidId;
    }
  }

  // Priority 1: Same session_id (most precise — same browser/chat session)
  if (hasSessionId && session_id) {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const rows = await restGet('leads', {
      select: 'id',
      session_id: `eq.${session_id}`,
      created_at: `gte.${cutoff}`,
      order: 'created_at.desc',
      limit: '1'
    });
    if (rows.length) return rows[0].id;
  }

  // Priority 2: Same phone + same service within 2 hours
  if (phone) {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const leadId = await findRecentLeadByNormalizedPhone(normPhone, cutoff, service_type);
    if (leadId) return leadId;
  }

  // Priority 3: Same email + same service within 2 hours
  if (normEmail) {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const rows = await restGet('leads', {
      select: 'id,email,service_type',
      created_at: `gte.${cutoff}`,
      order: 'created_at.desc',
      limit: '80'
    });
    const match = rows.find((row) => {
      const sameEmail = normalizeEmail(row?.email) === normEmail;
      if (!sameEmail) return false;
      if (!service_type) return true;
      return normalizeServiceType(row?.service_type) === service_type;
    });
    if (match?.id) return match.id;
  }

  return null;
}

// Widen session-based dedup to match phone/email window
const DEDUP_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

// ============================================================================
// CREATE OR MERGE LEAD
// ============================================================================

/**
 * Create new lead or merge with existing duplicate
 * Smart merge: fills in missing fields without overwriting
 * Auto-detects migration 007 and adds stage/session_id when available.
 *
 * @param {object} leadData - {phone, email, session_id, source, service_type, ...rest}
 * @returns {Promise<{id: string, isNew: boolean}>} Lead record
 */
async function createOrMergeLead(leadData) {
  const lockKey = buildLeadCreateKey(leadData);
  const cached = getLeadResultCache(lockKey);
  if (cached) return cached;

  if (lockKey && LEAD_CREATE_LOCKS.has(lockKey)) {
    return LEAD_CREATE_LOCKS.get(lockKey);
  }

  const run = (async () => {
  const {
    phone, email, session_id, source, source_details, service_type, name, message, ga4ClientId, is_test,
    // Migration 026 fields
    source_message_id, messenger_psid, telegram_user_id,
    utm_source, utm_medium, utm_campaign, gclid, attribution_source
  } = leadData;
  const normalizedSource = normalizeSource(source);
  const canonicalService = normalizeServiceType(service_type);
  const channel = deriveChannel(normalizedSource, source_details);
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = normalizeEmail(email);

  console.log('[lead-pipeline] createOrMergeLead called:', JSON.stringify({
    phone: normalizedPhone || phone, service_type: canonicalService, source: normalizedSource, channel
  }));

  const { hasStage, hasSessionId } = await checkMigration007();

  const existingId = await findDuplicate({ phone, email, session_id, service_type: canonicalService });

  if (existingId) {
    // Load existing record for smart merge
    const rows = await restGet('leads', { select: '*', id: `eq.${existingId}`, limit: '1' });
    const existing = rows[0] || null;

    if (existing) {
      const updates = { updated_at: new Date().toISOString() };

      // Smart merge: only fill in missing fields
      if (name && !existing.full_name) updates.full_name = name;
      if ((normalizedPhone || phone) && !existing.phone) updates.phone = normalizedPhone || phone;
      if (normalizedEmail && !existing.email) updates.email = normalizedEmail;
      if (hasSessionId && session_id && !existing.session_id) updates.session_id = session_id;
      // Fill channel if missing on existing lead
      if (channel && !existing.channel) updates.channel = channel;

      // Append message history
      if (message) {
        updates.problem_description = (existing.problem_description || '')
          + (existing.problem_description ? '\n---\n' : '')
          + message;
      }

      // Only update if there are actual changes
      if (Object.keys(updates).length > 1) {
        await restPatch('leads', { id: `eq.${existingId}` }, updates);

        await logEvent(existingId, 'merge', {
          merged_fields: Object.keys(updates),
          source: normalizedSource,
          channel
        }).catch(err => console.error('[logEvent merge] Error:', err.message));
      }
    }

    console.log('[lead-pipeline] Merged with existing lead:', existingId);
    return { id: existingId, isNew: false };
  }

  // Create new lead — include stage and session_id only if migration 007 applied
  const newLeadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const insertPayload = {
    id: newLeadId,
    full_name: name || 'Unknown',
    phone: normalizedPhone || phone || null,
    email: normalizedEmail || null,
    service_type: canonicalService !== 'unknown' ? canonicalService : (service_type || null),
    problem_description: message || null,
    source: normalizedSource,
    channel: channel,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  if (is_test === true) {
    insertPayload.is_test = true;
  }
  if (source_details && typeof source_details === 'object') {
    insertPayload.source_details = source_details;
  }

  // Full pipeline fields — only when 007 migration is present
  if (hasStage) insertPayload.stage = 'new';
  if (hasSessionId && session_id) insertPayload.session_id = session_id;

  // Migration 026 fields — stripped by postLeadWithSchemaFallback if columns don't exist yet
  const dedupeKey = buildDedupeKey(normalizedPhone, canonicalService);
  if (dedupeKey) insertPayload.dedupe_key = dedupeKey;
  if (source_message_id) insertPayload.source_message_id = String(source_message_id);
  insertPayload.pipeline_version = PIPELINE_VERSION;
  insertPayload.last_transition_at = insertPayload.created_at;
  if (messenger_psid) insertPayload.messenger_psid = String(messenger_psid);
  if (telegram_user_id) insertPayload.telegram_user_id = Number(telegram_user_id);
  if (utm_source) insertPayload.utm_source = String(utm_source);
  if (utm_medium) insertPayload.utm_medium = String(utm_medium);
  if (utm_campaign) insertPayload.utm_campaign = String(utm_campaign);
  if (gclid) insertPayload.gclid = String(gclid);
  if (attribution_source) insertPayload.attribution_source = String(attribution_source);

  await postLeadWithSchemaFallback(insertPayload);

  console.log('[lead-pipeline] Created new lead:', newLeadId, hasStage ? '(stage: new)' : '(compact mode)',
    `channel=${channel}, service=${canonicalService}`);

  // GA4: enqueue via outbox (guaranteed delivery) with fire-and-forget fallback
  enqueueOutboundJob('ga4_event', newLeadId, {
    event_name: 'lead_created',
    lead_id: newLeadId,
    source: normalizedSource,
    service_type: canonicalService,
    channel,
    client_id: ga4ClientId || `server.${Date.now()}`,
    value: 100
  }, `ga4_lead_created:${newLeadId}`).catch(() => {
    // Fallback: fire-and-forget if outbox table not yet available
    fireGA4('lead_created', { lead_id: newLeadId, source: normalizedSource, service_type: canonicalService, channel }, ga4ClientId || undefined);
  });

  // Link ai_conversations to this lead (fire-and-forget)
  if (session_id) {
    linkConversationToLead(session_id, newLeadId).catch(() => {});
  }

  return { id: newLeadId, isNew: true };
  })();

  if (lockKey) LEAD_CREATE_LOCKS.set(lockKey, run);
  try {
    const result = await run;
    setLeadResultCache(lockKey, result);
    return result;
  } finally {
    if (lockKey) LEAD_CREATE_LOCKS.delete(lockKey);
  }
}

// Optional columns that can be stripped on schema error (not-yet-migrated DB)
const OPTIONAL_LEAD_COLUMNS = [
  'source_details', 'is_test',
  // Migration 026 fields:
  'dedupe_key', 'source_message_id', 'pipeline_version', 'last_transition_at',
  'messenger_psid', 'telegram_user_id',
  'utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'attribution_source'
];

async function postLeadWithSchemaFallback(payload) {
  let nextPayload = { ...payload };
  const maxAttempts = OPTIONAL_LEAD_COLUMNS.length + 2;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await restPost('leads', nextPayload);
      return;
    } catch (err) {
      const message = String(err?.message || '');
      const failedCol = OPTIONAL_LEAD_COLUMNS.find(col =>
        new RegExp(col, 'i').test(message) &&
        Object.prototype.hasOwnProperty.call(nextPayload, col)
      );
      if (failedCol) {
        console.warn(`[lead-pipeline] Schema fallback: stripping column "${failedCol}" (migration pending)`);
        delete nextPayload[failedCol];
        continue;
      }
      throw err;
    }
  }
  throw new Error('postLeadWithSchemaFallback exceeded fallback attempts');
}

// ============================================================================
// STAGE TRANSITIONS
// ============================================================================

const VALID_TRANSITIONS = {
  'new': ['contacted', 'closed'],
  'contacted': ['qualified', 'closed'],
  'qualified': ['quoted', 'closed'],
  'quoted': ['closed']
};

function mapLegacyStatus(newStage, outcome) {
  if (newStage === 'new') return 'new';
  if (newStage === 'contacted') return 'contacted';
  if (newStage === 'qualified') return 'contacted';
  if (newStage === 'quoted') return 'quoted';
  if (newStage === 'closed') return outcome === 'lost' ? 'lost' : 'completed';
  return null;
}

/**
 * Transition lead to new stage with validation
 * Requires migration 007 — returns error if stage column missing.
 *
 * @param {string} leadId - Lead ID
 * @param {string} newStage - Target stage
 * @param {object} data - Stage-specific data
 * @returns {Promise<{success?: boolean, error?: string, stage?: string}>}
 */
async function transitionLead(leadId, newStage, data = {}) {
  const { hasStage } = await checkMigration007();

  if (!hasStage) {
    return { error: 'Stage transitions require migration 007_pipeline_columns.sql', code: 'MIGRATION_REQUIRED' };
  }

  // 1. Get current lead state
  const rows = await restGet('leads', { select: '*', id: `eq.${leadId}`, limit: '1' });
  const lead = rows[0] || null;

  if (!lead) {
    return { error: 'Lead not found', code: 'NOT_FOUND' };
  }

  // 2. Validate transition
  const allowed = VALID_TRANSITIONS[lead.stage];
  if (!allowed || !allowed.includes(newStage)) {
    await logEvent(leadId, 'validation_failed', {
      old_stage: lead.stage,
      attempted: newStage,
      reason: `Invalid: ${lead.stage} -> ${newStage}`
    }).catch(err => console.error('[logEvent validation_failed]', err.message));

    return { error: `Invalid transition: ${lead.stage} -> ${newStage}`, code: 'INVALID_TRANSITION' };
  }

  // 3. Stage-specific requirements
  if (newStage === 'closed' && data.outcome === 'won') {
    if (!data.won_amount || data.won_amount <= 0) {
      return { error: 'WON requires won_amount > 0', code: 'MISSING_WON_AMOUNT' };
    }
    if (!data.quoted_amount && !lead.quoted_amount) {
      return { error: 'WON requires quoted_amount > 0', code: 'MISSING_QUOTED_AMOUNT' };
    }
  }

  if (newStage === 'closed' && data.outcome === 'lost') {
    if (!data.lost_reason || !['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].includes(data.lost_reason)) {
      return { error: 'LOST requires lost_reason (L1-L6)', code: 'INVALID_LOST_REASON' };
    }
  }

  if (newStage === 'closed' && !data.outcome) {
    return { error: 'CLOSED requires outcome (won or lost)', code: 'MISSING_OUTCOME' };
  }

  // 4. Build update
  const now = new Date().toISOString();
  const update = { stage: newStage, updated_at: now, last_transition_at: now };
  const legacyStatus = mapLegacyStatus(newStage, data?.outcome);
  if (legacyStatus) update.status = legacyStatus;

  if (newStage === 'contacted') update.contacted_at = data.contacted_at || now;
  if (newStage === 'qualified') {
    update.qualified_at = data.qualified_at || now;
    if (data.service_type) update.service_type = data.service_type;
  }
  if (newStage === 'quoted') {
    update.quoted_at = data.quoted_at || now;
    if (data.quoted_amount) update.quoted_amount = data.quoted_amount;
  }
  if (newStage === 'closed') {
    update.closed_at = data.closed_at || now;
    update.outcome = data.outcome;
    if (data.outcome === 'won') update.won_amount = data.won_amount;
    if (data.outcome === 'lost') update.lost_reason = data.lost_reason;
    if (data.quoted_amount) update.quoted_amount = data.quoted_amount;
  }

  // 5. Execute
  await restPatch('leads', { id: `eq.${leadId}` }, update);

  // 6. GA4: enqueue via outbox for stage transition
  const ga4Stage = newStage === 'closed'
    ? (data.outcome === 'won' ? 'lead_paid' : 'lead_lost')
    : `lead_${newStage}`;
  enqueueOutboundJob('ga4_event', leadId, {
    event_name: ga4Stage,
    lead_id: leadId,
    source: lead.source || '',
    service_type: lead.service_type || '',
    value: data.won_amount || data.quoted_amount || 0
  }, `ga4_${ga4Stage}:${leadId}`).catch(() => {
    fireGA4(ga4Stage, { lead_id: leadId, source: lead.source || '', service_type: lead.service_type || '', value: data.won_amount || data.quoted_amount || '' });
  });

  return { success: true, stage: newStage };
}

// ============================================================================
// EVENT LOGGING
// ============================================================================

/**
 * Log event for audit trail and debugging
 * Never throws - used for observability
 *
 * @param {string} leadId - Lead ID
 * @param {string} eventType - Type of event
 * @param {object} payload - Event data
 */
async function logEvent(leadId, eventType, payload = {}) {
  if (shouldSkipEventByIdempotency(leadId, eventType, payload)) return;
  try {
    // DB column is `event_data`. Fixed 2026-04-17 (prev used `event_payload`
    // which silently failed with PGRST204 on every call).
    await restPost('lead_events', {
      lead_id: leadId || null,
      event_type: String(eventType || 'unknown_event'),
      event_data: typeof payload === 'object' ? payload : { message: String(payload) }
    });
  } catch (err) {
    console.error('[logEvent] Failed:', err.message);
    // NEVER crash on logging failure
  }
}

// ============================================================================
// OUTBOUND JOBS (durable delivery queue)
// ============================================================================

// Per-channel max_attempts (used when enqueueing)
const JOB_MAX_ATTEMPTS = {
  telegram_owner:  3,
  resend_owner:    5,
  resend_customer: 3,
  ga4_event:       2
};

/**
 * Enqueue a job for guaranteed delivery.
 * Worker (api/process-outbox.js, daily cron + inline drain) picks it up and delivers.
 * Idempotency key (dedup_key) prevents duplicate jobs for the same event.
 * Uses status='queued' + attempt_count=0 (schema from migration 027b+028).
 *
 * @param {string} jobType - 'telegram_owner' | 'resend_owner' | 'resend_customer' | 'ga4_event'
 * @param {string|null} leadId
 * @param {object} payload
 * @param {string} [idempotencyKey]  - stored as dedup_key for DB-level dedup
 */
async function enqueueOutboundJob(jobType, leadId, payload, idempotencyKey) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const maxAttempts = JOB_MAX_ATTEMPTS[jobType] || 3;
  try {
    await restPost('outbound_jobs', {
      id:            jobId,
      lead_id:       leadId || null,
      job_type:      jobType,
      payload:       payload || {},
      status:        'queued',          // uses 027b status model
      attempt_count: 0,                  // 027b column (not 'attempts')
      max_attempts:  maxAttempts,
      locked_at:     null,
      locked_by:     null,
      dedup_key:     idempotencyKey || null,  // 027b unique index (not 'idempotency_key')
      scheduled_at:  new Date().toISOString(),
      created_at:    new Date().toISOString()
    });
    console.log(`[lead-pipeline] Enqueued ${jobType} job ${jobId} (max_attempts=${maxAttempts}) for lead ${leadId || 'N/A'}`);
  } catch (err) {
    // dedup_key unique index conflict → duplicate job, silently ignore
    if (/duplicate|unique/i.test(String(err?.message || ''))) {
      console.log(`[lead-pipeline] Outbound job already enqueued (dedup_key): ${idempotencyKey}`);
      return;
    }
    // Table/column missing (pre-migration) → rethrow so caller falls back to fire-and-forget
    console.warn(`[lead-pipeline] enqueueOutboundJob failed: ${err.message}`);
    throw err;
  }
}

// ============================================================================
// INLINE OUTBOX DRAIN (called after lead capture, processes pending jobs)
// Compensates for Vercel Hobby plan daily-only cron limitation.
// Each incoming request drains pending jobs from the same serverless instance.
// ============================================================================

const DRAIN_LOCK     = globalThis.__HF_DRAIN_LOCK || { running: false, lastRun: 0 };
globalThis.__HF_DRAIN_LOCK = DRAIN_LOCK;
const DRAIN_COOLDOWN_MS    = 30 * 1000; // min 30s between inline drains
const INLINE_WORKER_ID     = `inline-drain:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;
const INLINE_LOCK_TTL_MIN  = 5; // minutes

// Per-channel backoff tiers (seconds), indexed by attempt_count (1-based after claim)
const INLINE_BACKOFF_SECS = {
  telegram_owner:  [0, 120, 480],
  resend_owner:    [0,  60, 180, 600, 1800],
  resend_customer: [0, 120, 480],
  ga4_event:       [0,  60]
};

function jitterMs(baseMs) {
  const jitter = baseMs * 0.2;
  return Math.max(1000, Math.round(baseMs - jitter + Math.random() * jitter * 2));
}

function inlineBackoffSec(jobType, attemptCount) {
  const tiers = INLINE_BACKOFF_SECS[jobType] || [0, 120, 480];
  const base  = tiers[Math.min(attemptCount, tiers.length - 1)] ?? 480;
  const jitter = base * 0.2;
  return Math.max(1, Math.round(base - jitter + Math.random() * jitter * 2));
}

/**
 * Fire-and-forget outbox drain. Call after webhook processing.
 * Processes up to 10 queued jobs inline (non-blocking), 30s cooldown.
 * Compensates for Vercel Hobby plan daily-only cron limitation.
 */
function drainOutboxInline() {
  const now = Date.now();
  if (DRAIN_LOCK.running || now - DRAIN_LOCK.lastRun < DRAIN_COOLDOWN_MS) return;
  DRAIN_LOCK.running = true;
  DRAIN_LOCK.lastRun = now;

  processPendingJobsBatch(10)
    .catch(err => console.warn('[lead-pipeline] drainOutboxInline error:', err.message))
    .finally(() => { DRAIN_LOCK.running = false; });
}

async function processPendingJobsBatch(limit = 10) {
  const config = getConfig();
  if (!config) return;

  // Use outbox_claim_batch (migration 027b) — SKIP LOCKED atomic claim
  const resp = await fetch(`${config.projectUrl}/rest/v1/rpc/outbox_claim_batch`, {
    method: 'POST',
    headers: {
      apikey:         config.serviceRoleKey,
      Authorization:  `Bearer ${config.serviceRoleKey}`,
      Accept:         'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_batch_size:       limit,
      p_worker_id:        INLINE_WORKER_ID,
      p_lock_ttl_minutes: INLINE_LOCK_TTL_MIN
    })
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.warn(`[lead-pipeline] outbox_claim_batch ${resp.status}: ${body.slice(0, 200)}`);
    return;
  }

  const jobs = await resp.json().catch(() => []);
  if (!Array.isArray(jobs) || !jobs.length) return;

  for (const job of jobs) {
    await processOutboundJob(job).catch(err =>
      console.warn(`[lead-pipeline] inline job ${job.id} error:`, err.message)
    );
  }
}

async function processOutboundJob(job) {
  // attempt_count already incremented by outbox_claim_batch
  const attemptCount = Number(job.attempt_count || 1);
  const maxAttempts  = Number(job.max_attempts  || 3);

  let result;
  try {
    result = await dispatchOutboundJob(job);
  } catch (err) {
    result = { ok: false, error: err.message, error_code: 'DISPATCH_ERROR' };
  }

  const config = getConfig();
  if (!config) return;

  if (result.ok) {
    // Use outbox_complete_job stored function (migration 027b)
    await fetch(`${config.projectUrl}/rest/v1/rpc/outbox_complete_job`, {
      method: 'POST',
      headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_job_id: job.id, p_provider_message_id: result.provider_message_id || null })
    }).catch(() => {});
    console.log(`[lead-pipeline] ✓ job ${job.id} (${job.job_type}) sent inline`);
  } else {
    const backoffSec = inlineBackoffSec(job.job_type, attemptCount);
    const errorCode  = String(result.error_code || 'DELIVERY_FAILED').slice(0, 50);
    const errorText  = String(result.error     || 'unknown').slice(0, 500);
    // outbox_fail_job decides retry vs failed_dlq based on attempt_count vs max_attempts
    await fetch(`${config.projectUrl}/rest/v1/rpc/outbox_fail_job`, {
      method: 'POST',
      headers: { apikey: config.serviceRoleKey, Authorization: `Bearer ${config.serviceRoleKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_job_id: job.id, p_error_code: errorCode, p_error_text: errorText, p_retry_backoff_seconds: backoffSec })
    }).catch(() => {});

    if (attemptCount >= maxAttempts) {
      console.error(`[lead-pipeline] ✗ job ${job.id} → failed_dlq after ${attemptCount} attempts`);
    } else {
      console.warn(`[lead-pipeline] ↩ job ${job.id} retry in ${backoffSec}s (attempt ${attemptCount}/${maxAttempts})`);
    }
  }
}

async function dispatchOutboundJob(job) {
  if (job.job_type === 'telegram_owner') {
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set', error_code: 'ENV_MISSING' };
    const send = await unifiedTelegramSend({
      source: 'lead_pipeline',
      leadId: job.lead_id || null,
      text: job.payload?.text || '(no text)',
      token,
      chatId,
      timeoutMs: 4000,
      extra: { job_id: job.id, job_type: job.job_type }
    });
    if (!send.ok) {
      const code = String(send.errorCode || 'TG_UNKNOWN');
      return { ok: false, error: send.errorDescription || code, error_code: code };
    }
    return { ok: true, provider_message_id: String(send.messageId || '') };
  }

  if (job.job_type === 'ga4_event') {
    const mid    = process.env.GA4_MEASUREMENT_ID;
    const secret = process.env.GA4_API_SECRET;
    if (!mid || !secret) return { ok: false, error: 'GA4 env not set', error_code: 'ENV_MISSING' };
    const p = job.payload || {};
    const res = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${mid}&api_secret=${secret}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: p.client_id || `srv.${Date.now()}`, events: [{ name: p.event_name || 'generate_lead', params: { currency: 'USD', value: p.value || 0, lead_id: p.lead_id, source: p.source, service_type: p.service_type } }] })
    });
    if (res.status === 204 || res.ok) return { ok: true, provider_message_id: `ga4_${Date.now()}` };
    return { ok: false, error: `GA4 ${res.status}`, error_code: `GA4_${res.status}` };
  }

  if (job.job_type === 'resend_owner' || job.job_type === 'resend_customer') {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, error: 'RESEND_API_KEY not set', error_code: 'ENV_MISSING' };
    const p = job.payload || {};
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: job.job_type === 'resend_owner' ? 'Handy & Friend Leads <leads@handyandfriend.com>' : 'Handy & Friend <hello@handyandfriend.com>', to: [p.to || (process.env.OWNER_EMAIL || 'hello@handyandfriend.com')], subject: p.subject || 'Lead notification', html: p.html || '<p>Lead notification</p>' })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${data?.message}`, error_code: `RESEND_${res.status}` };
    return { ok: true, provider_message_id: data.id || '' };
  }

  return { ok: false, error: `Unknown job_type: ${job.job_type}`, error_code: 'UNKNOWN_JOB_TYPE' };
}

// ============================================================================
// OWNER ALERT THROTTLE (prevents repeated alerts for same lead)
// ============================================================================

/**
 * Check if an owner alert can be sent for this lead.
 * Returns true if last_owner_alert_at IS NULL or > 1 hour ago.
 * On error, returns true (fail-open: better to over-alert than miss a lead).
 */
async function checkOwnerAlertThrottle(leadId) {
  if (!leadId) return true;
  try {
    const rows = await restGet('leads', {
      select: 'last_owner_alert_at',
      id: `eq.${leadId}`,
      limit: '1'
    });
    const lead = rows[0];
    if (!lead) return true;
    if (!lead.last_owner_alert_at) return true;
    const lastAlert = new Date(lead.last_owner_alert_at).getTime();
    return Date.now() - lastAlert >= OWNER_ALERT_MIN_INTERVAL_MS;
  } catch (err) {
    console.warn('[lead-pipeline] checkOwnerAlertThrottle error:', err.message);
    return true; // fail-open
  }
}

/**
 * Mark that an owner alert was just sent for this lead.
 * Call after successfully sending Telegram/email notification to owner.
 */
async function markOwnerAlerted(leadId) {
  if (!leadId) return;
  try {
    const now = new Date().toISOString();
    await restPatch('leads', { id: `eq.${leadId}` }, {
      last_owner_alert_at: now,
      updated_at: now
    });
  } catch (err) {
    console.warn('[lead-pipeline] markOwnerAlerted error:', err.message);
  }
}

// ============================================================================
// CONVERSATION ↔ LEAD LINK
// ============================================================================

/**
 * Link ai_conversations rows to a lead by session_id.
 * Called after createOrMergeLead so conversations are queryable by lead.
 */
async function linkConversationToLead(sessionId, leadId) {
  if (!sessionId || !leadId) return;
  try {
    await restPatch('ai_conversations',
      { session_id: `eq.${sessionId}` },
      { lead_id: leadId }
    );
  } catch (err) {
    // Column may not exist before migration 026 — safe to ignore
    console.warn('[lead-pipeline] linkConversationToLead error (migration pending?):', err.message);
  }
}

// ============================================================================
// UNIFIED LEAD SYSTEM v3 — processInbound entry point
// ============================================================================

const { formatNewLeadAlert, formatLeadUpdateAlert } = require('./alert-formats.js');
const { updateConversationSummary, appendLeadSource } = require('./conversation.js');

/**
 * Multi-key lead lookup. Priority: phone → email → source+source_user_id.
 * Returns { lead, match_type } or null.
 *
 * @param {import('./inbound-envelope').InboundMessageEnvelope} envelope
 */
async function findExistingLead(envelope) {
  const { lead_phone, lead_email, source, source_user_id } = envelope;

  // 1. Phone match (strongest signal)
  if (lead_phone) {
    const rows = await restGet('leads', {
      select: '*',
      phone:  `eq.${lead_phone}`,
      limit:  '1'
    }).catch(() => []);
    if (rows[0]) return { lead: rows[0], match_type: 'phone' };
  }

  // 2. Email match
  if (lead_email) {
    const rows = await restGet('leads', {
      select: '*',
      email:  `eq.${lead_email}`,
      limit:  '1'
    }).catch(() => []);
    if (rows[0]) return { lead: rows[0], match_type: 'email' };
  }

  // 3. source + source_user_id match (same person, same platform, prior interaction)
  if (source_user_id && source) {
    const events = await restGet('lead_events', {
      select:         'lead_id',
      source_user_id: `eq.${source_user_id}`,
      limit:          '1'
    }).catch(() => []);
    const leadId = events[0]?.lead_id;
    if (leadId) {
      const rows = await restGet('leads', {
        select: '*',
        id:     `eq.${leadId}`,
        limit:  '1'
      }).catch(() => []);
      if (rows[0]) return { lead: rows[0], match_type: 'source_user' };
    }
  }

  return null; // New lead
}

/**
 * Enqueue all side-effects after lead creation/merge.
 * ONLY place where Telegram alerts are enqueued from the pipeline.
 * Never calls Telegram directly.
 *
 * @param {object} lead - lead row (id, phone, status, etc.)
 * @param {import('./inbound-envelope').InboundMessageEnvelope} envelope
 * @param {boolean} isNew - true if lead was just created
 */
async function enqueueSideEffects(lead, envelope, isNew) {
  const hour = Math.floor(Date.now() / 3_600_000);

  // 1. Owner Telegram alert
  const canAlert = await checkOwnerAlertThrottle(lead.id).catch(() => true);
  if (canAlert) {
    const text = isNew
      ? formatNewLeadAlert(lead, envelope)
      : formatLeadUpdateAlert(lead, envelope);

    const dedupKey = isNew
      ? `new_lead_alert:${lead.id}:${hour}`
      : `lead_update_alert:${lead.id}:${String(envelope.raw_text || '').slice(0, 20).replace(/\s/g,'')}:${hour}`;

    await enqueueOutboundJob('telegram_owner', lead.id, { text }, dedupKey)
      .then(() => markOwnerAlerted(lead.id).catch(() => {}))
      .catch(() => {
        // Table not yet available — fire direct fallback silently
        const token  = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (token && chatId) {
          unifiedTelegramSend({
            source: 'lead_pipeline',
            leadId: lead.id,
            text,
            token,
            chatId,
            timeoutMs: 4000,
            extra: { fallback: true, stage: isNew ? 'new_lead_alert' : 'lead_update_alert' }
          }).then((send) => {
            if (send.ok) return markOwnerAlerted(lead.id).catch(() => {});
            return null;
          }).catch(() => {});
        }
      });
  }

  // 2. GA4 event
  const ga4Event = isNew ? 'lead_created' : 'lead_activity';
  await enqueueOutboundJob('ga4_event', lead.id, {
    event_name:   ga4Event,
    lead_id:      lead.id,
    source:       envelope.source,
    service_type: envelope.service_hint || lead.service_type || '',
    value:        isNew ? 100 : 0,
    client_id:    `server.${Date.now()}`
  }, `ga4_${ga4Event}:${lead.id}:${hour}`).catch(() => {
    fireGA4(ga4Event, { lead_id: lead.id, source: envelope.source, service_type: envelope.service_hint || '' });
  });
}

/**
 * Unified inbound entry point. Call from ALL API routes.
 * Normalizes via envelope, deduplicates, creates/merges lead,
 * logs event, enqueues side-effects, updates conversation intelligence.
 *
 * @param {import('./inbound-envelope').InboundMessageEnvelope} envelope
 * @returns {Promise<{id: string, isNew: boolean, matchType: string|null}>}
 */
async function processInbound(envelope) {
  const now = new Date().toISOString();

  // 1. Multi-key dedupe
  const existing = await findExistingLead(envelope);

  if (existing) {
    const { lead, match_type } = existing;

    // Update stale fields (never downgrade)
    const updates = { last_inbound_at: now, updated_at: now };
    if (!lead.full_name && envelope.lead_name) updates.full_name = envelope.lead_name;
    if (!lead.phone    && envelope.lead_phone) updates.phone    = envelope.lead_phone;
    if (!lead.email    && envelope.lead_email) updates.email    = envelope.lead_email;

    await restPatch('leads', { id: `eq.${lead.id}` }, updates).catch(() => {});

    // Append source if new channel
    appendLeadSource(lead.id, envelope.source).catch(() => {});

    // Log inbound event
    logEvent(lead.id, `${envelope.source}_inbound`, {
      source_user_id:    envelope.source_user_id,
      source_message_id: envelope.source_message_id,
      raw_text:          String(envelope.raw_text || '').slice(0, 500),
      service_hint:      envelope.service_hint,
      match_type,
      idempotency_key:   envelope.source_message_id
        ? `inbound:${envelope.source_message_id}`
        : `inbound:${envelope.source}:${lead.id}:${now}`
    }).catch(() => {});

    // Side effects (alert owner, GA4)
    await enqueueSideEffects(lead, envelope, false).catch(() => {});

    // Update conversation intelligence (fire-and-forget)
    updateConversationSummary(lead.id, envelope, lead).catch(() => {});

    // Drain outbox inline
    drainOutboxInline();

    return { id: lead.id, isNew: false, matchType: match_type };
  }

  // 2. New lead — use existing createOrMergeLead logic
  const normalizedSource = normalizeSource(envelope.source);
  const canonicalService = normalizeServiceType(envelope.service_hint || 'unknown');

  const result = await createOrMergeLead({
    name:             envelope.lead_name || 'Unknown',
    phone:            envelope.lead_phone || '',
    email:            envelope.lead_email || '',
    service_type:     canonicalService,
    message:          envelope.raw_text,
    source:           normalizedSource,
    session_id:       envelope.source_thread_id,
    messenger_psid:   envelope.source === 'facebook' ? envelope.source_user_id : undefined,
    telegram_user_id: envelope.source === 'telegram' ? Number(envelope.source_user_id) || undefined : undefined,
    source_message_id: envelope.source_message_id,
    utm_source:       envelope.attribution?.utm_source,
    utm_medium:       envelope.attribution?.utm_medium,
    utm_campaign:     envelope.attribution?.utm_campaign,
    gclid:            envelope.attribution?.gclid,
    attribution_source: envelope.attribution?.referrer || envelope.source
  });

  // Set last_inbound_at and initial source array
  await restPatch('leads', { id: `eq.${result.id}` }, {
    last_inbound_at: now,
    sources:         [envelope.source]
  }).catch(() => {});

  // Get the full lead row for alert formatting
  const leadRows = await restGet('leads', { select: '*', id: `eq.${result.id}`, limit: '1' }).catch(() => []);
  const newLead  = leadRows[0] || { id: result.id, phone: envelope.lead_phone, service_type: canonicalService, status: 'new' };

  // Log with source_user_id
  logEvent(result.id, `${envelope.source}_inbound`, {
    source_user_id:    envelope.source_user_id,
    source_message_id: envelope.source_message_id,
    raw_text:          String(envelope.raw_text || '').slice(0, 500),
    service_hint:      envelope.service_hint,
    idempotency_key:   envelope.source_message_id
      ? `inbound:${envelope.source_message_id}`
      : `inbound:${envelope.source}:${result.id}:${now}`
  }).catch(() => {});

  // Side effects (new lead → alert owner, GA4)
  await enqueueSideEffects(newLead, envelope, true).catch(() => {});

  // Update conversation intelligence (fire-and-forget)
  updateConversationSummary(result.id, envelope, newLead).catch(() => {});

  drainOutboxInline();

  return { id: result.id, isNew: true, matchType: null };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  normalizeSource,
  normalizeServiceType,
  deriveChannel,
  findDuplicate,
  createOrMergeLead,
  transitionLead,
  logEvent,
  checkMigration007,
  // Migration 026
  checkOwnerAlertThrottle,
  markOwnerAlerted,
  linkConversationToLead,
  buildDedupeKey,
  enqueueOutboundJob,
  drainOutboxInline,
  // Unified Lead System v3
  processInbound,
  findExistingLead,
  enqueueSideEffects
};
