#!/usr/bin/env node
/**
 * Regenerate stuck/stale WhatsApp approval drafts.
 *
 * What it does:
 *   1. Finds telegram_sends rows source='whatsapp_approval' for which there is
 *      NO corresponding outbound row in whatsapp_messages (direction='out')
 *      for the same customer (extra.wa_from) within ±60 minutes.
 *   2. For each, runs generateAlexWhatsAppReply(extra.customer_message,
 *      extra.wa_from) to produce a fresh English draft.
 *   3. Validates the new draft passes detectSafetyFlags (safety must be empty).
 *   4. PATCH telegram_sends.extra.alex_draft + writes regenerated_at /
 *      regenerated_reason / superseded_old.
 *   5. Calls Telegram editMessageText to update the operator-visible body to
 *      the EXACT text that will be sent (no substitution at send time).
 *   6. If editMessageText fails, sends a NEW approval message and marks the
 *      old row.extra.superseded_by_telegram_id.
 *
 * Run from repo root:
 *   node scripts/regen-wa-drafts.mjs
 *
 * Env required (read from .env.production via Vercel pull or shell export):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
 *   DEEPSEEK_API_KEY, META_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN.
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// --- Pull production env into a temp file (no values printed) ---
const tmpDir = mkdtempSync(join(tmpdir(), 'hfregen_'));
const envFile = join(tmpDir, 'env');
execSync(`npx vercel env pull --environment=production --yes ${envFile}`, { stdio: ['ignore', 'ignore', 'ignore'] });
for (const line of readFileSync(envFile, 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)="?([^"\n]*)"?$/.exec(line);
  if (m) process.env[m[1]] = m[2].replace(/\\n/g, '').trim();
}
unlinkSync(envFile);

const SUPA_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

if (!SUPA_URL || !SUPA_KEY || !BOT_TOKEN || !OWNER_CHAT_ID) {
  console.error('Missing required env (SUPABASE_*, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID).');
  process.exit(1);
}

// --- Load engine + helpers ---
const { generateAlexWhatsAppReply, detectSafetyFlags } = require('../lib/alex/whatsapp-reply-engine.js');
const { sendApprovalRequest, editApprovalMessage } = require('../lib/telegram/approval.js');

async function supa(path, method = 'GET', body) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPA_KEY,
      Authorization: `Bearer ${SUPA_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`supa ${method} ${path} → ${r.status} ${t.slice(0, 200)}`);
  }
  return r.json();
}

function maskPhone(p) {
  const s = String(p || '');
  return s.length <= 4 ? '****' : s.slice(0, 3) + 'xxxx' + s.slice(-3);
}

async function findStuckApprovals() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const rows = await supa(`telegram_sends?source=eq.whatsapp_approval&created_at=gte.${since}&order=created_at.desc&limit=50`);
  const stuck = [];
  for (const r of rows) {
    const e = typeof r.extra === 'string' ? JSON.parse(r.extra) : r.extra || {};
    const to = e.wa_from;
    if (!to) continue;
    const after = r.created_at;
    const before = new Date(new Date(after).getTime() + 60 * 60 * 1000).toISOString();
    const outbox = await supa(
      `whatsapp_messages?direction=eq.out&phone_number=eq.${encodeURIComponent(to)}&created_at=gte.${encodeURIComponent(after)}&created_at=lt.${encodeURIComponent(before)}&select=wamid,created_at&limit=1`
    );
    if (Array.isArray(outbox) && outbox.length === 0) {
      stuck.push({ row: r, extra: e });
    }
  }
  return stuck;
}

async function regenerateOne({ row, extra }) {
  const customerMessage = String(extra.customer_message || '');
  const customerPhone = String(extra.wa_from || '');
  const customerName = extra.customer_name || 'Unknown';
  const inboundWamid = extra.wamid || '';

  console.log(`\n--- regen telegram_sends.id=${row.id} sid=${extra.short_id} customer=+${maskPhone(customerPhone)} ---`);
  console.log(`  customer message: ${JSON.stringify(customerMessage).slice(0, 100)}`);
  console.log(`  old draft (first 80): ${JSON.stringify(String(extra.alex_draft || '').slice(0, 80))}`);

  const gen = await generateAlexWhatsAppReply({ inboundText: customerMessage, customerPhone });
  const newDraft = gen.replyText;
  const newFlags = detectSafetyFlags(newDraft);
  console.log(`  new draft source=${gen.source} flags=${JSON.stringify(newFlags)} reason=${gen.reason}`);
  console.log(`  new draft (first 200): ${JSON.stringify(newDraft.slice(0, 200))}`);

  if (newFlags.length > 0 || !newDraft) {
    console.error('  ⚠ regenerated draft FAILED safety validator — refusing to update. Manual review needed.');
    return { ok: false, reason: `regen_unsafe:${newFlags.join(',')}` };
  }

  // Update extra.alex_draft (preserve other fields)
  const newExtra = {
    ...extra,
    alex_draft: newDraft,
    alex_draft_source: gen.source,
    alex_draft_model: gen.model,
    alex_draft_reason: gen.reason,
    alex_draft_regenerated_at: new Date().toISOString(),
    alex_draft_old: String(extra.alex_draft || '').slice(0, 200),
    alex_draft_old_replaced_reason: 'P0_regen_english_only',
  };
  await supa(`telegram_sends?id=eq.${row.id}`, 'PATCH', { extra: newExtra });
  console.log(`  ✓ Supabase telegram_sends.id=${row.id} extra.alex_draft updated to English`);

  // Try to edit the existing Telegram message
  const tgMsgId = row.telegram_message_id;
  const chatId = row.chat_id || OWNER_CHAT_ID;
  if (tgMsgId) {
    const edit = await editApprovalMessage({
      chatId, messageId: tgMsgId, customerPhone, customerName,
      customerMessage, alexDraft: newDraft, inboundWamid,
    });
    if (edit.ok) {
      console.log(`  ✓ Telegram message_id=${tgMsgId} edited in place`);
      await supa(`telegram_sends?id=eq.${row.id}`, 'PATCH', {
        extra: { ...newExtra, telegram_edit_at: new Date().toISOString() },
      });
      return { ok: true, mode: 'edit', telegramMessageId: tgMsgId };
    }
    console.log(`  ⚠ editMessageText failed: ${edit.errorCode} ${edit.errorDescription}`);
  } else {
    console.log('  (no telegram_message_id on row; cannot edit)');
  }

  // Fallback: send a NEW approval message; mark old as superseded
  const newSent = await sendApprovalRequest({
    inboundWamid,
    customerPhone, customerName, customerMessage,
    alexDraft: newDraft, threadId: row.session_id,
  });
  if (newSent?.ok && newSent.messageId) {
    console.log(`  ✓ Sent NEW approval Telegram message_id=${newSent.messageId} (telegram_sends.id=${newSent.telegramSendId})`);
    await supa(`telegram_sends?id=eq.${row.id}`, 'PATCH', {
      extra: {
        ...newExtra,
        superseded_by_telegram_id: newSent.telegramSendId,
        superseded_by_telegram_message_id: newSent.messageId,
      },
    });
    return { ok: true, mode: 'resend', telegramMessageId: newSent.messageId };
  }
  console.error(`  ✗ Could not edit AND could not send new approval`);
  return { ok: false, reason: 'edit_and_resend_failed' };
}

(async () => {
  console.log('Scanning Supabase for stuck WhatsApp approvals (last 24h)...');
  const stuck = await findStuckApprovals();
  console.log(`Found ${stuck.length} stuck approval(s) without outbound.`);
  if (!stuck.length) {
    console.log('Nothing to regenerate. Exiting.');
    return;
  }
  for (const item of stuck) {
    try {
      await regenerateOne(item);
    } catch (e) {
      console.error(`  ✗ Error regenerating row ${item.row.id}: ${e.message}`);
    }
  }
  console.log('\nDone.');
})();
