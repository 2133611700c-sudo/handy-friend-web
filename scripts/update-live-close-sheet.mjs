#!/usr/bin/env node
/**
 * Regenerates today's live close sheet from Supabase live data.
 * Source of truth: leads + lead_events.
 */

import fs from 'node:fs';
import path from 'node:path';

const ENV = {
  SUPABASE_URL: String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, ''),
  SUPABASE_SERVICE_ROLE_KEY: String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim().replace(/\\n$/, ''),
};

if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: ENV.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  Accept: 'application/json',
  'Content-Type': 'application/json',
};

async function sbGet(pathname) {
  const res = await fetch(`${ENV.SUPABASE_URL}/rest/v1/${pathname}`, { headers });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase GET failed ${res.status}: ${text.slice(0, 240)}`);
  return text ? JSON.parse(text) : [];
}

function check(v) {
  return v ? '✅' : '⬜';
}

function fmtTs(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

function digits(v) {
  return String(v || '').replace(/\D/g, '');
}

function waLink(phone, text) {
  const ph = digits(phone);
  if (!ph) return '';
  return `https://wa.me/1${ph}?text=${encodeURIComponent(text)}`;
}

async function run() {
  const today = new Date().toISOString().slice(0, 10);
  const targetFile = path.join(process.cwd(), 'ops', 'reports', `${today}-live-close-sheet.md`);

  const leads = await sbGet(
    'leads?select=id,full_name,phone,email,service_type,stage,outcome,created_at,updated_at,source,is_test,lost_reason&is_test=eq.false&order=updated_at.desc&limit=300'
  );
  const events = await sbGet(
    'lead_events?select=lead_id,event_type,created_at,event_payload&order=created_at.desc&limit=4000'
  );

  const byLead = new Map();
  for (const ev of events) {
    if (!byLead.has(ev.lead_id)) byLead.set(ev.lead_id, []);
    byLead.get(ev.lead_id).push(ev);
  }

  const activeLead = leads.find(
    (l) => digits(l.phone).endsWith('3106635792') || l.id === 'chat_1772464815694_cxe3l'
  );

  const reviewEventLeads = [];
  const seen = new Set();
  for (const ev of events) {
    if (ev.event_type !== 'review_request_sent') continue;
    if (seen.has(ev.lead_id)) continue;
    seen.add(ev.lead_id);
    reviewEventLeads.push(ev.lead_id);
    if (reviewEventLeads.length >= 3) break;
  }

  const reviewTargets = reviewEventLeads
    .map((id) => leads.find((l) => l.id === id))
    .filter(Boolean);

  const reactivationText = `Hi there! This is Sergii from Handy & Friend. You reached out about cabinet painting — are you still looking for help with that?

I have availability this week. Cabinet painting starts at $75/door, paint included.

Just reply here or call/text (213) 361-1700 for a free estimate!

— Sergii`;

  const reviewText =
    'Hi! Thanks again for choosing Handy & Friend. If you have 30 seconds, a Google review helps us a lot: https://handyandfriend.com/review';

  let step1 = false;
  let step1Ts = '';
  let step2 = false;
  let step2Ts = '';
  let step3 = false;
  let step3Ts = '';
  let stageMoved = false;
  let stageMovedTs = '';
  let outcomeSet = false;
  let outcomeSetTs = '';

  if (activeLead) {
    const evs = byLead.get(activeLead.id) || [];
    const findType = (types) => evs.find((e) => types.includes(e.event_type));

    const sentEvent = findType(['reactivation_message_sent', 'status_contacted', 'stage_contacted', 'manual_whatsapp_sent']);
    if (sentEvent) {
      step1 = true;
      step1Ts = fmtTs(sentEvent.created_at);
    }

    const callEvent = findType(['call_attempt', 'phone_call_attempt']);
    if (callEvent) {
      step2 = true;
      step2Ts = fmtTs(callEvent.created_at);
    }

    const followupEvent = findType(['reactivation_followup_sent', 'followup_sent']);
    if (followupEvent) {
      step3 = true;
      step3Ts = fmtTs(followupEvent.created_at);
    }

    if (activeLead.stage && activeLead.stage !== 'new') {
      stageMoved = true;
      stageMovedTs = fmtTs(activeLead.updated_at);
    }
    if (activeLead.outcome) {
      outcomeSet = true;
      outcomeSetTs = fmtTs(activeLead.updated_at);
    }
  }

  const reviewRows = reviewTargets.map((lead, idx) => {
    const evs = byLead.get(lead.id) || [];
    const sent = evs.find((e) => e.event_type === 'review_request_sent');
    const sentTs = sent ? fmtTs(sent.created_at) : '';
    return {
      n: idx + 1,
      lead,
      sent: Boolean(sent),
      sentTs,
    };
  });

  const reviewSentCount = reviewRows.filter((r) => r.sent).length;

  const lines = [];
  lines.push(`# Live Close Sheet — ${today}`);
  lines.push('');
  lines.push('## Objective (Today)');
  lines.push('- Close active stale lead or mark clean loss with reason.');
  lines.push('- Send 3 review requests and log actual send actions.');
  lines.push('- Keep zero open hot leads without same-day action.');
  lines.push('');
  lines.push('## A) Active Revenue Lead — Real-Time Execution');
  lines.push('');
  lines.push('| Lead ID | Name | Phone | Service | Stage (now) | Priority |');
  lines.push('|---|---|---|---|---|---|');
  if (activeLead) {
    lines.push(`| \`${activeLead.id}\` | ${activeLead.full_name || 'Unknown'} | ${activeLead.phone || ''} | ${activeLead.service_type || ''} | ${activeLead.stage || ''} | CRITICAL |`);
  } else {
    lines.push('| — | — | — | — | — | — |');
  }
  lines.push('');
  lines.push('### Touch Log (Lead 310-663-5792)');
  lines.push('| Step | Due | Status | Timestamp | Channel | Notes |');
  lines.push('|---|---|---|---|---|---|');
  lines.push(`| WhatsApp send (reactivation) | NOW | ${check(step1)} | ${step1Ts} | WhatsApp | Use prefilled deeplink |`);
  lines.push(`| Call attempt #1 | +30 min if no reply | ${check(step2)} | ${step2Ts} | Phone | Use short close script |`);
  lines.push(`| Follow-up #2 | +2h if no reply | ${check(step3)} | ${step3Ts} | WhatsApp/SMS | "Still interested" final same-day |`);
  lines.push(`| Stage update (\`contacted/quoted/lost\`) | Same day | ${check(stageMoved)} | ${stageMovedTs} | CRM | Mandatory |`);
  lines.push(`| Outcome update (\`won/lost\`) | Same day | ${check(outcomeSet)} | ${outcomeSetTs} | CRM | If lost, set \`lost_reason\` |`);
  lines.push('');
  lines.push('### Ready Links / Script');
  lines.push('- WhatsApp deeplink:');
  lines.push(`\`${waLink(activeLead?.phone || '3106635792', reactivationText)}\``);
  lines.push('- Call script (30-45 sec):');
  lines.push('"Hi, this is Sergii from Handy & Friend. You asked about cabinet painting. I have availability this week and cabinet painting starts at $75/door, paint included. Want a quick quote now?"');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## B) Review Push — Real Send Tracking (3 contacts)');
  lines.push('');
  lines.push('| # | Lead ID | Name | Phone | Service | Review ask sent | Sent at | Follow-up D+3 | Review posted |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  if (reviewRows.length === 0) {
    lines.push('| 1 | — | — | — | — | ⬜ |  | ⬜ | ⬜ |');
  } else {
    for (const row of reviewRows) {
      lines.push(`| ${row.n} | \`${row.lead.id}\` | ${row.lead.full_name || 'Unknown'} | ${row.lead.phone || ''} | ${row.lead.service_type || ''} | ${check(row.sent)} | ${row.sentTs} | ⬜ | ⬜ |`);
    }
  }
  lines.push('');
  lines.push('### Review Message Template');
  lines.push(`"${reviewText}"`);
  lines.push('');
  lines.push('### WhatsApp Deeplinks');
  for (const row of reviewRows) {
    lines.push(`- ${row.lead.full_name || row.lead.id}: \`${waLink(row.lead.phone, reviewText)}\``);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## C) End-of-Day KPI Snapshot (auto + manual)');
  lines.push('');
  lines.push('| KPI | Target | Actual | Status |');
  lines.push('|---|---|---|---|');
  lines.push(`| Lost lead contacted | 1/1 | ${step1 ? '1' : '0'} | ${check(step1)} |`);
  lines.push(`| Lost lead moved from \`new\` | yes | ${stageMoved ? 'yes' : 'no'} | ${check(stageMoved)} |`);
  lines.push('| Quotes sent today | >=1 |  | ⬜ |');
  lines.push('| Deals won today | >=1 |  | ⬜ |');
  lines.push(`| Review asks sent (real) | 3/3 | ${reviewSentCount}/3 | ${check(reviewSentCount >= 3)} |`);
  lines.push('| New reviews posted | >=1 |  | ⬜ |');
  lines.push('');
  lines.push('## D) Close Notes');
  lines.push('- Blockers:');
  lines.push('- What worked:');
  lines.push('- What failed:');
  lines.push('- First action tomorrow morning:');
  lines.push('');
  lines.push('---');
  lines.push(`Generated by: \`scripts/update-live-close-sheet.mjs\` at ${new Date().toISOString()}`);

  fs.mkdirSync(path.dirname(targetFile), { recursive: true });
  fs.writeFileSync(targetFile, lines.join('\n'));
  console.log(targetFile);
}

run().catch((err) => {
  console.error('[update-live-close-sheet] fatal:', err.message);
  process.exit(1);
});

