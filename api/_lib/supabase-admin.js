const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getConfig() {
  const projectUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!projectUrl || !serviceRoleKey) {
    return null;
  }

  return { projectUrl, serviceRoleKey };
}

function buildHeaders(config, extra = {}) {
  return {
    apikey: config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra
  };
}

async function restInsert(table, rows, options = {}) {
  const config = getConfig();
  if (!config) {
    return { ok: false, skipped: true, error: 'supabase_not_configured' };
  }

  const payload = Array.isArray(rows) ? rows : [rows];
  const query = options.returning === false ? 'return=minimal' : 'return=representation';
  const response = await fetch(`${config.projectUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers: buildHeaders(config, {
      'Content-Type': 'application/json',
      Prefer: query
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { ok: false, error: `postgrest_${response.status}`, details: body.slice(0, 500) };
  }

  if (options.returning === false) {
    return { ok: true, data: null };
  }

  const data = await response.json().catch(() => null);
  return { ok: true, data };
}

async function logLeadEvent(leadId, eventType, eventPayload = {}) {
  return restInsert('lead_events', {
    lead_id: leadId || null,
    event_type: String(eventType || 'unknown_event'),
    event_payload: sanitizeEventPayload(eventPayload)
  }, { returning: false });
}

function sanitizeEventPayload(value) {
  if (!value || typeof value !== 'object') return {};
  const copy = JSON.parse(JSON.stringify(value));
  if (copy.botToken) copy.botToken = '[redacted]';
  if (copy.authorization) copy.authorization = '[redacted]';
  if (copy.serviceRoleKey) copy.serviceRoleKey = '[redacted]';
  return copy;
}

function sanitizeFileName(name) {
  const clean = String(name || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'photo.jpg';
}

function inferMimeFromDataUrl(dataUrl, fallback) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(String(dataUrl || ''));
  return match ? match[1].toLowerCase() : String(fallback || 'image/jpeg').toLowerCase();
}

function decodeDataUrl(dataUrl) {
  const str = String(dataUrl || '');
  const commaIdx = str.indexOf(',');
  if (commaIdx === -1) return null;
  const base64 = str.slice(commaIdx + 1);
  try {
    const buffer = Buffer.from(base64, 'base64');
    return buffer.length ? buffer : null;
  } catch (_) {
    return null;
  }
}

async function uploadLeadPhoto({ leadId, photo, now = new Date() }) {
  const config = getConfig();
  if (!config) {
    return { ok: false, skipped: true, error: 'supabase_not_configured' };
  }

  if (!leadId) {
    return { ok: false, error: 'missing_lead_id' };
  }

  const mimeType = inferMimeFromDataUrl(photo?.dataUrl, photo?.mimeType);
  if (!ALLOWED_MIME.has(mimeType)) {
    return { ok: false, error: 'unsupported_mime_type' };
  }

  const data = decodeDataUrl(photo?.dataUrl);
  if (!data) {
    return { ok: false, error: 'invalid_photo_data' };
  }

  if (data.length > MAX_PHOTO_BYTES) {
    return { ok: false, error: 'file_too_large' };
  }

  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const fileName = sanitizeFileName(photo?.name);
  const filePath = `lead-photos/${year}/${month}/${leadId}/${cryptoRandomId()}-${fileName}`;

  const uploadRes = await fetch(`${config.projectUrl}/storage/v1/object/${filePath}`, {
    method: 'POST',
    headers: buildHeaders(config, {
      'Content-Type': mimeType,
      'x-upsert': 'false'
    }),
    body: data
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.text().catch(() => '');
    return { ok: false, error: `storage_upload_${uploadRes.status}`, details: body.slice(0, 500) };
  }

  const objectData = await uploadRes.json().catch(() => ({}));

  const photoInsert = await restInsert('lead_photos', {
    lead_id: leadId,
    file_path: filePath,
    file_name: fileName,
    mime_type: mimeType,
    file_size: data.length
  }, { returning: true });

  if (!photoInsert.ok) {
    return { ok: false, error: photoInsert.error || 'lead_photos_insert_failed', details: photoInsert.details || '' };
  }

  return {
    ok: true,
    data: {
      filePath,
      fileName,
      mimeType,
      fileSize: data.length,
      storage: objectData,
      row: photoInsert.data && photoInsert.data[0] ? photoInsert.data[0] : null
    }
  };
}

async function createSignedObjectUrl(filePath, expiresIn = 3600) {
  const config = getConfig();
  if (!config) {
    return { ok: false, skipped: true, error: 'supabase_not_configured' };
  }

  const response = await fetch(`${config.projectUrl}/storage/v1/object/sign/${filePath}`, {
    method: 'POST',
    headers: buildHeaders(config, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ expiresIn })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    return { ok: false, error: `storage_sign_${response.status}`, details: body.slice(0, 500) };
  }

  const data = await response.json().catch(() => null);
  if (!data || !data.signedURL) {
    return { ok: false, error: 'signed_url_missing' };
  }

  const signedUrl = `${config.projectUrl}/storage/v1${data.signedURL}`;
  return { ok: true, data: { signedUrl, token: data.token, path: filePath } };
}

function cryptoRandomId() {
  const source = 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx';
  return source.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

module.exports = {
  getConfig,
  restInsert,
  logLeadEvent,
  uploadLeadPhoto,
  createSignedObjectUrl
};
