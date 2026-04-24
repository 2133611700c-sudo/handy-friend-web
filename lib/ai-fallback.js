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
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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

      if (!res.ok) {
        throw new Error(`DeepSeek ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      // Extract reply from response
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        throw new Error('DeepSeek: No content in response');
      }

      console.log(`[callAlex] Success on attempt ${attempt}/${MAX_RETRIES}`);
      return { reply, model: 'deepseek' };

    } catch (err) {
      console.error(`[callAlex] Attempt ${attempt}/${MAX_RETRIES}:`, err.message);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
    }
  }

  // All retries exhausted -- use static fallback
  // alex_fallback event is logged by callers (alex-webhook.js) via logLeadEvent
  console.error('[callAlex] All retries exhausted, using static fallback');

  // Sales-safe fallback -- never lose the lead, never dead-end
  return {
    reply: "Hey! I am having a brief connection issue, but I can still help. What service do you need? Service call $150 (TV mounting, furniture assembly, plumbing, electrical, drywall small patch). Quote after photos for cabinet painting, vanity, backsplash, door install. $3/sf labor estimate for painting and flooring. Share details and your phone number and we will follow up. Or call directly: (213) 361-1700",
    model: 'static_fallback'
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
