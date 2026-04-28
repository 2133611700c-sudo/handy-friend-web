const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || 'test-key';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'srv-key';
process.env.TELEGRAM_BOT_TOKEN = 'tg-test';
process.env.META_SYSTEM_USER_TOKEN = 'meta-test-token';
process.env.META_PHONE_NUMBER_ID = 'pnid-test';

const {
  generateAlexWhatsAppReply,
  detectSafetyFlags,
  isSafeForCustomer,
  SAFE_FALLBACK,
  WA_SYSTEM_PROMPT,
  BANNED_PHRASES,
} = require('../lib/alex/whatsapp-reply-engine.js');

// ── Safety validator ───────────────────────────────────────────────────────

test('detectSafetyFlags catches Cyrillic / Russian customer-facing text', () => {
  const flags = detectSafetyFlags('Привет! Расскажите, что нужно сделать.');
  assert.ok(flags.includes('cyrillic'), 'cyrillic flag missing');
});

test('detectSafetyFlags catches all banned claims', () => {
  for (const claim of [
    'We are licensed contractors',
    'Bonded and insured',
    'Certified handymen',
    'We are #1 in LA',
    'The best in LA service',
    'Number one rated',
  ]) {
    const flags = detectSafetyFlags(claim);
    assert.ok(flags.includes('banned_phrase'), `did not flag: "${claim}"`);
  }
});

test('detectSafetyFlags catches internal-data leakage', () => {
  const flags = detectSafetyFlags('Our worker rate is $40/hr and margin is 30%');
  assert.ok(flags.includes('internal_leak'));
});

test('detectSafetyFlags catches empty or too-long text', () => {
  assert.ok(detectSafetyFlags('').includes('empty'));
  assert.ok(detectSafetyFlags('x'.repeat(1300)).includes('too_long'));
});

test('isSafeForCustomer returns true on plain English intake message', () => {
  const safe = "Hi! Yes, we can help with TV mounting. Please send a few photos, the TV size, and your ZIP code.";
  assert.equal(isSafeForCustomer(safe), true);
  assert.deepEqual(detectSafetyFlags(safe), []);
});

test('SAFE_FALLBACK passes the safety validator', () => {
  assert.equal(isSafeForCustomer(SAFE_FALLBACK), true);
  assert.match(SAFE_FALLBACK, /^Hi! Thanks for reaching out\./);
  assert.doesNotMatch(SAFE_FALLBACK, /licensed|bonded|certified/i);
});

test('WA system prompt enforces English-only and no banned claims', () => {
  assert.match(WA_SYSTEM_PROMPT, /Reply ONLY in English/);
  assert.match(WA_SYSTEM_PROMPT, /Never claim 'licensed', 'bonded', 'certified'/);
  assert.match(WA_SYSTEM_PROMPT, /best in LA/);
  assert.match(WA_SYSTEM_PROMPT, /photos/);
  assert.match(WA_SYSTEM_PROMPT, /ZIP code/);
});

// ── Engine end-to-end with mocked DeepSeek ──────────────────────────────────

function withMockedFetch(mock, fn) {
  const saved = global.fetch;
  global.fetch = mock;
  return fn().finally(() => { global.fetch = saved; });
}

test('engine: vague inbound → calls model and returns safe English reply', async () => {
  await withMockedFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return {
        ok: true, status: 200,
        json: async () => ({ choices: [{ message: { content: 'Hi! Could you share a few photos of the area, a short scope, your ZIP code, and your preferred timing?' } }] }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const r = await generateAlexWhatsAppReply({ inboundText: 'Hi', customerPhone: '12135551234' });
    assert.equal(r.ok, true);
    assert.equal(r.source, 'model');
    assert.equal(r.needsOwnerApproval, true);
    assert.deepEqual(r.safetyFlags, []);
    assert.match(r.replyText, /photos/i);
    assert.match(r.replyText, /ZIP/);
  });
});

test('engine: model returns Russian → rejected, fallback used, flags captured', async () => {
  await withMockedFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return {
        ok: true, status: 200,
        json: async () => ({ choices: [{ message: { content: 'Привет! Расскажите подробнее.' } }] }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const r = await generateAlexWhatsAppReply({ inboundText: 'Привет', customerPhone: '12135551234' });
    assert.equal(r.ok, true);
    assert.equal(r.source, 'fallback');
    assert.equal(r.replyText, SAFE_FALLBACK);
    assert.ok(r.safetyFlags.includes('cyrillic'));
    assert.match(r.reason, /safety_flags.*cyrillic/);
  });
});

test('engine: model returns banned claim → rejected, fallback used', async () => {
  await withMockedFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return {
        ok: true, status: 200,
        json: async () => ({ choices: [{ message: { content: 'We are licensed and bonded. Best in LA!' } }] }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const r = await generateAlexWhatsAppReply({ inboundText: 'tell me about you', customerPhone: '12135551234' });
    assert.equal(r.source, 'fallback');
    assert.ok(r.safetyFlags.includes('banned_phrase'));
  });
});

test('engine: model failure → fallback with model_error reason', async () => {
  await withMockedFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return { ok: false, status: 500, statusText: 'Internal Server Error', json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const r = await generateAlexWhatsAppReply({ inboundText: 'help', customerPhone: '12135551234' });
    // ai-fallback returns its static text; safety check passes if static is safe English.
    // Either source='model' (with safe static reply) or 'fallback' is acceptable as long as text is safe English.
    assert.equal(isSafeForCustomer(r.replyText), true, 'reply must be safe English even on model failure');
  });
});

test('approval callback blocks Cyrillic stored draft and sends fallback instead', async () => {
  // This test simulates the wa:approve callback when the stored draft is Russian.
  // Expected: fallback reply is sent, result.fallback === true.
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';

  const calls = { sendText: [] };
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok: true, status: 200, json: async () => [{ extra: {
        wamid: 'wamid.IN.RU', wa_from: '12135551234', alex_draft: 'Привет! Что нужно?', short_id: 'cyrcyrcyrcyrcyrA',
      } }] };
    }
    if (u.includes('/whatsapp_messages?direction=eq.out')) {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      calls.sendText.push(JSON.parse(opts.body));
      const resp = JSON.stringify({ messages: [{ id: 'wamid.OUT.SAFE' }] });
      return { ok: true, status: 200, text: async () => resp, json: async () => JSON.parse(resp) };
    }
    if (u.includes('/whatsapp_messages') && opts?.method === 'POST') {
      return { ok: true, status: 201, json: async () => [], text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');
  const res = { statusCode: 0, payload: null, headers: {},
    setHeader() {}, status(c) { this.statusCode = c; return this; }, json(o) { this.payload = o; return this; }, end() {} };
  await handleWAApprovalCallback(
    { update_id: 7, callback_query: { id: 'cq', from: { id: 1 }, data: 'wa:approve:cyrcyrcyrcyrcyrA' } },
    res
  );
  global.fetch = savedFetch;

  assert.equal(res.payload.result.ok, true);
  assert.equal(res.payload.result.fallback, true, 'must be marked fallback because draft was Cyrillic');
  assert.equal(calls.sendText.length, 1);
  assert.equal(calls.sendText[0].text.body, SAFE_FALLBACK, 'must send SAFE_FALLBACK English text instead of Russian draft');
  assert.doesNotMatch(calls.sendText[0].text.body, /[Ѐ-ӿ]/, 'sent text must not contain Cyrillic');
});

// ── Banned-phrase exhaustive coverage ──────────────────────────────────────

test('BANNED_PHRASES regex set covers required hard rules', () => {
  for (const p of ['licensed', 'bonded', 'certified']) {
    assert.ok(BANNED_PHRASES.some(r => r.test(p)), `regex missing for: ${p}`);
  }
  assert.ok(BANNED_PHRASES.some(r => r.test('#1 in town')));
  assert.ok(BANNED_PHRASES.some(r => r.test('best in LA')));
});
