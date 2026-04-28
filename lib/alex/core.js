/**
 * Shared Alex core — single brain for all channels (website, WhatsApp, Messenger,
 * Telegram, etc.).
 *
 * Architecture:
 *   - lib/alex-one-truth.js owns the BASE_PROMPT, multilingual policy, pricing
 *     catalog, guard modes, material policy, lead-capture order, in-scope
 *     services, photo handling, and style rules. It is the canonical Alex
 *     knowledge base — written once, consumed by every channel adapter.
 *   - lib/alex-policy-engine.js owns the service-intent classifier
 *     (inferServiceType, SERVICE_KEYWORDS, SERVICE_PATTERNS) — same vocabulary
 *     for every channel.
 *   - lib/price-registry.js owns prices.
 *   - lib/ai-fallback.js owns the actual DeepSeek call wrapper (with audit).
 *
 * What this module adds: a single async function `generateAlexReply` that
 * channel adapters call. It runs language detection, service-intent
 * classification, builds the shared system prompt + an optional channel
 * addendum, calls DeepSeek via callAlex (with the audit metadata), and
 * returns a structured contract:
 *
 *   { ok, replyText, source, model, audit,
 *     detectedLanguage, replyLanguage, languageConfidence,
 *     serviceIntent, safetyFlags, reason, needsOwnerApproval }
 *
 * Channels are responsible for delivering the reply (Cloud API send, website
 * websocket push, Telegram bot send, etc.) and for any channel-specific safety.
 */

const crypto = require('crypto');
const { buildSystemPrompt, getGuardMode } = require('../alex-one-truth.js');
const { inferServiceType } = require('../alex-policy-engine.js');
const { callAlex } = require('../ai-fallback.js');
const { detectSafetyFlags, isSafeForCustomer } = require('./whatsapp-safety.js');

// ── Language detection ──────────────────────────────────────────────────────
// Simple heuristic: per-character script + a small lexicon of common words for
// disambiguation. Returns one of 'en'|'ru'|'uk'|'es' with a confidence score.

const UK_HINT = /\b(?:привіт|так|будь ласка|дякую|потрібно|зробити|підлога|плитка|меблі|двер|стін|фарба|кран|розетк|світильник|чи)\b/i;
const RU_HINT = /\b(?:привет|здравствуй|спасибо|пожалуйста|нужно|пол(?:а|у|ом)?|плитка|мебель|двер|стен|краска|кран|розетк|выключатель|какая|сколько|стоит|цена)\b/i;
const ES_HINT = /\b(?:hola|gracias|por favor|necesito|cocina|piso|pared|puerta|pintar|gabinete|montar|tele|televisor|cuanto|cuesta|precio|cuánto|el|la|el|los|las|de|por)\b/i;
// English: rely on Latin-script bias + lexicon when ES words are absent.
const EN_HINT = /\b(?:hi|hello|hey|need|please|thanks|paint|mount|tv|wall|brick|floor|cabinet|drywall|shelf|shelves|how much|price|cost|zip)\b/i;

function detectLanguage(text) {
  const t = String(text || '');
  if (!t.trim()) return { language: 'en', confidence: 0.2, reason: 'empty' };

  let cyrillic = 0, latin = 0, total = 0;
  for (const ch of t) {
    const code = ch.codePointAt(0);
    if ((code >= 0x0400 && code <= 0x04FF) || (code >= 0x0500 && code <= 0x052F)) cyrillic++;
    else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A) || (code >= 0x00C0 && code <= 0x024F)) latin++;
    if (/[\p{L}]/u.test(ch)) total++;
  }

  if (total === 0) return { language: 'en', confidence: 0.2, reason: 'no_letters' };

  const cyrFrac = cyrillic / total;
  const latFrac = latin / total;

  // Cyrillic-dominated → ru/uk disambiguation
  if (cyrFrac > 0.3) {
    if (UK_HINT.test(t) && !RU_HINT.test(t)) return { language: 'uk', confidence: 0.9, reason: 'cyrillic+uk_hint' };
    if (UK_HINT.test(t) && RU_HINT.test(t)) {
      // both lexicons hit — pick by char overlap (UK has є, і, ї, ґ)
      const ukChars = (t.match(/[єіїґЄІЇҐ]/g) || []).length;
      return { language: ukChars > 0 ? 'uk' : 'ru', confidence: 0.7, reason: ukChars > 0 ? 'cyrillic+uk_chars' : 'cyrillic+ru_lexicon' };
    }
    if (RU_HINT.test(t)) return { language: 'ru', confidence: 0.85, reason: 'cyrillic+ru_hint' };
    // Default Cyrillic to ru when no specific lexicon match.
    const ukChars = (t.match(/[єіїґЄІЇҐ]/g) || []).length;
    return { language: ukChars > 0 ? 'uk' : 'ru', confidence: 0.6, reason: ukChars > 0 ? 'cyrillic+uk_chars' : 'cyrillic_default_ru' };
  }

  // Latin-dominated → en/es
  if (latFrac > 0.3) {
    const esHits = (t.match(ES_HINT) || []).length;
    const enHits = (t.match(EN_HINT) || []).length;
    if (esHits > enHits && esHits >= 1) return { language: 'es', confidence: 0.85, reason: 'latin+es_hint' };
    return { language: 'en', confidence: 0.85, reason: 'latin_default_en' };
  }

  return { language: 'en', confidence: 0.3, reason: 'mixed_default_en' };
}

// ── Channel addenda — short style-only hints, NEVER override base policy ───

const CHANNEL_ADDENDA = {
  whatsapp: [
    '',
    '═══════════════════════════════════════════',
    'CHANNEL: WHATSAPP',
    '═══════════════════════════════════════════',
    '- Reply with a short WhatsApp-style message (1–4 sentences total).',
    '- No markdown (no **, no headings, no bullet lists with *).',
    '- 0–1 emoji max.',
    '- Reply in the SAME LANGUAGE as the customer\'s last message (per the multilingual rule above).',
    '- Service-specific intake only when intent is clear; otherwise ask one short clarifying question.',
    '- For TV mounting ask: TV size, wall type (drywall/brick/concrete), hidden wires y/n, photos, ZIP, timing.',
    '- For flooring ask: type (laminate/LVP/etc), square footage, current floor/subfloor condition, who supplies materials, photos, ZIP, timing.',
    '- For interior/exterior/cabinet painting ask: scope (rooms/area or # doors/drawers), prep state, who supplies paint, photos, ZIP, timing.',
    '- For furniture assembly ask: item count and brand, photos if unusual, ZIP, timing.',
    '- For drywall ask: photos of damage, hole size, ZIP, timing.',
    '- For plumbing/electrical ask: photos and a short description of the issue, ZIP, timing.',
    '- Do NOT quote a final price for unclear or large jobs. Use the frozen pricing model from PRICING CATALOG.',
  ].join('\n'),
  website: '',
  messenger: '',
  telegram: '',
};

// ── Stable prompt version (sha256[0:12] of base+addendum) for audit ────────

function _promptVersion(channel) {
  const base = buildSystemPrompt({ guardMode: 'pre_contact_range' });
  const add = CHANNEL_ADDENDA[channel] || '';
  return 'core-v1-' + crypto.createHash('sha256').update(base + add + (channel || '')).digest('hex').slice(0, 12);
}

// ── Public: generateAlexReply ──────────────────────────────────────────────

async function generateAlexReply({
  channel = 'website',
  messages = [],
  hasContact = false,
  hasPhone = false,
  extraContext = '', // per-request: collected-fields + missing-fields injected by channel adapter
} = {}) {
  // Latest customer message → language + service intent
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  const inboundText = String(lastUser?.content || '').slice(0, 4000);
  const lang = detectLanguage(inboundText);
  const intent = inferServiceType(inboundText) || null;

  // Build shared system prompt + channel addendum + per-request context (memory/missing-fields)
  const guardMode = getGuardMode({ hasContact: !!(hasContact || hasPhone) });
  let systemPrompt = buildSystemPrompt({ guardMode });
  if (CHANNEL_ADDENDA[channel]) systemPrompt += CHANNEL_ADDENDA[channel];
  // Inject conversation memory context: collected fields the customer already gave,
  // and missing fields Alex should still ask. Truncated to avoid prompt bloat.
  if (extraContext) systemPrompt += '\n\n' + String(extraContext).slice(0, 2000);

  // Call shared model wrapper (returns audit metadata)
  let modelReply = '';
  let model = null;
  let audit = null;
  let modelError = null;
  try {
    const r = await callAlex(messages.slice(-20), systemPrompt);
    modelReply = String(r?.reply || '').trim();
    model = r?.model || null;
    audit = r?.audit || null;
  } catch (e) {
    modelError = e?.message || String(e);
  }

  // CTA presence check for audit
  const ctaIncluded = /handyandfriend\.com/i.test(modelReply);
  const calculatorMentioned = /calculator|калькулятор|calculadora/i.test(modelReply);

  const safetyFlags = detectSafetyFlags(modelReply);
  const promptVersion = _promptVersion(channel);

  // Source classification:
  //   - 'model'    : DeepSeek returned content and it passed safety checks.
  //   - 'fallback' : DeepSeek failed OR content failed safety checks.
  if (modelReply && model === 'deepseek' && safetyFlags.length === 0) {
    return {
      ok: true,
      replyText: modelReply.slice(0, 1500),
      source: 'model',
      model,
      audit: { ...(audit || {}), prompt_version: promptVersion, fallback_used: false, source: 'model', website_cta_included: ctaIncluded, calculator_mentioned: calculatorMentioned, pricing_policy_version: require('../price-registry.js').getPricingSourceVersion() },
      detectedLanguage: lang.language,
      replyLanguage: lang.language,
      languageConfidence: lang.confidence,
      serviceIntent: intent?.serviceId || null,
      safetyFlags: [],
      reason: 'shared_core_model_output',
      needsOwnerApproval: false, // channel decides whether to gate; default: send.
      channel,
    };
  }

  // Multilingual safe fallback per detected language. Channel can override.
  const FALLBACK_BY_LANG = {
    en: "Hi! Thanks for reaching out. Could you share a few photos of the area, a short scope, your ZIP code, and your preferred timing? We'll review and get back to you with the next steps. You can also visit handyandfriend.com — we have service details and a calculator to help estimate the project.",
    ru: "Здравствуйте! Спасибо, что написали. Пришлите, пожалуйста, несколько фото, короткое описание задачи, ваш ZIP и удобное время — мы посмотрим и свяжемся со следующими шагами. Также можете посмотреть handyandfriend.com — там есть информация по услугам и калькулятор для примерного расчёта.",
    uk: "Вітаю! Дякую, що написали. Надішліть, будь ласка, кілька фото, короткий опис задачі, ваш ZIP та зручний час — ми подивимось і повернемось з наступними кроками. Також можете переглянути handyandfriend.com — там є інформація про послуги та калькулятор для орієнтовного розрахунку.",
    es: "¡Hola! Gracias por escribirnos. ¿Podría compartirnos algunas fotos del área, una breve descripción del trabajo, su código ZIP y el horario preferido? Lo revisamos y le respondemos con los siguientes pasos. También puede visitar handyandfriend.com — tenemos información de servicios y una calculadora para estimar el proyecto.",
  };

  const fallbackText = FALLBACK_BY_LANG[lang.language] || FALLBACK_BY_LANG.en;

  const fallbackCtaIncluded = /handyandfriend\.com/i.test(fallbackText);
  const fallbackCalculatorMentioned = /calculator|калькулятор|calculadora/i.test(fallbackText);

  return {
    ok: true,
    replyText: fallbackText,
    source: 'fallback',
    model,
    audit: { ...(audit || {}), prompt_version: promptVersion, fallback_used: true, source: 'fallback', website_cta_included: fallbackCtaIncluded, calculator_mentioned: fallbackCalculatorMentioned, pricing_policy_version: require('../price-registry.js').getPricingSourceVersion() },
    detectedLanguage: lang.language,
    replyLanguage: lang.language,
    languageConfidence: lang.confidence,
    serviceIntent: intent?.serviceId || null,
    safetyFlags,
    reason: modelError
      ? `model_error: ${modelError.slice(0, 120)}`
      : (model === 'static_fallback' ? 'deepseek_failed' : (safetyFlags.length ? `safety_flags: ${safetyFlags.join(',')}` : 'unknown')),
    needsOwnerApproval: false,
    channel,
  };
}

module.exports = {
  generateAlexReply,
  detectLanguage,
  CHANNEL_ADDENDA,
};
