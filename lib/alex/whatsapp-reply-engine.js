/**
 * Alex WhatsApp Reply Engine — production source of truth for WA-customer replies.
 *
 * Why a dedicated engine vs. the website's multilingual Alex:
 *   WhatsApp uses the SAME shared Alex core (lib/alex/core.js) as the website.
 *   Language policy: reply in the same language as the customer (EN/RU/UK/ES).
 *   This file provides the WhatsApp-specific entry point and safety validation.
 */

const crypto = require('crypto');
const { callAlex } = require('../ai-fallback.js');

const SAFE_FALLBACK =
  "Hi! Thanks for reaching out. Please send a few photos of the area, " +
  "a short description of what needs to be done, your ZIP code, and your " +
  "preferred timing. We'll review it and get back to you with the next steps.";

const BANNED_PHRASES = [
  /\blicensed\b/i,
  /\bbonded\b/i,
  /\bcertified\b/i,
  /#\s*1\b/,
  /\bbest\s+in\s+la\b/i,
  /\bnumber\s+one\b/i,
];

const INTERNAL_LEAK_PATTERNS = [
  /\bmargin\b/i,
  /\bworker\s+rate\b/i,
  /\bcost\s+of\s+goods\b/i,
  /\bcommission\b/i,
];

const CYRILLIC = /[Ѐ-ӿ]/;
const NON_LATIN_SCRIPT_RANGES = [
  /[Ѐ-ӿ]/, // Cyrillic
  /[֐-׿]/, // Hebrew
  /[؀-ۿ]/, // Arabic
  /[一-鿿]/, // CJK
];

// Legacy prompt — kept for reference and backward-compat export only.
// NOT used in production: the shared core (lib/alex/core.js) + WhatsApp channel
// addendum is the active prompt. Language policy is now multilingual (EN/RU/UK/ES).
const WA_SYSTEM_PROMPT = [
  "You are Alex, the intake assistant for Handy & Friend, a Los Angeles handyman service.",
  "Reply ONLY in English. Never in Russian, Ukrainian, Spanish, or any other language, even if the customer wrote in those.",
  "Your job is to collect enough details so the owner can quote and schedule the work.",
  "",
  "Style:",
  "- Be concise (2–4 short sentences), professional, friendly.",
  "- Suitable for WhatsApp — no markdown, no emoji, no all-caps, no salesy language.",
  "- Acknowledge the specific service the customer mentioned, if any.",
  "",
  "Always ask for whichever of these are missing:",
  "- A few photos of the area or item",
  "- A short description of the work scope",
  "- ZIP code (Los Angeles area)",
  "- Preferred date/time window",
  "",
  "Service-specific intake hints (only when customer mentioned the service):",
  "- TV mounting: ask TV size, wall type (drywall / brick / concrete), hidden wires yes/no.",
  "- Furniture assembly: ask item count and brand if known.",
  "- Painting / cabinets / flooring: photos of the area, square footage, prep state.",
  "- Drywall repair: photos of the damage, hole size.",
  "- Plumbing / electrical: photos and a short description of the issue.",
  "",
  "Hard rules:",
  "- Never claim 'licensed', 'bonded', 'certified', '#1', or 'best in LA'.",
  "- Never quote a final price for work that is not standard. Say 'we'll review and get back to you'.",
  "- Never mention internal margins, worker rates, or cost-of-goods.",
  "- Do not ask for personal info beyond name and ZIP. No SSN, no card, no DOB.",
  "- If the message is unclear or vague, ask for photos and scope rather than guessing.",
  "",
  "End with a brief invitation like: 'Once we have those, we'll send next steps.'",
].join("\n");

// Banned-claim regexes for the multilingual same-brain era. We block claims
// of "licensed/bonded/certified/#1/best in LA" in EN, RU, UK, ES.
// Note: \b in JS does not work with Cyrillic — we use lookarounds or omit it
// for non-Latin scripts.
const MULTILINGUAL_BANNED = [
  ...BANNED_PHRASES,
  // Russian
  /лицензир/iu, /сертифиц/iu, /застрахован/iu, /луч\w*\s+в\s+ЛА/iu, /№\s*1/u,
  // Ukrainian
  /ліцензован/iu, /сертифікован/iu, /застрахован/iu, /кращ\w*\s+в\s+(?:Лос|ЛА)/iu,
  // Spanish
  /\blicenciad/i, /\bcertificad/i, /\b(?:#|n[uú]mero)\s*1\b/i, /\bmejor\s+en\s+LA\b/i,
];

const MULTILINGUAL_INTERNAL_LEAK = [
  ...INTERNAL_LEAK_PATTERNS,
  /(?:маржа|комисси[ия]|тарифная\s+ставка|оплата\s+мастер)/iu,
  /(?:маржа|комісі[ия]|ставка\s+майстра)/iu,
  /\b(?:margen|comisi[oó]n|tarifa\s+del\s+trabajador)/i,
];

function detectSafetyFlags(text) {
  const flags = [];
  if (!text || !String(text).trim()) flags.push('empty');
  const t = String(text || '');
  if (t.length > 1500) flags.push('too_long');
  for (const r of MULTILINGUAL_BANNED) if (r.test(t)) { flags.push('banned_phrase'); break; }
  for (const r of MULTILINGUAL_INTERNAL_LEAK) if (r.test(t)) { flags.push('internal_leak'); break; }
  return flags;
}

function isSafeForCustomer(text) {
  return detectSafetyFlags(text).length === 0;
}

// Stable hash of the legacy WA prompt — kept for backward-compat label.
const PROMPT_VERSION = 'wa-v1-' + crypto.createHash('sha256').update(WA_SYSTEM_PROMPT).digest('hex').slice(0, 12);

/**
 * Public entry — delegates to the shared Alex core (lib/alex/core.js) so
 * WhatsApp uses the SAME brain as the website. The shared core handles
 * language detection (EN/RU/UK/ES), service intent classification, the
 * canonical multilingual system prompt + WhatsApp channel addendum, and
 * structured DeepSeek call audit.
 *
 * Backward compat: callers still pass `{ inboundText, customerPhone,
 * conversationHistory }`. We translate to the core's
 * `{ channel:'whatsapp', messages, hasContact, hasPhone }` shape and
 * forward the `replyText` + `audit` etc.
 */
async function generateAlexWhatsAppReply({ inboundText, customerPhone, conversationHistory = [], hasContact = false, hasPhone = false } = {}) {
  // Lazy-load to avoid circular require at module init.
  const { generateAlexReply } = require('./core.js');
  const messages = [
    ...conversationHistory.slice(-10),
    { role: 'user', content: String(inboundText || '').slice(0, 2000) },
  ];
  const r = await generateAlexReply({ channel: 'whatsapp', messages, hasContact, hasPhone });
  return {
    ok: true,
    replyText: r.replyText,
    source: r.source,
    model: r.model,
    reason: r.reason,
    safetyFlags: r.safetyFlags || [],
    needsOwnerApproval: false, // /api/alex-webhook routes by WHATSAPP_REPLY_MODE
    audit: r.audit || null,
    detectedLanguage: r.detectedLanguage,
    replyLanguage: r.replyLanguage,
    languageConfidence: r.languageConfidence,
    serviceIntent: r.serviceIntent,
    channel: 'whatsapp',
  };
}

module.exports = {
  generateAlexWhatsAppReply,
  detectSafetyFlags,
  isSafeForCustomer,
  SAFE_FALLBACK,
  WA_SYSTEM_PROMPT,
  PROMPT_VERSION,
  BANNED_PHRASES,
};
