#!/usr/bin/env node

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sendTelegramMessage } = require('../lib/telegram/send.js');

function usage() {
  console.error('Usage: node scripts/send-telegram.mjs --source <source> [--category <category>] [--actionable 0|1] [--lead-id <id>] [--token <token>] [--chat-id <chatId>] [--stdin | --text <text>]');
  process.exit(2);
}

function parseArgs(argv) {
  const out = {
    source: '',
    category: '',
    actionable: false,
    leadId: '',
    text: '',
    stdin: false,
    token: '',
    chatId: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--source') out.source = String(argv[++i] || '');
    else if (arg === '--category') out.category = String(argv[++i] || '');
    else if (arg === '--lead-id') out.leadId = String(argv[++i] || '');
    else if (arg === '--actionable') out.actionable = ['1', 'true', 'yes', 'on'].includes(String(argv[++i] || '').toLowerCase());
    else if (arg === '--text') out.text = String(argv[++i] || '');
    else if (arg === '--stdin') out.stdin = true;
    else if (arg === '--token') out.token = String(argv[++i] || '');
    else if (arg === '--chat-id') out.chatId = String(argv[++i] || '');
    else if (arg === '--help' || arg === '-h') usage();
    else usage();
  }
  return out;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.source) usage();
  if (args.stdin) args.text = await readStdin();
  if (!String(args.text || '').trim()) usage();

  const result = await sendTelegramMessage({
    source: args.source,
    leadId: args.leadId || null,
    text: args.text.trim(),
    token: args.token || undefined,
    chatId: args.chatId || undefined,
    timeoutMs: 8000,
    extra: {
      category: args.category || null,
      actionable: args.actionable === true,
      transport: 'cli_wrapper'
    }
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exit(result.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
