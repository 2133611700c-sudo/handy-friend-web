/**
 * Lead context store for one-tap replies.
 * Uses in-memory cache + optional Firestore (if FIREBASE_CONFIG is configured).
 */

const memoryStore = globalThis.__HF_LEAD_CONTEXTS || new Map();
globalThis.__HF_LEAD_CONTEXTS = memoryStore;
const warnedStorage = globalThis.__HF_STORAGE_WARNING_SENT || { value: false };
globalThis.__HF_STORAGE_WARNING_SENT = warnedStorage;
const TTL_DAYS = Number(process.env.LEAD_CONTEXT_TTL_DAYS || 14);
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

function sanitizePhone(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function normalizeLeadContext(raw) {
  if (!raw || !raw.leadId) return null;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
  const phoneE164 = sanitizePhone(raw.phone);
  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments.slice(0, 6).map((item) => ({
      name: String(item?.name || 'photo.jpg'),
      type: String(item?.type || 'image/jpeg'),
      size: Number(item?.size || 0)
    }))
    : [];
  const statusHistory = Array.isArray(raw.statusHistory)
    ? raw.statusHistory.slice(-25)
    : [];

  return {
    leadId: String(raw.leadId),
    name: String(raw.name || ''),
    phone: phoneE164,
    phoneE164,
    zip: String(raw.zip || ''),
    preferredContact: String(raw.preferredContact || 'call'),
    service: String(raw.service || ''),
    lang: String(raw.lang || 'en'),
    source: String(raw.source || ''),
    attachments,
    statusHistory,
    createdAt: raw.createdAt || nowIso,
    updatedAt: nowIso,
    expiresAt
  };
}

function isContextExpired(context) {
  if (!context || !context.expiresAt) return false;
  const ts = Date.parse(context.expiresAt);
  return Number.isFinite(ts) && ts < Date.now();
}

async function getFirestoreDb() {
  if (!process.env.FIREBASE_CONFIG) return null;
  const config = JSON.parse(process.env.FIREBASE_CONFIG);
  const admin = await import('firebase-admin');
  if (!admin.default.apps || admin.default.apps.length === 0) {
    admin.default.initializeApp({
      credential: admin.default.credential.cert(config)
    });
  }
  return admin.default.firestore();
}

async function saveLeadContext(raw) {
  const context = normalizeLeadContext(raw);
  if (!context || !context.phone) return false;

  const existing = memoryStore.get(context.leadId) || null;
  if (existing?.statusHistory?.length) {
    context.statusHistory = existing.statusHistory.slice(-25);
  }
  if (raw?.statusEvent) {
    context.statusHistory = [...(context.statusHistory || []), {
      ts: new Date().toISOString(),
      action: String(raw.statusEvent.action || ''),
      status: String(raw.statusEvent.status || ''),
      by: String(raw.statusEvent.by || '')
    }].slice(-25);
  }

  memoryStore.set(context.leadId, context);

  const isProd = process.env.VERCEL_ENV === 'production';
  if (isProd && !process.env.FIREBASE_CONFIG && !warnedStorage.value) {
    warnedStorage.value = true;
    console.error('[LEAD_CONTEXT_STORAGE_WARNING] FIREBASE_CONFIG is missing in production. Durable storage disabled.');
  }

  try {
    const db = await getFirestoreDb();
    if (db) {
      await db.collection('lead_contexts').doc(context.leadId).set(context, { merge: true });
    }
  } catch (err) {
    console.error('[LEAD_CONTEXT_SAVE_ERROR]', err.message);
  }

  return true;
}

async function loadLeadContext(leadId) {
  const key = String(leadId || '');
  if (!key) return null;

  if (memoryStore.has(key)) {
    const cached = memoryStore.get(key);
    if (isContextExpired(cached)) {
      memoryStore.delete(key);
      return null;
    }
    return cached;
  }

  try {
    const db = await getFirestoreDb();
    if (!db) return null;
    const doc = await db.collection('lead_contexts').doc(key).get();
    if (!doc.exists) return null;
    const data = doc.data() || null;
    if (isContextExpired(data)) {
      try {
        await db.collection('lead_contexts').doc(key).delete();
      } catch (cleanupErr) {
        console.error('[LEAD_CONTEXT_TTL_CLEANUP_ERROR]', cleanupErr.message);
      }
      return null;
    }
    if (data) {
      memoryStore.set(key, data);
    }
    return data;
  } catch (err) {
    console.error('[LEAD_CONTEXT_LOAD_ERROR]', err.message);
    return null;
  }
}

module.exports = {
  saveLeadContext,
  loadLeadContext,
  sanitizePhone,
  isContextExpired
};
