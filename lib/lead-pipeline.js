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
 * AUTO-MIGRATION DETECTION:
 * Queries information_schema at startup to detect whether 007_pipeline_columns.sql
 * has been run. Enables stage/session_id features automatically once migration exists.
 * No code changes needed after running the migration.
 */

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
  'nextdoor', 'google_business', 'yelp', 'other'
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
// DEDUPLICATION (SOFT DEDUP)
// ============================================================================

/**
 * Find duplicate lead by phone, email, or session_id
 * Uses session_id dedup only if migration 007 has been applied.
 *
 * @param {object} params - {phone, email, session_id, service_type}
 * @returns {Promise<string|null>} Lead ID if duplicate found, null otherwise
 */
async function findDuplicate({ phone, email, session_id, service_type }) {
  const { hasSessionId } = await checkMigration007();

  // Priority 1: Same session_id (most precise — same browser/chat session)
  if (hasSessionId && session_id) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const rows = await restGet('leads', {
      select: 'id',
      session_id: `eq.${session_id}`,
      created_at: `gte.${cutoff}`,
      order: 'created_at.desc',
      limit: '1'
    });
    if (rows.length) return rows[0].id;
  }

  // Priority 2: Same phone + same service within 15 min
  if (phone) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const params = {
      select: 'id',
      phone: `eq.${phone}`,
      created_at: `gte.${cutoff}`,
      order: 'created_at.desc',
      limit: '1'
    };
    if (service_type) params.service_type = `eq.${service_type}`;
    const rows = await restGet('leads', params);
    if (rows.length) return rows[0].id;
  }

  // Priority 3: Same email + same service within 15 min
  if (email) {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const params = {
      select: 'id',
      email: `eq.${email}`,
      created_at: `gte.${cutoff}`,
      order: 'created_at.desc',
      limit: '1'
    };
    if (service_type) params.service_type = `eq.${service_type}`;
    const rows = await restGet('leads', params);
    if (rows.length) return rows[0].id;
  }

  return null;
}

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
  const { phone, email, session_id, source, service_type, name, message } = leadData;
  const normalizedSource = normalizeSource(source);

  console.log('[lead-pipeline] createOrMergeLead called:', JSON.stringify({ phone, service_type, source: normalizedSource }));

  const { hasStage, hasSessionId } = await checkMigration007();

  const existingId = await findDuplicate({ phone, email, session_id, service_type });

  if (existingId) {
    // Load existing record for smart merge
    const rows = await restGet('leads', { select: '*', id: `eq.${existingId}`, limit: '1' });
    const existing = rows[0] || null;

    if (existing) {
      const updates = { updated_at: new Date().toISOString() };

      // Smart merge: only fill in missing fields
      if (name && !existing.full_name) updates.full_name = name;
      if (phone && !existing.phone) updates.phone = phone;
      if (email && !existing.email) updates.email = email;
      if (hasSessionId && session_id && !existing.session_id) updates.session_id = session_id;

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
          source: normalizedSource
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
    phone: phone || null,
    email: email || null,
    service_type: service_type || null,
    problem_description: message || null,
    source: normalizedSource,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Full pipeline fields — only when 007 migration is present
  if (hasStage) insertPayload.stage = 'new';
  if (hasSessionId && session_id) insertPayload.session_id = session_id;

  await restPost('leads', insertPayload);

  console.log('[lead-pipeline] Created new lead:', newLeadId, hasStage ? '(stage: new)' : '(compact mode)');
  return { id: newLeadId, isNew: true };
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
  findDuplicate,
  createOrMergeLead,
  transitionLead,
  logEvent,
  checkMigration007
};
