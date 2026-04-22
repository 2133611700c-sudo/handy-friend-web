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

function isOwnerDeliveryEvent(row) {
  if (!row) return false;
  if (String(row.event_type || '').trim().toLowerCase() !== 'telegram_sent') return false;
  const leadId = String(row.lead_id || '').trim();
  if (!leadId || leadId === 'watchdog_system') return false;

  const data = row.event_data && typeof row.event_data === 'object' ? row.event_data : {};
  const hasMessageId = Number.isFinite(Number(data.message_id));
  const hasSendId = Number.isFinite(Number(data.telegram_send_id));
  const hasTelegramOk = data.telegram_ok === true;
  return hasMessageId || hasSendId || hasTelegramOk;
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

function getLosAngelesDayKey(nowMs) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = dtf.formatToParts(new Date(Number(nowMs || Date.now())));
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}

function hasRecentReportDay(rows, category, dayKey) {
  if (!Array.isArray(rows) || !dayKey) return false;
  const safeCategory = String(category || '').trim();
  return rows.some((row) => {
    if (!row || row.ok !== true) return false;
    if (String(row.source || '') !== 'process_outbox') return false;
    const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
    return String(extra.category || '') === safeCategory && String(extra.report_day_key || '') === dayKey;
  });
}

function buildOwnerProofCounts(sends, events) {
  const proofCounts = new Map();

  const safeSends = Array.isArray(sends) ? sends : [];
  for (const row of safeSends) {
    if (!isOwnerDeliveryProof(row)) continue;
    const leadId = String(row.lead_id || '').trim();
    if (!leadId) continue;
    proofCounts.set(leadId, (proofCounts.get(leadId) || 0) + 1);
  }

  const safeEvents = Array.isArray(events) ? events : [];
  for (const row of safeEvents) {
    if (!isOwnerDeliveryEvent(row)) continue;
    const leadId = String(row.lead_id || '').trim();
    if (!leadId) continue;
    proofCounts.set(leadId, (proofCounts.get(leadId) || 0) + 1);
  }

  return proofCounts;
}

module.exports = {
  isOwnerDeliveryProof,
  isOwnerDeliveryEvent,
  computeDigestHash,
  hasRecentDigest,
  getLosAngelesDayKey,
  hasRecentReportDay,
  buildOwnerProofCounts
};
