const buckets = globalThis.__HF_RATE_BUCKETS || new Map();
globalThis.__HF_RATE_BUCKETS = buckets;

let requestCounter = globalThis.__HF_RATE_COUNTER || 0;
globalThis.__HF_RATE_COUNTER = requestCounter;

function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xfwd) ? xfwd[0] : String(xfwd || '');
  const first = raw.split(',')[0].trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit({ key, limit, windowMs }) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    cleanupIfNeeded(now);
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSec };
  }

  bucket.count += 1;
  return { ok: true, remaining: Math.max(0, limit - bucket.count), retryAfterSec: 0 };
}

function cleanupIfNeeded(now) {
  requestCounter += 1;
  globalThis.__HF_RATE_COUNTER = requestCounter;
  if (requestCounter % 200 !== 0) return;

  for (const [key, bucket] of buckets.entries()) {
    if (!bucket || bucket.expiresAt <= now) {
      buckets.delete(key);
    }
  }
}

module.exports = {
  getClientIp,
  checkRateLimit
};

