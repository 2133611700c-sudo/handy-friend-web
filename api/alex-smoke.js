const { callAlex } = require('../lib/ai-fallback.js');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'HEAD') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const started = Date.now();
  const systemPrompt = [
    'You are Alex for Handy & Friend in Los Angeles.',
    'Reply in English only.',
    'Use the public pricing rule: standard eligible small jobs use a $150 labor only service call.',
    'Materials, parking, or disposal are extra only if stated in writing.',
    'Do not claim licensed, bonded, certified, best, or guaranteed.',
    'Ask for photo, ZIP code, timing, and scope when needed.'
  ].join(' ');

  try {
    const out = await callAlex([
      {
        role: 'user',
        content: 'Smoke test only: How much for standard TV mounting in Burbank ZIP 91502?'
      }
    ], systemPrompt);

    const latencyMs = Date.now() - started;
    const reply = String(out.reply || '');
    return res.status(200).json({
      ok: true,
      source: out.model,
      latency_ms: latencyMs,
      within_15s: latencyMs <= 15000,
      has_reply: reply.length > 0,
      contains_150: reply.includes('$150'),
      contains_legacy_price: reply.includes('$185') || reply.includes('$105'),
      reply_preview: reply.slice(0, 500),
      audit: out.audit || null
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: 'alex_smoke_failed',
      details: String(err && err.message ? err.message : err).slice(0, 300),
      latency_ms: Date.now() - started
    });
  }
}
