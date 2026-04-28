/**
 * Tests proving the WhatsApp adapter uses the same shared Alex core as the
 * website (multilingual prompt, same service intent classifier, same model).
 */
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'srv';
process.env.TELEGRAM_BOT_TOKEN = 'tg';
process.env.TELEGRAM_CHAT_ID = '12345';
process.env.META_SYSTEM_USER_TOKEN = 'meta';
process.env.META_PHONE_NUMBER_ID = 'pnid';

function withFetch(mock, fn) {
  const saved = global.fetch;
  global.fetch = mock;
  return fn().finally(() => { global.fetch = saved; });
}

function deepseekMock(responseContent) {
  return async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: true, status: 200, headers: new Map(), json: async () => ({ choices: [{ message: { content: responseContent }, finish_reason: 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 30, total_tokens: 130 } }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };
}

// ── Language detection ────────────────────────────────────────────────────

test('detectLanguage classifies EN/RU/UK/ES correctly', () => {
  const { detectLanguage } = require('../lib/alex/core.js');
  assert.equal(detectLanguage('Hi, I need TV mounting').language, 'en');
  assert.equal(detectLanguage('Привет, нужен монтаж телевизора').language, 'ru');
  assert.equal(detectLanguage('Привіт, потрібно зібрати меблі').language, 'uk');
  assert.equal(detectLanguage('Hola, necesito pintar gabinetes').language, 'es');
  // Cyrillic-only with no specific lexicon hint → defaults to ru
  assert.equal(detectLanguage('Какая цена').language, 'ru');
});

// ── Shared core file structure ────────────────────────────────────────────

test('lib/alex/core.js exists and exposes generateAlexReply', () => {
  const core = require('../lib/alex/core.js');
  assert.equal(typeof core.generateAlexReply, 'function');
  assert.equal(typeof core.detectLanguage, 'function');
  assert.ok(core.CHANNEL_ADDENDA && typeof core.CHANNEL_ADDENDA.whatsapp === 'string');
  assert.ok(core.CHANNEL_ADDENDA.whatsapp.includes('CHANNEL: WHATSAPP'));
  assert.ok(core.CHANNEL_ADDENDA.whatsapp.includes('SAME LANGUAGE'));
});

test('shared core builds system prompt that includes website multilingual policy', () => {
  // We don't read the prompt directly (it's an internal detail) — but we can
  // assert generateAlexReply uses the alex-one-truth.buildSystemPrompt, which
  // contains the multilingual instruction. Inspect it via the cache.
  const { buildSystemPrompt } = require('../lib/alex-one-truth.js');
  const prompt = buildSystemPrompt({});
  assert.match(prompt, /Match the customer's language/);
  assert.match(prompt, /If customer writes in Russian, reply in Russian/);
  assert.match(prompt, /PRICING CATALOG/);
});

// ── WhatsApp adapter calls shared core (parity proof) ─────────────────────

test('WhatsApp Russian flooring inbound → Russian intake reply (model)', async () => {
  await withFetch(deepseekMock('Здравствуйте! Стоимость установки пола зависит от типа покрытия, площади, состояния основания и того, кто покупает материалы. Пришлите фото, площадь, ZIP и удобное время.'), async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Какая цена установки пола', customerPhone: '12135551234' });
    assert.equal(r.ok, true);
    assert.equal(r.source, 'model');
    assert.equal(r.detectedLanguage, 'ru');
    assert.equal(r.replyLanguage, 'ru');
    assert.equal(r.serviceIntent, 'flooring');
    assert.match(r.replyText, /Здравствуйте|пол|ZIP/);
  });
});

test('WhatsApp Spanish cabinet painting → Spanish reply', async () => {
  await withFetch(deepseekMock('¡Hola! Para pintar gabinetes de cocina, ¿podría compartir el número de puertas/cajones, fotos del estado actual, su código ZIP y el horario preferido?'), async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Hola, necesito pintar gabinetes de cocina', customerPhone: '12135551234' });
    assert.equal(r.detectedLanguage, 'es');
    assert.equal(r.replyLanguage, 'es');
    assert.equal(r.serviceIntent, 'kitchen_cabinet_painting');
    assert.match(r.replyText, /Hola|gabinete|ZIP|c[oó]digo/i);
    assert.equal(r.source, 'model');
  });
});

test('WhatsApp Ukrainian furniture assembly → Ukrainian reply', async () => {
  await withFetch(deepseekMock('Привіт! Скільки предметів зібрати і який бренд? Надішліть фото, ZIP і зручний час — ми приїдемо.'), async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Потрібно зібрати меблі IKEA', customerPhone: '12135551234' });
    assert.equal(r.detectedLanguage, 'uk');
    assert.equal(r.replyLanguage, 'uk');
    assert.equal(r.serviceIntent, 'furniture_assembly');
    assert.equal(r.source, 'model');
  });
});

test('WhatsApp English TV+brick+shelves → English service-specific reply', async () => {
  await withFetch(deepseekMock('Hi! For TV mounting on a brick wall and 2 floating shelves I need: TV size, drilling-in-brick OK, mount available, photos, ZIP, preferred timing.'), async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Hi, I need TV mounting on a brick wall and 2 floating shelves', customerPhone: '12135551234' });
    assert.equal(r.detectedLanguage, 'en');
    assert.equal(r.replyLanguage, 'en');
    assert.equal(r.serviceIntent, 'tv_mounting');
    assert.match(r.replyText, /TV|brick|shelves|ZIP/i);
    assert.equal(r.source, 'model');
  });
});

// ── Fallback in customer language ─────────────────────────────────────────

test('Russian model failure → Russian fallback (NOT English)', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: false, status: 500, statusText: 'Server Error', headers: new Map(), text: async () => '', json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Привет', customerPhone: '12135551234' });
    assert.equal(r.source, 'fallback');
    assert.equal(r.replyLanguage, 'ru');
    assert.match(r.replyText, /Здравствуйте/);
  });
});

test('Spanish model failure → Spanish fallback', async () => {
  await withFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: false, status: 500, statusText: 'Server Error', headers: new Map(), text: async () => '', json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Hola, ¿cuánto cuesta?', customerPhone: '12135551234' });
    assert.equal(r.source, 'fallback');
    assert.equal(r.replyLanguage, 'es');
    assert.match(r.replyText, /Hola|gracias/i);
  });
});

// ── Banned phrases blocked in any language ────────────────────────────────

test('Russian model output containing banned claim → flagged + multilingual fallback', async () => {
  await withFetch(deepseekMock('Мы лицензированные мастера. #1 в Лос-Анджелесе.'), async () => {
    const { generateWhatsAppAlexReply } = require('../lib/alex/whatsapp-agent.js');
    const r = await generateWhatsAppAlexReply({ inboundText: 'Привет', customerPhone: '12135551234' });
    assert.equal(r.source, 'fallback');
    assert.ok(r.safetyFlags.includes('banned_phrase'));
    // Fallback in detected language (ru), not English
    assert.equal(r.replyLanguage, 'ru');
    assert.doesNotMatch(r.replyText, /licensed|bonded|certified/i);
  });
});

// ── Service intent classifier parity ──────────────────────────────────────

test('inferServiceType (shared) catches RU flooring + ES cabinet + UK assembly + EN TV', () => {
  const { inferServiceType } = require('../lib/alex-policy-engine.js');
  assert.equal(inferServiceType('Какая цена установки пола')?.serviceId, 'flooring');
  assert.equal(inferServiceType('necesito pintar gabinetes')?.serviceId, 'kitchen_cabinet_painting');
  assert.equal(inferServiceType('Потрібно зібрати меблі IKEA')?.serviceId, 'furniture_assembly');
  assert.equal(inferServiceType('I need TV mounting on a brick wall')?.serviceId, 'tv_mounting');
});
