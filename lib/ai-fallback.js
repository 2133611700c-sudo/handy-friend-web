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

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

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
  // Log incident for weekly review
  try {
    await supabase.from('lead_events').insert({
      event_type: 'alex_down',
      event_payload: {
        message: 'All retries exhausted, static fallback used',
        timestamp: new Date().toISOString()
      }
    });
  } catch (logErr) {
    console.error('[callAlex] Failed to log incident:', logErr.message);
  }

  // Sales-safe fallback -- never lose the lead, never dead-end
  return {
    reply: "Hey! I am having a brief connection issue, but I can still help. What service do you need? (painting, flooring, TV mounting, plumbing, or electrical) - share details and your phone number, and our manager will call with an exact quote within 30 minutes. Or call us directly: (213) 361-1700",
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
