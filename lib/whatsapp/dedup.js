/**
 * Atomic dedupe via Supabase REST. Uses whatsapp_messages.wamid UNIQUE constraint.
 *
 * Required schema (migration: migrations/whatsapp_cloud_api.sql):
 *   CREATE TABLE IF NOT EXISTS whatsapp_messages (
 *     id BIGSERIAL PRIMARY KEY,
 *     wamid TEXT UNIQUE,
 *     direction TEXT NOT NULL,         -- 'in' | 'out'
 *     phone_number TEXT,
 *     thread_id TEXT,
 *     body TEXT,
 *     media JSONB,
 *     status TEXT,
 *     draft_text TEXT,
 *     approved_by TEXT,
 *     approved_at TIMESTAMPTZ,
 *     created_at TIMESTAMPTZ DEFAULT now(),
 *     delivered_at TIMESTAMPTZ,
 *     read_at TIMESTAMPTZ,
 *     failed_reason TEXT,
 *     raw JSONB
 *   );
 */
const SB_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const TABLE = 'whatsapp_messages';

function headers(extra = {}) {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
}

async function sbSelect(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: headers() });
  if (!r.ok) throw new Error(`Supabase SELECT ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbInsert(table, row, opts = {}) {
  const prefer = opts.upsertOnConflict
    ? `resolution=ignore-duplicates,return=representation`
    : 'return=representation';
  const url = `${SB_URL}/rest/v1/${table}` + (opts.upsertOnConflict ? `?on_conflict=${opts.upsertOnConflict}` : '');
  const r = await fetch(url, {
    method: 'POST',
    headers: headers({ Prefer: prefer }),
    body: JSON.stringify(Array.isArray(row) ? row : [row]),
  });
  if (!r.ok) {
    const txt = await r.text();
    const e = new Error(`Supabase INSERT ${r.status}: ${txt}`);
    e.httpStatus = r.status;
    e.body = txt;
    throw e;
  }
  return r.json();
}

async function sbUpdate(table, patch, filter) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`Supabase UPDATE ${r.status}: ${await r.text()}`);
  return r.json();
}

async function recordInbound({ wamid, from, to, body, media, type, contextWamid, pushName }) {
  if (!wamid) throw new Error('recordInbound: wamid required');
  try {
    // Atomic insert with on_conflict=wamid → returns [] if duplicate, [row] if new
    const inserted = await sbInsert(TABLE, {
      wamid,
      direction: 'in',
      phone_number: from,
      thread_id: `wa_${from}`,
      body: String(body || '').slice(0, 4000),
      media: media || null,
      status: 'received',
      raw: { type, contextWamid, pushName, to },
    }, { upsertOnConflict: 'wamid' });
    if (!inserted || inserted.length === 0) {
      return { isDuplicate: true, row: null };
    }
    return { isDuplicate: false, row: inserted[0] };
  } catch (err) {
    console.warn(JSON.stringify({ component: 'dedup', warn: 'recordInbound failed', wamid, err: String(err).slice(0, 200) }));
    throw err;
  }
}

async function updateStatus({ wamid, status, timestamp, errorReason }) {
  if (!wamid || !status) return null;
  const patch = { status };
  if (status === 'delivered') patch.delivered_at = new Date((timestamp || Date.now() / 1000) * 1000).toISOString();
  if (status === 'read') patch.read_at = new Date((timestamp || Date.now() / 1000) * 1000).toISOString();
  if (status === 'failed' && errorReason) patch.failed_reason = String(errorReason).slice(0, 500);
  try {
    return await sbUpdate(TABLE, patch, `wamid=eq.${encodeURIComponent(wamid)}`);
  } catch (err) {
    console.warn(JSON.stringify({ component: 'dedup', warn: 'updateStatus failed', wamid, err: String(err).slice(0, 200) }));
    return null;
  }
}

async function recordOutbound({ wamid, to, body, status = 'sent', approvedBy = null, draftText = null }) {
  try {
    return await sbInsert(TABLE, {
      wamid,
      direction: 'out',
      phone_number: to,
      thread_id: `wa_${to}`,
      body,
      status,
      approved_by: approvedBy,
      approved_at: approvedBy ? new Date().toISOString() : null,
      draft_text: draftText,
    });
  } catch (err) {
    console.warn(JSON.stringify({ component: 'dedup', warn: 'recordOutbound failed', err: String(err).slice(0, 200) }));
    return null;
  }
}

module.exports = { recordInbound, updateStatus, recordOutbound, TABLE };
