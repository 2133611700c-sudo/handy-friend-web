#!/usr/bin/env node
/**
 * OpenClaw → handyandfriend.com WhatsApp bridge
 * Bypasses Meta Cloud API (WABA classified SMB → /register blocked).
 * Tails OpenClaw gateway log for inbound WhatsApp messages,
 * forwards to /api/whatsapp-webhook in Meta-compatible format,
 * sends reply via `openclaw message send`.
 */
const { spawn } = require('child_process');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const WEBHOOK_URL = process.env.WA_WEBHOOK_URL || 'https://handyandfriend.com/api/whatsapp-webhook';
const APP_SECRET = process.env.FB_APP_SECRET || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '920678054472684';
const DISPLAY_PHONE = '12133611700';
const SEEN = new Map();

function log(...a) { console.log(new Date().toISOString(), '[bridge]', ...a); }

function postWebhook(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const url = new URL(WEBHOOK_URL);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'X-Outbound-Mode': 'openclaw'
    };
    if (APP_SECRET) {
      headers['X-Hub-Signature-256'] = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(body).digest('hex');
    }
    const req = https.request({
      hostname: url.hostname, port: 443, path: url.pathname + url.search,
      method: 'POST', headers, timeout: 30000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.write(body); req.end();
  });
}

function sendReply(toNumber, text) {
  return new Promise(resolve => {
    const args = ['message', 'send', '--channel', 'whatsapp',
      '--target', `+${toNumber}`, '--message', text, '--json'];
    const p = spawn('openclaw', args);
    let out = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => out += d);
    p.on('close', code => {
      if (code === 0) {
        const jsonLine = out.split('\n').filter(l => l.trim().startsWith('{')).pop();
        try {
          const j = JSON.parse(jsonLine || '{}');
          log('reply sent', j.data?.result?.messageId || 'ok');
        } catch { log('reply sent (raw)', out.slice(0,150)); }
      } else log('reply FAILED code', code, out.slice(0,200));
      resolve();
    });
  });
}

async function handleInbound(msg) {
  const from = String(msg.from || '').replace(/^\+/, '');
  const to = String(msg.to || '').replace(/^\+/, '');
  const text = String(msg.body || '').trim();
  const ts = msg.timestamp || Date.now();

  if (!from || !text) return;
  // Skip self-messages (own outbound echo)
  if (from === to && from === DISPLAY_PHONE) {
    log(`skip self-msg from +${from}: "${text.slice(0,40)}"`);
    return;
  }

  const dedupKey = `${from}|${ts}|${text.slice(0,40)}`;
  if (SEEN.has(dedupKey)) return;
  SEEN.set(dedupKey, Date.now());
  if (SEEN.size > 500) {
    const cutoff = Date.now() - 5*60*1000;
    for (const [k,t] of SEEN) if (t < cutoff) SEEN.delete(k);
  }

  const msgId = `oc-${ts}-${crypto.randomBytes(3).toString('hex')}`;
  log(`inbound from=+${from} text="${text.slice(0,80)}"`);

  const metaPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1577856530133515',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: DISPLAY_PHONE, phone_number_id: PHONE_NUMBER_ID },
          contacts: [{ profile: { name: msg.pushName || 'Customer' }, wa_id: from }],
          messages: [{
            from, id: msgId, timestamp: String(Math.floor(ts/1000)),
            text: { body: text }, type: 'text'
          }]
        },
        field: 'messages'
      }]
    }]
  };

  try {
    const { status, body } = await postWebhook(metaPayload);
    log(`webhook ${status}, resp=${body.slice(0,150)}`);
    if (status === 200) {
      try {
        const j = JSON.parse(body);
        if (j.reply) await sendReply(from, j.reply);
      } catch { /* not JSON, no reply */ }
    }
  } catch (err) {
    log('webhook ERROR', err.message);
  }
}

function getLatestLog() {
  const files = fs.readdirSync('/tmp/openclaw').filter(f => f.startsWith('openclaw-') && f.endsWith('.log'));
  if (!files.length) return null;
  files.sort();
  return '/tmp/openclaw/' + files[files.length-1];
}

const logFile = getLatestLog();
if (!logFile) { log('no openclaw log found'); process.exit(1); }
log(`bridge starting, tailing ${logFile}`);
log(`webhook=${WEBHOOK_URL} hmac=${APP_SECRET ? 'on' : 'off'}`);

const tail = spawn('tail', ['-F', '-n', '0', logFile]);
let buf = '';
tail.stdout.on('data', chunk => {
  buf += chunk.toString();
  const lines = buf.split('\n');
  buf = lines.pop() || '';
  for (const line of lines) {
    if (!line.includes('web-inbound')) continue;
    try {
      const outer = JSON.parse(line);
      const msg = outer['1'];
      if (msg && typeof msg === 'object' && msg.body) handleInbound(msg);
    } catch { /* skip non-JSON */ }
  }
});
tail.stderr.on('data', d => log('tail stderr', d.toString().slice(0,150)));
tail.on('exit', c => { log('tail exited', c); process.exit(c || 0); });
process.on('SIGINT', () => { log('SIGINT, exiting'); tail.kill(); process.exit(0); });
process.on('SIGTERM', () => { log('SIGTERM, exiting'); tail.kill(); process.exit(0); });
