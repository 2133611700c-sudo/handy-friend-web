const test = require('node:test');
const assert = require('node:assert/strict');

const { formatNewLeadAlert } = require('../lib/alert-formats.js');

test('formatNewLeadAlert marks WhatsApp as REAL_LEAD class', () => {
  const lead = {
    id: 'lead_test_wa_1',
    full_name: 'Mike',
    phone: '+12135551234',
    email: 'mike@example.com',
    service_type: 'tv_mounting'
  };
  const envelope = {
    source: 'whatsapp',
    raw_text: 'Need TV mounting today',
    service_hint: 'tv_mounting',
    area_hint: 'Hollywood'
  };

  const text = formatNewLeadAlert(lead, envelope);
  assert.match(text, /REAL_LEAD/);
  assert.match(text, /WhatsApp/);
});

