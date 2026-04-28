/**
 * AI Fallback Module for Handy & Friend
 *
 * Provides resilient DeepSeek API calls with:
 * - Automatic retry logic (2 attempts)
 * - Timeout protection (10 seconds)
 * - Static fallback when API is down
 * - Never loses lead - always returns a reply
 *
 * Imported by: ai-chat.js
 */


const MAX_RETRIES = 2;
const TIMEOUT_MS = 20000;

/**
 * Call DeepSeek API with retry logic and static fallback
 * NEVER raises exceptions - always returns a safe reply
 *
 * @param {array} messages - OpenAI format messages [{role, content}, ...]
 * @param {string} systemPrompt - System prompt for context
 * @returns {Promise<{reply: string, model: 'deepseek'|'static_fallback'}>}
 */
async function callAlex(messages, systemPrompt) {
  const audit = {
    provider: 'deepseek',
    model: 'deepseek-chat',
    attempts: 0,
    ok: false,
    http_status: null,
    finish_reason: null,
    request_id: null,
    usage: null,
    error_category: null,
    started_at: new Date().toISOString(),
    finished_at: null,
    latency_ms: null,
  };
  const t0 = Date.now();
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    audit.attempts = attempt;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          max_tokens: 800,
          temperature: 0.7
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      audit.http_status = res.status;
      // DeepSeek echoes a request id header; capture if present (no secret values).
      try {
        audit.request_id = (res.headers && typeof res.headers.get === 'function')
          ? (res.headers.get('x-request-id') || res.headers.get('x-ds-request-id') || null)
          : null;
      } catch { audit.request_id = null; }

      if (!res.ok) {
        audit.error_category = `http_${res.status}`;
        throw new Error(`DeepSeek ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      audit.finish_reason = data?.choices?.[0]?.finish_reason || null;
      audit.usage = data?.usage ? { prompt: data.usage.prompt_tokens, completion: data.usage.completion_tokens, total: data.usage.total_tokens } : null;

      // Extract reply from response
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        audit.error_category = 'empty_content';
        throw new Error('DeepSeek: No content in response');
      }

      console.log(`[callAlex] Success on attempt ${attempt}/${MAX_RETRIES}`);
      audit.ok = true;
      audit.finished_at = new Date().toISOString();
      audit.latency_ms = Date.now() - t0;
      return { reply, model: 'deepseek', audit };

    } catch (err) {
      console.error(`[callAlex] Attempt ${attempt}/${MAX_RETRIES}:`, err.message);
      if (!audit.error_category) audit.error_category = err?.name === 'AbortError' ? 'timeout' : 'network';
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }

  console.error('[callAlex] All retries exhausted, using static fallback');
  audit.finished_at = new Date().toISOString();
  audit.latency_ms = Date.now() - t0;
  return {
    reply: "Hey! I am having a brief connection issue, but I can still help. What service do you need? Service call $150 (TV mounting, furniture assembly, plumbing, electrical, drywall small patch). Quote after photos for cabinet painting, vanity, backsplash, door install. $3/sf labor estimate for painting and flooring. Share details and your phone number and we will follow up. Or call directly: (213) 361-1700",
    model: 'static_fallback',
    audit,
  };
}

/**
 * Verify DeepSeek API key is configured
 * @returns {boolean}
 */
function isConfigured() {
  return !!process.env.DEEPSEEK_API_KEY;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  callAlex,
  isConfigured
};
