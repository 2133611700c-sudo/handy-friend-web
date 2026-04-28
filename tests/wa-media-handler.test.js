const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';
process.env.TELEGRAM_BOT_TOKEN = 'tg-test';
process.env.TELEGRAM_CHAT_ID = '12345';
process.env.META_SYSTEM_USER_TOKEN = 'meta-test';

function withFetch(mock, fn) {
  const saved = global.fetch;
  global.fetch = mock;
  return fn().finally(() => { global.fetch = saved; });
}

test('handleInboundMedia fetches media URL from Meta and notifies owner', async () => {
  let telegramSent = false;
  await withFetch(async (url) => {
    const u = String(url);
    if (u.includes('graph.facebook.com')) {
      return { ok: true, json: async () => ({ url: 'https://meta-cdn.example.com/photo.jpg', mime_type: 'image/jpeg' }) };
    }
    if (u.includes('telegram')) {
      telegramSent = true;
      return { ok: true, json: async () => ({}) };
    }
    if (u.includes('supabase')) {
      return { ok: true, json: async () => ({}) };
    }
    return { ok: true, json: async () => ({}) };
  }, async () => {
    const { handleInboundMedia } = require('../lib/whatsapp/media-handler.js');
    const r = await handleInboundMedia({
      mediaId: 'media123',
      customerPhone: '12135551234',
      inboundWamid: 'wamid.test',
      mimeType: 'image/jpeg',
    });
    assert.equal(r.mediaUrl, 'https://meta-cdn.example.com/photo.jpg');
    assert.equal(r.ownerNotified, telegramSent);
  });
});

test('buildPhotoContextHint returns correct language-specific message', () => {
  const { buildPhotoContextHint } = require('../lib/whatsapp/media-handler.js');
  const en = buildPhotoContextHint(2, 'en');
  assert.match(en, /CONTEXT/);
  assert.match(en, /2/);
  const ru = buildPhotoContextHint(1, 'ru');
  assert.match(ru, /CONTEXT/);
  assert.match(ru, /фото/);
});
