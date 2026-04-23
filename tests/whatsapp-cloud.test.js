const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createMessageDeduper,
  parseWhatsAppWebhook,
  normalizeWhatsAppInbound,
  classifyLeadVisibility,
  isLikelySyntheticWhatsApp,
  sendWhatsAppText
} = require('../lib/whatsapp-cloud.js');

test('parseWhatsAppWebhook extracts messages and statuses', () => {
  const body = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        value: {
          metadata: { phone_number_id: '123' },
          messages: [{ id: 'wamid.1', from: '12135551234', type: 'text', text: { body: 'Need TV mounting today' }, timestamp: '1710000000' }],
          statuses: [{ id: 'wamid.out.1', status: 'delivered', recipient_id: '12135551234', timestamp: '1710000001' }]
        }
      }]
    }]
  };
  const parsed = parseWhatsAppWebhook(body);
  assert.equal(parsed.messages.length, 1);
  assert.equal(parsed.statuses.length, 1);
});

test('normalizeWhatsAppInbound extracts text and attachments', () => {
  const normalized = normalizeWhatsAppInbound({
    message: {
      id: 'wamid.abc',
      from: '12135551234',
      type: 'image',
      image: { id: 'media1', caption: 'Need drywall repair', mime_type: 'image/jpeg' },
      timestamp: '1710000000'
    },
    contacts: [{ profile: { name: 'John' } }]
  });
  assert.equal(normalized.waMessageId, 'wamid.abc');
  assert.equal(normalized.waFrom, '12135551234');
  assert.equal(normalized.text, 'Need drywall repair');
  assert.equal(normalized.attachments.length, 1);
  assert.equal(normalized.profileName, 'John');
});

test('createMessageDeduper skips duplicates for same message id', () => {
  const deduper = createMessageDeduper(60_000);
  assert.equal(deduper.hasSeen('wamid.dup'), false);
  assert.equal(deduper.hasSeen('wamid.dup'), true);
});

test('classifyLeadVisibility returns lead for actionable intent', () => {
  const result = classifyLeadVisibility({
    text: 'Hi, I need TV mounting today. What is the price?',
    serviceHint: 'tv_mounting'
  });
  assert.equal(result.kind, 'lead');
});

test('classifyLeadVisibility returns pre_lead for incomplete scope', () => {
  const result = classifyLeadVisibility({
    text: 'How much?',
    serviceHint: 'unknown'
  });
  assert.equal(result.kind, 'pre_lead');
});

test('isLikelySyntheticWhatsApp detects obvious synthetic traffic', () => {
  assert.equal(isLikelySyntheticWhatsApp({ text: 'e2e synthetic probe', waFrom: '12135550000', profileName: 'QA Bot' }), true);
  assert.equal(isLikelySyntheticWhatsApp({ text: 'Need help with drywall', waFrom: '12135559876', profileName: 'Mike' }), false);
});

test('sendWhatsAppText returns message id on success', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ messages: [{ id: 'wamid.out.123' }] })
  });
  try {
    const result = await sendWhatsAppText({
      accessToken: 'token',
      phoneNumberId: '123456',
      to: '12135551234',
      text: 'hello'
    });
    assert.equal(result.ok, true);
    assert.equal(result.messageId, 'wamid.out.123');
  } finally {
    global.fetch = originalFetch;
  }
});

test('sendWhatsAppText returns error details on API failure', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { code: 131030, message: 'Recipient not allowed' } })
  });
  try {
    const result = await sendWhatsAppText({
      accessToken: 'token',
      phoneNumberId: '123456',
      to: '12135551234',
      text: 'hello'
    });
    assert.equal(result.ok, false);
    assert.equal(result.errorCode, '131030');
  } finally {
    global.fetch = originalFetch;
  }
});
