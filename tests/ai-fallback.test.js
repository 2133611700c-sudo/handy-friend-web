const test = require('node:test');
const assert = require('node:assert/strict');

test('callAlex returns DeepSeek reply when provider succeeds', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-key';

  delete require.cache[require.resolve('../lib/ai-fallback.js')];
  const { callAlex } = require('../lib/ai-fallback.js');

  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: () => 'req_test_123' },
    json: async () => ({
      choices: [
        { finish_reason: 'stop', message: { content: 'Standard service call is $150 labor only.' } }
      ],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 }
    })
  });

  try {
    const result = await callAlex([{ role: 'user', content: 'TV mounting?' }], 'system prompt');
    assert.equal(result.model, 'deepseek');
    assert.equal(result.audit.ok, true);
    assert.equal(result.audit.http_status, 200);
    assert.equal(result.audit.request_id, 'req_test_123');
    assert.match(result.reply, /\$150/);
  } finally {
    global.fetch = originalFetch;
    process.env.DEEPSEEK_API_KEY = originalKey;
    delete require.cache[require.resolve('../lib/ai-fallback.js')];
  }
});

test('callAlex returns safe static fallback when provider fails', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = 'test-key';

  delete require.cache[require.resolve('../lib/ai-fallback.js')];
  const { callAlex } = require('../lib/ai-fallback.js');

  global.fetch = async () => {
    throw new Error('network_down_for_test');
  };

  try {
    const result = await callAlex([{ role: 'user', content: 'TV mounting?' }], 'system prompt');
    assert.equal(result.model, 'static_fallback');
    assert.equal(result.audit.ok, false);
    assert.equal(result.audit.max_retries, 1);
    assert.equal(result.audit.timeout_ms, 12000);
    assert.match(result.reply, /\$150/);
    assert.match(result.reply, /labor only/i);
    assert.doesNotMatch(result.reply, /\$185|\$105/);
    assert.doesNotMatch(result.reply, /licensed|bonded|certified|best in LA/i);
  } finally {
    global.fetch = originalFetch;
    process.env.DEEPSEEK_API_KEY = originalKey;
    delete require.cache[require.resolve('../lib/ai-fallback.js')];
  }
});

test('callAlex clamps env timeout and retry overrides to safe bounds', async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  const originalRetries = process.env.ALEX_PROVIDER_MAX_RETRIES;
  const originalTimeout = process.env.ALEX_PROVIDER_TIMEOUT_MS;

  process.env.DEEPSEEK_API_KEY = 'test-key';
  process.env.ALEX_PROVIDER_MAX_RETRIES = '99';
  process.env.ALEX_PROVIDER_TIMEOUT_MS = '999999';

  delete require.cache[require.resolve('../lib/ai-fallback.js')];
  const { callAlex } = require('../lib/ai-fallback.js');

  global.fetch = async () => {
    throw new Error('network_down_for_test');
  };

  try {
    const result = await callAlex([{ role: 'user', content: 'TV mounting?' }], 'system prompt');
    assert.equal(result.model, 'static_fallback');
    assert.equal(result.audit.max_retries, 2);
    assert.equal(result.audit.timeout_ms, 15000);
  } finally {
    global.fetch = originalFetch;
    process.env.DEEPSEEK_API_KEY = originalKey;
    process.env.ALEX_PROVIDER_MAX_RETRIES = originalRetries;
    process.env.ALEX_PROVIDER_TIMEOUT_MS = originalTimeout;
    delete require.cache[require.resolve('../lib/ai-fallback.js')];
  }
});
