'use strict';

const { createHash } = require('crypto');

function isOwnerDeliveryProof(row) {
  if (!row || row.ok !== true) return false;
  if (!Number.isFinite(Number(row.telegram_message_id))) return false;
  if (!String(row.lead_id || '').trim()) return false;

  const source = String(row.source || '').trim().toLowerCase();
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  const jobType = String(extra.job_type || '').trim().toLowerCase();
  const step = String(extra.step || '').trim().toLowerCase();
  const via = String(extra.via || '').trim().toLowerCase();

  if (source === 'process_outbox' && jobType === 'telegram_owner') return true;
  if (source === 'ai_chat' && (step === 'sales_card' || step === 'lead_captured_legacy')) return true;
  if (source === 'lead_pipeline') return true;
  if (source === 'notify' && via === 'api_notify') return true;
  return false;
}

function computeDigestHash(text) {
  return createHash('sha256').update(String(text || '')).digest('hex').slice(0, 24);
}

function hasRecentDigest(rows, category, digestHash, nowMs, windowMs) {
  if (!Array.isArray(rows) || !digestHash) return false;
  const safeCategory = String(category || '').trim();
  const now = Number(nowMs || Date.now());
  const window = Number(windowMs || 0);

  return rows.some((row) => {
    if (!row || row.ok !== true) return false;
    if (String(row.source || '') !== 'process_outbox') return false;
    const createdAt = row.created_at ? Date.parse(String(row.created_at)) : NaN;
    if (!Number.isFinite(createdAt)) return false;
    if (window > 0 && (now - createdAt) > window) return false;
    const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
    return String(extra.category || '') === safeCategory && String(extra.digest_hash || '') === digestHash;
  });
}

module.exports = {
  isOwnerDeliveryProof,
  computeDigestHash,
  hasRecentDigest
};
