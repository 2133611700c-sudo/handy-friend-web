/**
 * AI Fallback Module for Handy & Friend
 *
 * Provides resilient DeepSeek API calls with:
 * - Fail-fast provider timeout
 * - Optional retry logic via env override
 * - Static fallback when API is down
 * - Never loses the chat flow — always returns a reply
 *
 * Imported by: ai-chat.js
 */

const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_TIMEOUT_MS = 12000;

const MAX_RETRIES = clampInt(process.env.ALEX_PROVIDER_MAX_RETRIES, DEFAULT_MAX_RETRIES, 1, 2);
const TIMEOUT_MS = clampInt(process.env.ALEX_PROVIDER_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, 3000, 15000);

/**
 * Call DeepSeek API with bounded timeout and static fallback.
 * NEVER raises exceptions - always returns a safe reply.
 *
 * @param {array} messages - OpenAI format messages [{role, content}, ...]
 * @param {string} systemPrompt - System prompt for context
 * @returns {Promise<{reply: string, model: 'deepseek'|'static_fallback', audit: object}>}
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
    timeout_ms: TIMEOUT_MS,
    max_retries: MAX_RETRIES,
  };
  const t0 = Date.now();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    audit.attempts = attempt;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
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

      audit.http_status = res.status;
      try {
        audit.request_id = (res.headers && typeof res.headers.get === 'function')
          ? (res.headers.get('x-request-id') || res.headers.get('x-ds-request-id') || null)
          : null;
      } catch {
        audit.request_id = null;
      }

      if (!res.ok) {
        audit.error_category = `http_${res.status}`;
        throw new Error(`DeepSeek ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      audit.finish_reason = data?.choices?.[0]?.finish_reason || null;
      audit.usage = data?.usage
        ? {
            prompt: data.usage.prompt_tokens,
            completion: data.usage.completion_tokens,
            total: data.usage.total_tokens
          }
        : null;

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
      if (!audit.error_category) {
        audit.error_category = err?.name === 'AbortError' ? 'timeout' : 'network';
      }
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  console.error('[callAlex] Provider failed within timeout budget, using static fallback');
  audit.finished_at = new Date().toISOString();
  audit.latency_ms = Date.now() - t0;
  return {
    reply: "Thanks for reaching out. Please send a photo, ZIP code, and what needs to be done. Standard service call is $150 labor only for eligible small jobs; materials, parking, or disposal are extra only if stated in writing. Sergii will review and reply shortly. You can also call/text (213) 361-1700.",
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

function clampInt(raw, fallback, min, max) {
  const value = Number(raw || fallback);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

module.exports = {
  callAlex,
  isConfigured
};
