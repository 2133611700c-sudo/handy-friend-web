/**
 * Pricing policy helpers shared by diagnostics and tests.
 */

function analyzeMessengerPricingPolicy(postbacks, matrix) {
  const texts = Object.values(postbacks || {}).map((v) => String(v || ''));
  const joined = texts.join('\n');

  const amounts = [...joined.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n));

  if (!amounts.length) {
    return {
      ok: true,
      status: 'PASS_GATED',
      reason: 'gated_no_price_leak',
      leaked_tokens: []
    };
  }

  const leakedSet = new Set(amounts);
  const leakedTokens = [...leakedSet].sort((a, b) => a - b);
  const legacyLeaks = leakedTokens.filter((n) => n === 60 || n === 30);
  if (legacyLeaks.length) {
    return {
      ok: false,
      status: 'FAIL',
      reason: 'legacy_price_leak',
      leaked_tokens: legacyLeaks.map((n) => `$${n}`)
    };
  }

  const canonicalSet = new Set(
    Object.values(matrix || {})
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n))
  );
  const unexpected = leakedTokens.filter((n) => !canonicalSet.has(n));
  if (unexpected.length) {
    return {
      ok: false,
      status: 'FAIL',
      reason: 'unexpected_price_token',
      leaked_tokens: unexpected.map((n) => `$${n}`)
    };
  }

  return {
    ok: false,
    status: 'FAIL',
    reason: 'prephone_price_leak',
    leaked_tokens: leakedTokens.map((n) => `$${n}`)
  };
}

module.exports = {
  analyzeMessengerPricingPolicy
};
