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

test('safety validator NO LONGER flags Cyrillic — multilingual is allowed', () => {
  // Same-brain era: customer can write in Russian, Alex replies in Russian.
  const flags = detectSafetyFlags('Привет! Расскажите, что нужно сделать.');
  assert.deepEqual(flags, [], 'pure Cyrillic intake reply should pass');
});

test('detectSafetyFlags catches all banned claims (English + multilingual)', () => {
  for (const claim of [
    'We are licensed contractors',
    'Bonded and insured',
    'Certified handymen',
    'We are #1 in LA',
    'The best in LA service',
    'Number one rated',
    'Мы лицензированы и застрахованы',
    'Ми ліцензовані і сертифіковані',
    'Estamos licenciados y certificados',
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
  assert.ok(detectSafetyFlags('x'.repeat(1600)).includes('too_long'));
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
    assert.equal(r.needsOwnerApproval, false, 'auto mode default — no operator approval gate');
    assert.deepEqual(r.safetyFlags, []);
    assert.match(r.replyText, /photos/i);
    assert.match(r.replyText, /ZIP/);
  });
});

test('engine: Russian inbound → Russian model reply is ACCEPTED (same-brain)', async () => {
  await withMockedFetch(async (url) => {
    if (String(url).includes('deepseek.com')) {
      return {
        ok: true, status: 200,
        json: async () => ({ choices: [{ message: { content: 'Здравствуйте! Расскажите, какой проект — пришлите фото и ZIP.' } }] }),
      };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  }, async () => {
    const r = await generateAlexWhatsAppReply({ inboundText: 'Привет', customerPhone: '12135551234' });
    assert.equal(r.ok, true);
    assert.equal(r.source, 'model', 'Russian reply to Russian customer must be accepted');
    assert.match(r.replyText, /Здравствуйте/);
    assert.equal(r.detectedLanguage, 'ru');
    assert.equal(r.replyLanguage, 'ru');
    assert.deepEqual(r.safetyFlags, []);
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

test('approval callback BLOCKS unsafe stored draft (banned claim, no substitution)', async () => {
  // STRICT MODE: the operator-visible draft must equal what's sent. So if the
  // stored draft is Cyrillic / banned / empty, the callback must REFUSE to
  // send and tell the operator to regenerate. No silent SAFE_FALLBACK send.
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';

  const calls = { sendText: [], answerCallback: [] };
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok: true, status: 200, json: async () => [{ extra: {
        wamid: 'wamid.IN.BANNED', wa_from: '12135551234', alex_draft: 'We are licensed and bonded — best in LA!', short_id: 'bannedbannedban1',
      } }] };
    }
    if (u.includes('/whatsapp_messages?direction=eq.out')) {
      return { ok: true, status: 200, json: async () => [] };
    }
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      calls.sendText.push(JSON.parse(opts.body));
      return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
    }
    if (u.includes('answerCallbackQuery')) {
      calls.answerCallback.push(JSON.parse(opts.body));
      return { ok: true, status: 200, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');
  const res = { statusCode: 0, payload: null, headers: {},
    setHeader() {}, status(c) { this.statusCode = c; return this; }, json(o) { this.payload = o; return this; }, end() {} };
  await handleWAApprovalCallback(
    { update_id: 7, callback_query: { id: 'cq', from: { id: 1 }, data: 'wa:approve:bannedbannedban1' } },
    res
  );
  global.fetch = savedFetch;

  assert.equal(res.payload.result.ok, false, 'must NOT send when draft is unsafe');
  assert.equal(res.payload.result.error, 'unsafe_draft');
  assert.ok(res.payload.result.safetyFlags.includes('banned_phrase'));
  assert.equal(calls.sendText.length, 0, 'Cloud API must NOT be called for unsafe draft');
  assert.ok(calls.answerCallback.length === 1, 'operator must get a callback alert');
  assert.match(calls.answerCallback[0].text, /DRAFT BLOCKED/);
  assert.match(calls.answerCallback[0].text, /regen/i);
});

test('approval callback BLOCKS empty stored draft', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';
  const calls = { sendText: [] };
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok: true, status: 200, json: async () => [{ extra: {
        wamid: 'wamid.IN.EMPTY', wa_from: '12135551234', alex_draft: '', short_id: 'emptyemptyempty1',
      } }] };
    }
    if (u.includes('graph.facebook.com')) { calls.sendText.push(JSON.parse(opts.body)); return { ok:true,status:200,text:async()=>'',json:async()=>({}) }; }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');
  const res = { statusCode:0, payload:null, headers:{}, setHeader(){}, status(c){this.statusCode=c;return this;}, json(o){this.payload=o;return this;}, end(){} };
  await handleWAApprovalCallback({update_id:8, callback_query:{id:'cq', from:{id:1}, data:'wa:approve:emptyemptyempty1'}}, res);
  global.fetch = savedFetch;
  assert.equal(res.payload.result.ok, false);
  assert.equal(res.payload.result.error, 'unsafe_draft');
  assert.ok(res.payload.result.safetyFlags.includes('empty'));
  assert.equal(calls.sendText.length, 0);
});

test('approval callback SENDS exact text when stored draft is safe', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';
  const SAFE_DRAFT = 'Hi! Could you share the TV size and your ZIP code? Once we have those, we will get back to you.';
  const calls = { sendText: [] };
  const savedFetch = global.fetch;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes('/telegram_sends?source=eq.whatsapp_approval')) {
      return { ok:true, status:200, json: async () => [{ extra: { wamid:'wamid.IN.OK', wa_from:'12135551234', alex_draft: SAFE_DRAFT, short_id:'safedraftsafedft0' } }] };
    }
    if (u.includes('/whatsapp_messages?direction=eq.out')) return { ok:true, status:200, json: async () => [] };
    if (u.includes('graph.facebook.com') && u.endsWith('/messages')) {
      calls.sendText.push(JSON.parse(opts.body));
      const resp = JSON.stringify({ messages: [{ id:'wamid.OUT.OK' }] });
      return { ok:true, status:200, text: async () => resp, json: async () => JSON.parse(resp) };
    }
    return { ok:true, status:200, json: async () => ({}), text: async () => '' };
  };
  delete require.cache[require.resolve('../lib/telegram/wa-approval-callback.js')];
  const { handleWAApprovalCallback } = require('../lib/telegram/wa-approval-callback.js');
  const res = { statusCode:0, payload:null, headers:{}, setHeader(){}, status(c){this.statusCode=c;return this;}, json(o){this.payload=o;return this;}, end(){} };
  await handleWAApprovalCallback({update_id:9, callback_query:{id:'cq', from:{id:1}, data:'wa:approve:safedraftsafedft0'}}, res);
  global.fetch = savedFetch;
  assert.equal(res.payload.result.ok, true);
  assert.equal(res.payload.result.sentWamid, 'wamid.OUT.OK');
  assert.equal(calls.sendText.length, 1);
  assert.equal(calls.sendText[0].text.body, SAFE_DRAFT, 'sent body must be EXACTLY the stored draft (no substitution)');
});

// ── Banned-phrase exhaustive coverage ──────────────────────────────────────

test('BANNED_PHRASES regex set covers required hard rules', () => {
  for (const p of ['licensed', 'bonded', 'certified']) {
    assert.ok(BANNED_PHRASES.some(r => r.test(p)), `regex missing for: ${p}`);
  }
  assert.ok(BANNED_PHRASES.some(r => r.test('#1 in town')));
  assert.ok(BANNED_PHRASES.some(r => r.test('best in LA')));
});
