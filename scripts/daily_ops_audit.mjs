#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json'
};

async function rpc(name, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers, body: JSON.stringify(body || {})
  });
  if (!res.ok) throw new Error(`${name} ${res.status}: ${await res.text()}`);
  return res.json();
}

async function get(pathname) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, { headers });
  if (!res.ok) throw new Error(`GET ${pathname} ${res.status}: ${await res.text()}`);
  return res.json();
}

function riskLabel(v, t1, t2) {
  if (v >= t2) return 'CRITICAL';
  if (v >= t1) return 'HIGH';
  return 'OK';
}

const now = new Date();
const stamp = now.toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve('ops/reports');
await fs.mkdir(outDir, { recursive: true });

const stats = await rpc('dashboard_stats', { p_days: 30 });
const leads30 = await get('leads?select=id,is_test,stage,source,created_at&created_at=gte.' + encodeURIComponent(new Date(Date.now() - 30*24*60*60*1000).toISOString()));
const jobs = await get('jobs?select=id,status,lead_id,total_amount,completed_date');

const totalLeads = leads30.length;
const testLeads = leads30.filter(l => l.is_test).length;
const prodLeads = totalLeads - testLeads;
const testPct = totalLeads ? (100 * testLeads / totalLeads) : 0;

const completedJobs = jobs.filter(j => j.status === 'completed');
const linkedCompleted = completedJobs.filter(j => !!j.lead_id);
const unlinkedCompleted = completedJobs.length - linkedCompleted.length;

const stageNew = leads30.filter(l => !l.is_test && l.stage === 'new').length;

const lines = [];
lines.push(`# Handy & Friend Daily Ops Audit`);
lines.push(`Generated: ${now.toISOString()}`);
lines.push('');
lines.push('## Executive Snapshot');
lines.push(`- Leads (30d): ${prodLeads} prod / ${testLeads} test (${testPct.toFixed(1)}%)`);
lines.push(`- Completed jobs linked: ${linkedCompleted.length}/${completedJobs.length}`);
lines.push(`- Unlinked completed jobs: ${unlinkedCompleted}`);
lines.push(`- New-stage prod leads: ${stageNew}`);
lines.push(`- Conversion rate (dashboard): ${stats.conversion_rate ?? 'n/a'}%`);
lines.push('');
lines.push('## Critical Flags');
lines.push(`- Test data pollution: ${riskLabel(testPct, 30, 60)} (${testPct.toFixed(1)}%)`);
lines.push(`- Unlinked completed jobs: ${riskLabel(unlinkedCompleted, 1, 5)} (${unlinkedCompleted})`);
lines.push(`- Pipeline stagnation (stage=new prod): ${riskLabel(stageNew, 3, 10)} (${stageNew})`);
lines.push(`- Resend configured: ${(process.env.RESEND_API_KEY ? 'YES' : 'NO')}`);
lines.push('');
lines.push('## Raw dashboard_stats(30)');
lines.push('```json');
lines.push(JSON.stringify(stats, null, 2));
lines.push('```');

const outFile = path.join(outDir, `daily-ops-audit-${stamp}.md`);
await fs.writeFile(outFile, lines.join('\n'), 'utf8');
console.log(outFile);
