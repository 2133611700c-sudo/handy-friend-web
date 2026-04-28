const test = require('node:test');
const assert = require('node:assert/strict');

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'srv';

test('extractCollectedFields detects ZIP from message history', () => {
  const { extractCollectedFields } = require('../lib/whatsapp/conversation-memory.js');
  const history = [
    { role: 'user', content: 'My ZIP is 90038' },
  ];
  const fields = extractCollectedFields(history);
  assert.equal(fields.zip, '90038');
});

test('extractCollectedFields detects TV size', () => {
  const { extractCollectedFields } = require('../lib/whatsapp/conversation-memory.js');
  const fields = extractCollectedFields([{ role: 'user', content: 'I have a 65 inch TV' }]);
  assert.equal(fields.tv_size, '65 inch');
});

test('extractCollectedFields detects brick wall type', () => {
  const { extractCollectedFields } = require('../lib/whatsapp/conversation-memory.js');
  const fields = extractCollectedFields([{ role: 'user', content: 'mounting on brick wall' }]);
  assert.equal(fields.wall_type, 'brick');
});

test('buildCollectedFieldsSummary generates context string', () => {
  const { buildCollectedFieldsSummary } = require('../lib/whatsapp/conversation-memory.js');
  const s = buildCollectedFieldsSummary({ zip: '90038', tv_size: '65 inch' });
  assert.match(s, /zip=90038/);
  assert.match(s, /tv_size=65 inch/);
  assert.match(s, /Do NOT ask for these again/);
});

test('buildCollectedFieldsSummary returns empty for no fields', () => {
  const { buildCollectedFieldsSummary } = require('../lib/whatsapp/conversation-memory.js');
  assert.equal(buildCollectedFieldsSummary({}), '');
});
