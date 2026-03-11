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
// GA4 MEASUREMENT PROTOCOL (server-side tracking)
// ============================================================================

const { trackLeadEvent } = require('./ga4-mp');

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
  const { phone, email, session_id, source, source_details, service_type, name, message, ga4ClientId } = leadData;
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
  if (source_details && typeof source_details === 'object') {
    insertPayload.source_details = source_details;
  }

  // Full pipeline fields — only when 007 migration is present
  if (hasStage) insertPayload.stage = 'new';
  if (hasSessionId && session_id) insertPayload.session_id = session_id;

  await postLeadWithSchemaFallback(insertPayload);

  console.log('[lead-pipeline] Created new lead:', newLeadId, hasStage ? '(stage: new)' : '(compact mode)',
    `channel=${channel}, service=${canonicalService}`);

  // GA4 server-side: track lead creation (with browser client_id for session linking)
  fireGA4('lead_created', {
    lead_id: newLeadId,
    source: normalizedSource,
    service_type: canonicalService,
    channel: channel,
  }, ga4ClientId || undefined);

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

async function postLeadWithSchemaFallback(payload) {
  try {
    await restPost('leads', payload);
    return;
  } catch (err) {
    const message = String(err?.message || '');
    if (/source_details/i.test(message)) {
      const nextPayload = { ...payload };
      delete nextPayload.source_details;
      await restPost('leads', nextPayload);
      return;
    }
    throw err;
  }
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
  const update = { stage: newStage, updated_at: now };
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

  // 6. GA4 server-side: track stage transition (logging handled inside fireGA4)
  const ga4Stage = newStage === 'closed'
    ? (data.outcome === 'won' ? 'lead_paid' : 'lead_lost')
    : `lead_${newStage}`;
  fireGA4(ga4Stage, {
    lead_id: leadId,
    source: lead.source || '',
    service_type: lead.service_type || '',
    value: data.won_amount || data.quoted_amount || '',
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
    await restPost('lead_events', {
      lead_id: leadId || null,
      event_type: String(eventType || 'unknown_event'),
      event_payload: typeof payload === 'object' ? payload : { message: String(payload) }
    });
  } catch (err) {
    console.error('[logEvent] Failed:', err.message);
    // NEVER crash on logging failure
  }
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
  checkMigration007
};
