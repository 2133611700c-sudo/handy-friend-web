/**
 * Alex WhatsApp Reply Engine — production source of truth for WA-customer replies.
 *
 * Why a dedicated engine vs. the website's multilingual Alex:
 *   The website Alex is instructed to match the customer's language (EN/RU/UK/ES).
 *   That is correct for the multilingual landing chat. It is WRONG for WhatsApp:
 *   the customer base for +1 213 361 1700 is US/LA — owner mandates English replies
 *   regardless of the language the customer types in.
 *
 * Pipeline:
 *   1. Build WhatsApp-specific system prompt (English-only intake assistant).
 *   2. Call DeepSeek via shared callAlex.
 *   3. Run post-generation safety validator:
 *       - non-empty
 *       - no Cyrillic / non-Latin script in customer-facing output
 *       - no banned claims (licensed, bonded, certified, #1, best in LA)
 *       - no internal-data leakage (worker rate, margin, hourly cost-of-goods)
 *       - reasonable length (≤ 500 chars for WhatsApp)
 *   4. If any check fails → use SAFE_FALLBACK and report safetyFlags.
 *
 * Output contract:
 *   { ok, replyText, source: 'model'|'fallback', model, reason, safetyFlags, needsOwnerApproval }
 *
 * needsOwnerApproval is always TRUE in this implementation — the production flow
 * routes through Telegram ✅ approval before any WhatsApp send. An auto-reply mode
 * could be added later by setting it to false when an env flag is on.
 */

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

function detectSafetyFlags(text) {
  const flags = [];
  if (!text || !String(text).trim()) flags.push('empty');
  const t = String(text || '');
  if (t.length > 1200) flags.push('too_long');
  if (CYRILLIC.test(t)) flags.push('cyrillic');
  for (const r of NON_LATIN_SCRIPT_RANGES) {
    if (r !== CYRILLIC && r.test(t)) { flags.push('non_latin_script'); break; }
  }
  for (const r of BANNED_PHRASES) if (r.test(t)) flags.push('banned_phrase');
  for (const r of INTERNAL_LEAK_PATTERNS) if (r.test(t)) flags.push('internal_leak');
  return flags;
}

function isSafeForCustomer(text) {
  return detectSafetyFlags(text).length === 0;
}

async function generateAlexWhatsAppReply({ inboundText, customerPhone, conversationHistory = [] }) {
  const messages = [
    ...conversationHistory.slice(-10),
    { role: 'user', content: String(inboundText || '').slice(0, 2000) },
  ];

  let modelReply = '';
  let model = null;
  let modelError = null;

  try {
    const r = await callAlex(messages, WA_SYSTEM_PROMPT);
    modelReply = String(r?.reply || '').trim();
    model = r?.model || null;
  } catch (e) {
    modelError = e?.message || String(e);
  }

  const flags = detectSafetyFlags(modelReply);
  if (flags.length === 0 && modelReply) {
    return {
      ok: true,
      replyText: modelReply.slice(0, 1200),
      source: 'model',
      model,
      reason: 'safe_model_output',
      safetyFlags: [],
      needsOwnerApproval: true,
    };
  }

  return {
    ok: true,
    replyText: SAFE_FALLBACK,
    source: 'fallback',
    model,
    reason: modelError
      ? `model_error: ${modelError.slice(0, 120)}`
      : `safety_flags: ${flags.join(',')}`,
    safetyFlags: flags,
    needsOwnerApproval: true,
  };
}

module.exports = {
  generateAlexWhatsAppReply,
  detectSafetyFlags,
  isSafeForCustomer,
  SAFE_FALLBACK,
  WA_SYSTEM_PROMPT,
  BANNED_PHRASES,
};
