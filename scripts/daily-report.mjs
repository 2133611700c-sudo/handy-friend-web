#!/usr/bin/env node
// ============================================================
// Daily Report Orchestrator — Handy & Friend
// Single source of truth for morning KPI digest.
// Sends to: Telegram + Email + Archive file.
//
// Usage:
//   node scripts/daily-report.mjs              # full run
//   node scripts/daily-report.mjs --dry-run    # generate only, no send
//   node scripts/daily-report.mjs --smoke      # send test ping
//
// Required ENV:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
//   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID,
//   RESEND_API_KEY, REPORT_EMAIL_TO
// ============================================================

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const require = createRequire(import.meta.url);
const { sendTelegramMessage: unifiedTelegramSend } = require('../lib/telegram/send.js');

// ── ENV ──────────────────────────────────────────────────────

// Clean env values: Vercel CLI env pull adds literal \n and quotes
const cleanEnv = (v) => (v || '').replace(/\\n/g, '').replace(/^"|"$/g, '').trim();

const ENV = {
  SUPABASE_URL:              cleanEnv(process.env.SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY),
  TELEGRAM_BOT_TOKEN:        cleanEnv(process.env.TELEGRAM_BOT_TOKEN),
  TELEGRAM_CHAT_ID:          cleanEnv(process.env.TELEGRAM_CHAT_ID),
  RESEND_API_KEY:            cleanEnv(process.env.RESEND_API_KEY),
  REPORT_EMAIL_TO:           cleanEnv(process.env.REPORT_EMAIL_TO) || cleanEnv(process.env.OWNER_EMAIL) || 'hello@handyandfriend.com',
  REPORT_EMAIL_FROM:         cleanEnv(process.env.REPORT_EMAIL_FROM) || 'Handy & Friend Reports <leads@handyandfriend.com>',
};

function validateEnv(required) {
  const missing = required.filter(k => !ENV[k]);
  if (missing.length) {
    throw new Error(`Missing required ENV vars: ${missing.join(', ')}`);
  }
}

// ── Helpers ──────────────────────────────────────────────────

const TZ = 'America/Los_Angeles';
const now = () => new Date();
const fmtDate = (d = now()) => d.toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
const fmtTime = (d = now()) => d.toLocaleString('en-US', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });

function log(level, msg, data) {
  const entry = { ts: now().toISOString(), level, msg, ...(data ? { data } : {}) };
  console[level === 'error' ? 'error' : 'log'](JSON.stringify(entry));
}

async function fetchWithRetry(url, opts, { retries = 3, backoffMs = 1000, timeoutMs = 15000 } = {}) {
  const shouldRetryHttp = (status) => status === 408 || status === 429 || status >= 500;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok && attempt < retries && shouldRetryHttp(res.status)) {
        log('warn', `HTTP ${res.status} on attempt ${attempt}, retrying...`, { url });
        await sleep(backoffMs * attempt);
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt < retries) {
        log('warn', `Fetch error attempt ${attempt}: ${err.message}`, { url });
        await sleep(backoffMs * attempt);
        continue;
      }
      throw err;
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Supabase ─────────────────────────────────────────────────

const sbHeaders = () => ({
  apikey: ENV.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
});

async function callRPC(fn, params = {}) {
  const url = `${ENV.SUPABASE_URL}/rest/v1/rpc/${fn}`;
  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RPC ${fn} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function queryView(view, query = '') {
  const url = `${ENV.SUPABASE_URL}/rest/v1/${view}${query ? '?' + query : ''}`;
  const res = await fetchWithRetry(url, {
    method: 'GET',
    headers: { ...sbHeaders(), Accept: 'application/json', Prefer: 'return=representation' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`View ${view} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function queryTable(table, query = '') {
  const url = `${ENV.SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const res = await fetchWithRetry(url, {
    method: 'GET',
    headers: { ...sbHeaders(), Accept: 'application/json', Prefer: 'return=representation' },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Table ${table} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function queryTableAll(table, query = '', { pageSize = 1000, maxPages = 20 } = {}) {
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const sep = query ? '&' : '';
    const pageQuery = `${query}${sep}limit=${pageSize}&offset=${page * pageSize}`;
    const rows = await queryTable(table, pageQuery);
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

function hashText(text) {
  return createHash('sha256').update(String(text || '')).digest('hex').slice(0, 16);
}

function normalizeExtra(extra) {
  if (!extra) return {};
  if (typeof extra === 'object') return extra;
  try {
    return JSON.parse(String(extra));
  } catch {
    return {};
  }
}

async function getLatestDailyReportDigest() {
  try {
    const rows = await queryTable(
      'telegram_sends',
      'select=id,created_at,extra&source=eq.daily_report&ok=eq.true&order=created_at.desc&limit=1'
    );
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) return null;
    const extra = normalizeExtra(row.extra);
    return {
      id: row.id || null,
      created_at: row.created_at || null,
      digest_hash: extra.digest_hash || null,
    };
  } catch (err) {
    log('warn', 'Failed to fetch latest daily_report digest', { error: err.message });
    return null;
  }
}

function defaultDashboardStats(days = 30) {
  return {
    days,
    leads_total: 0,
    leads_prev: 0,
    conversion_rate: 0,
    revenue: 0,
    revenue_prev: 0,
    profit: 0,
    expenses_total: 0,
    avg_response_min: null,
    jobs_completed: 0,
    avg_job_rating: null,
    avg_deal_size: 0,
    pipeline_value: 0,
    jobs_revenue: 0,
    stale_leads: 0,
    test_leads_total: 0,
    test_leads_pct: 0,
    reviews_total: 0,
    reviews_avg_rating: null,
    unresponded_reviews: 0,
    chat_sessions: 0,
    chat_messages: 0,
    fb_sessions: 0,
    leads_by_source: {},
    leads_by_stage: {},
    leads_by_service: {},
  };
}

async function safeFetch(name, fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    log('warn', `${name} unavailable, using fallback`, { error: err.message });
    return fallback;
  }
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toDateOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isBetween(d, since, until = new Date()) {
  return d && d >= since && d < until;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function aggregateCounts(items, keyFn) {
  const map = {};
  for (const it of items) {
    const k = keyFn(it) || 'unknown';
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

function getFirstContactMap(leadEvents) {
  const allowed = new Set(['owner_email_sent', 'telegram_sent', 'status_contacted', 'stage_contacted']);
  const first = new Map();
  for (const e of leadEvents) {
    if (!allowed.has(e.event_type)) continue;
    const id = String(e.lead_id ?? '');
    if (!id) continue;
    const at = toDateOrNull(e.created_at);
    if (!at) continue;
    const prev = first.get(id);
    if (!prev || at < prev.at) first.set(id, { at, method: e.event_type, source: 'lead_events' });
  }
  return first;
}

function buildPeriodStats(days, all) {
  const nowTs = new Date();
  const since = new Date(nowTs.getTime() - days * 24 * 60 * 60 * 1000);
  const prevSince = new Date(since.getTime() - days * 24 * 60 * 60 * 1000);

  const leadsAll = all.leads || [];
  const jobsAll = all.jobs || [];
  const expensesAll = all.expenses || [];
  const reviewsAll = all.reviews || [];
  const convAll = all.conversations || [];
  const firstContact = all.firstContact || new Map();

  const leadsIn = leadsAll.filter(l => {
    const d = toDateOrNull(l.created_at);
    return d && isBetween(d, since, nowTs);
  });
  const leadsPrev = leadsAll.filter(l => {
    const d = toDateOrNull(l.created_at);
    return d && isBetween(d, prevSince, since);
  });

  const prodIn = leadsIn.filter(l => l.is_test !== true);
  const prodPrev = leadsPrev.filter(l => l.is_test !== true);
  const testIn = leadsIn.filter(l => l.is_test === true);

  const revenue = leadsAll
    .filter(l => l.is_test !== true && l.outcome === 'won' && isBetween(toDateOrNull(l.closed_at), since, nowTs))
    .reduce((s, l) => s + toNum(l.won_amount), 0);
  const revenuePrev = leadsAll
    .filter(l => l.is_test !== true && l.outcome === 'won' && isBetween(toDateOrNull(l.closed_at), prevSince, since))
    .reduce((s, l) => s + toNum(l.won_amount), 0);

  const wonDeals = leadsAll.filter(l => l.is_test !== true && l.outcome === 'won' && isBetween(toDateOrNull(l.closed_at), since, nowTs));
  const avgDealSize = wonDeals.length ? round1(wonDeals.reduce((s, l) => s + toNum(l.won_amount), 0) / wonDeals.length) : 0;

  const pipelineValue = leadsAll
    .filter(l => l.is_test !== true && ['quoted', 'qualified'].includes(String(l.stage || '')) && toNum(l.quoted_amount) > 0)
    .reduce((s, l) => s + toNum(l.quoted_amount), 0);

  const sinceDate = since.toISOString().slice(0, 10);
  const jobsCompleted = jobsAll.filter(j => j.status === 'completed' && j.completed_date && String(j.completed_date) >= sinceDate);
  const jobsRevenue = jobsCompleted.reduce((s, j) => s + toNum(j.total_amount), 0);
  const avgJobRatingRows = jobsCompleted.filter(j => j.rating != null);
  const avgJobRating = avgJobRatingRows.length
    ? round1(avgJobRatingRows.reduce((s, j) => s + toNum(j.rating), 0) / avgJobRatingRows.length)
    : null;

  const expensesTotal = expensesAll
    .filter(e => isBetween(toDateOrNull(e.created_at), since, nowTs))
    .reduce((s, e) => s + toNum(e.amount), 0);

  const staleLeads = leadsAll.filter(l => {
    const d = toDateOrNull(l.created_at);
    return l.is_test !== true && l.stage === 'new' && d && d < new Date(nowTs.getTime() - 24 * 60 * 60 * 1000);
  }).length;

  const responseValues = [];
  for (const l of prodIn) {
    const created = toDateOrNull(l.created_at);
    if (!created) continue;
    const fc = firstContact.get(String(l.id));
    if (!fc || !fc.at) continue;
    const min = Math.round((fc.at - created) / 60000);
    if (Number.isFinite(min) && min >= 0) responseValues.push(min);
  }
  const avgResponse = responseValues.length ? Math.round(responseValues.reduce((a, b) => a + b, 0) / responseValues.length) : null;

  const reviewsIn = reviewsAll.filter(r => isBetween(toDateOrNull(r.created_at), since, nowTs));
  const rated = reviewsIn.filter(r => r.rating != null);
  const reviewsAvg = rated.length ? round1(rated.reduce((s, r) => s + toNum(r.rating), 0) / rated.length) : null;

  const convIn = convAll.filter(c => isBetween(toDateOrNull(c.created_at), since, nowTs));
  const chatSessions = new Set(convIn.map(c => c.session_id).filter(Boolean)).size;
  const chatMessages = convIn.filter(c => c.message_role === 'user').length;
  const fbSessions = new Set(convIn.map(c => c.session_id).filter(s => String(s || '').startsWith('fb_'))).size;

  const wonIn = prodIn.filter(l => l.outcome === 'won').length;
  const conversionRate = prodIn.length ? round1((wonIn * 100) / prodIn.length) : 0;
  const testPct = leadsIn.length ? round1((testIn.length * 100) / leadsIn.length) : 0;

  return {
    period_days: days,
    generated_at: nowTs.toISOString(),
    leads_total: prodIn.length,
    leads_prev: prodPrev.length,
    leads_by_source: aggregateCounts(prodIn, l => l.source),
    leads_by_service: aggregateCounts(prodIn, l => l.service_type),
    leads_by_stage: aggregateCounts(prodIn, l => l.stage),
    revenue,
    revenue_prev: revenuePrev,
    avg_deal_size: avgDealSize,
    pipeline_value: pipelineValue,
    jobs_completed: jobsCompleted.length,
    jobs_revenue: jobsRevenue,
    avg_job_rating: reviewsAvg ?? avgJobRating,
    avg_response_min: avgResponse,
    conversion_rate: conversionRate,
    expenses_total: expensesTotal,
    profit: jobsRevenue - expensesTotal,
    stale_leads: staleLeads,
    test_leads_total: testIn.length,
    test_leads_pct: testPct,
    reviews_total: reviewsIn.length,
    reviews_avg_rating: reviewsAvg,
    unresponded_reviews: reviewsIn.filter(r => r.responded === false).length,
    chat_sessions: chatSessions,
    chat_messages: chatMessages,
    fb_sessions: fbSessions,
  };
}

async function deriveKPIFromTables() {
  const [leads, jobs, expenses, reviews, conversations, leadEvents] = await Promise.all([
    safeFetch('Table leads', () => queryTableAll('leads', 'select=id,created_at,source,service_type,stage,outcome,won_amount,quoted_amount,closed_at,is_test,response_time_min,contacted_at,session_id'), []),
    safeFetch('Table jobs', () => queryTableAll('jobs', 'select=id,completed_date,status,total_amount,rating,created_at'), []),
    safeFetch('Table expenses', () => queryTableAll('expenses', 'select=id,created_at,amount'), []),
    safeFetch('Table reviews', () => queryTableAll('reviews', 'select=id,created_at,rating,responded'), []),
    safeFetch('Table ai_conversations', () => queryTableAll('ai_conversations', 'select=id,session_id,message_role,created_at'), []),
    safeFetch('Table lead_events', () => queryTableAll('lead_events', 'select=lead_id,event_type,created_at&order=created_at.desc'), []),
  ]);

  const firstContact = getFirstContactMap(leadEvents);
  const all = { leads, jobs, expenses, reviews, conversations, firstContact };
  const d7 = buildPeriodStats(7, all);
  const d30 = buildPeriodStats(30, all);

  const prodLeadsAll = leads.filter(l => l.is_test !== true);
  const stageCounts = aggregateCounts(prodLeadsAll, l => l.stage);
  const totalAll = prodLeadsAll.length || 1;
  const funnel = Object.entries(stageCounts).map(([stage, cnt]) => ({
    stage,
    cnt,
    pct: round1((cnt * 100) / totalAll),
  })).sort((a, b) => b.cnt - a.cnt);

  const recent = [...prodLeadsAll]
    .sort((a, b) => (toDateOrNull(b.created_at)?.getTime() || 0) - (toDateOrNull(a.created_at)?.getTime() || 0))
    .slice(0, 10)
    .map(l => {
      const created = toDateOrNull(l.created_at);
      const fc = firstContact.get(String(l.id));
      const slaMin = created && fc?.at ? Math.max(0, Math.round((fc.at - created) / 60000)) : null;
      return {
        id: l.id,
        sla_min: slaMin,
        sla_source: fc ? 'lead_events' : 'none',
        first_contact_method: fc?.method || null,
      };
    });

  return { d7, d30, funnel, sla: recent };
}

// ── Data Fetching ────────────────────────────────────────────

async function fetchAllKPI() {
  log('info', 'Fetching KPI data from Supabase...');

  const [d7rpc, d30rpc, funnelView, slaView] = await Promise.allSettled([
    callRPC('dashboard_stats', { p_days: 7 }),
    callRPC('dashboard_stats', { p_days: 30 }),
    queryView('v_lead_funnel'),
    queryView('v_response_sla', 'select=id,sla_min,sla_source,first_contact_method&order=created_at.desc&limit=10'),
  ]);

  const needDerived =
    d7rpc.status === 'rejected' ||
    d30rpc.status === 'rejected' ||
    funnelView.status === 'rejected' ||
    slaView.status === 'rejected';

  const derived = needDerived
    ? await safeFetch(
        'Derived KPI (tables fallback)',
        () => deriveKPIFromTables(),
        { d7: defaultDashboardStats(7), d30: defaultDashboardStats(30), funnel: [], sla: [] }
      )
    : null;

  const isKnownSchemaDrift = (reason) => {
    const msg = String(reason?.message || reason || '');
    return msg.includes('operator does not exist: uuid = text') || msg.includes('"code":"42883"');
  };

  if (d7rpc.status === 'rejected') {
    const m = d7rpc.reason?.message || String(d7rpc.reason);
    log(isKnownSchemaDrift(d7rpc.reason) ? 'log' : 'warn', 'RPC dashboard_stats(7d) failed', { error: m });
  }
  if (d30rpc.status === 'rejected') {
    const m = d30rpc.reason?.message || String(d30rpc.reason);
    log(isKnownSchemaDrift(d30rpc.reason) ? 'log' : 'warn', 'RPC dashboard_stats(30d) failed', { error: m });
  }
  if (funnelView.status === 'rejected') {
    const m = funnelView.reason?.message || String(funnelView.reason);
    log(isKnownSchemaDrift(funnelView.reason) ? 'log' : 'warn', 'View v_lead_funnel failed', { error: m });
  }
  if (slaView.status === 'rejected') {
    const m = slaView.reason?.message || String(slaView.reason);
    log(isKnownSchemaDrift(slaView.reason) ? 'log' : 'warn', 'View v_response_sla failed', { error: m });
  }

  const d7 = d7rpc.status === 'fulfilled' ? d7rpc.value : (derived?.d7 || defaultDashboardStats(7));
  const d30 = d30rpc.status === 'fulfilled' ? d30rpc.value : (derived?.d30 || defaultDashboardStats(30));
  const funnel = funnelView.status === 'fulfilled' ? funnelView.value : (derived?.funnel || []);
  const sla = slaView.status === 'fulfilled' ? slaView.value : (derived?.sla || []);

  log('info', 'KPI data fetched', { d7_leads: d7.leads_total, d30_leads: d30.leads_total });
  return { d7, d30, funnel, sla };
}

// ── Delta Calculation ────────────────────────────────────────

function delta(current, previous) {
  if (current == null || previous == null) return null;
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous) * 100);
}

function deltaStr(current, previous, suffix = '') {
  const d = delta(current, previous);
  if (d == null) return '';
  const sign = d > 0 ? '↑' : d < 0 ? '↓' : '→';
  return ` ${sign}${Math.abs(d).toFixed(0)}%${suffix}`;
}

function fmtNum(n) {
  if (n == null) return 'No data';
  if (typeof n === 'number') return n.toLocaleString('en-US');
  return String(n);
}

function fmtMoney(n) {
  if (n == null) return 'No data';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(n) {
  if (n == null) return 'No data';
  return n + '%';
}

function fmtMin(n) {
  if (n == null) return 'NULL (no data)';
  return n + ' min';
}

// ── Alerts ───────────────────────────────────────────────────

function generateAlerts(d7, d30) {
  const alerts = [];

  // SLA null — expected for now, informational
  if (d30.avg_response_min == null) {
    alerts.push({ level: 'info', msg: 'SLA: No response time data (no contact events logged yet)' });
  } else if (d30.avg_response_min > 60) {
    alerts.push({ level: 'warning', msg: `SLA: Avg response ${d30.avg_response_min} min — exceeds 60 min target` });
  }

  // Stale leads
  if (d30.stale_leads > 0) {
    alerts.push({ level: 'warning', msg: `${d30.stale_leads} stale lead(s) — new for 24h+ without contact` });
  }

  // Lead drop: 7d vs prev 7d
  if (d7.leads_prev > 0 && d7.leads_total < d7.leads_prev * 0.5) {
    alerts.push({ level: 'critical', msg: `Lead drop: ${d7.leads_total} this week vs ${d7.leads_prev} last week (−${((1 - d7.leads_total / d7.leads_prev) * 100).toFixed(0)}%)` });
  }

  // Test lead contamination
  if (d30.test_leads_pct > 50) {
    alerts.push({ level: 'warning', msg: `Test leads at ${d30.test_leads_pct}% — may indicate bot/spam issue` });
  }

  // Zero revenue 7d
  if (d7.revenue === 0 && d7.leads_total > 0) {
    alerts.push({ level: 'info', msg: 'Zero revenue in 7d despite active leads' });
  }

  // Overdue jobs
  if (d30.overdue_jobs > 0) {
    alerts.push({ level: 'warning', msg: `${d30.overdue_jobs} overdue job(s)` });
  }

  // Unresponded reviews
  if (d30.unresponded_reviews > 0) {
    alerts.push({ level: 'info', msg: `${d30.unresponded_reviews} unresponded review(s)` });
  }

  return alerts;
}

function shouldDeliverReport(kpi) {
  const policy = String(process.env.REPORT_DELIVERY_POLICY || 'signal_only').toLowerCase();
  const force = ['1', 'true', 'yes', 'on'].includes(String(process.env.FORCE_SEND_REPORT || '').toLowerCase());
  const { d7, d30 } = kpi;
  const actionableAlerts = generateAlerts(d7, d30).filter(a => a.level === 'critical' || a.level === 'warning').length;
  const hasSignal =
    Number(d7.leads_total || 0) > 0 ||
    Number(d7.revenue || 0) > 0 ||
    Number(d7.jobs_completed || 0) > 0 ||
    Number(d30.stale_leads || 0) > 0 ||
    actionableAlerts > 0;

  if (force) return { deliver: true, reason: 'forced_by_env' };
  if (policy === 'always') return { deliver: true, reason: 'policy_always' };
  if (!hasSignal) return { deliver: false, reason: 'no_actionable_signal' };
  return { deliver: true, reason: 'signal_detected' };
}

// ── Report Formatting: Telegram ──────────────────────────────

function formatTelegram(kpi) {
  const { d7, d30 } = kpi;
  const alerts = generateAlerts(d7, d30).filter(a => a.level === 'critical' || a.level === 'warning');
  const date = fmtDate();

  const leads7 = d7.leads_total || 0;
  const leads30 = d30.leads_total || 0;
  const rev30 = d30.revenue || 0;
  const jobs = d30.jobs_completed || 0;

  // Nothing happening = one line
  if (leads7 === 0 && leads30 === 0 && rev30 === 0 && jobs === 0 && alerts.length === 0) {
    return `📊 <b>${date}</b> — No leads, no revenue, no jobs.`;
  }

  let msg = `📊 <b>${date}</b>\n`;

  // 7-day summary — only real numbers
  if (leads7 > 0 || d7.revenue > 0) {
    msg += `\n<b>7 days:</b> ${leads7} leads`;
    if (d7.revenue > 0) msg += ` | ${fmtMoney(d7.revenue)}`;
    if (d7.jobs_completed > 0) msg += ` | ${d7.jobs_completed} jobs`;
    msg += '\n';
  }

  // 30-day summary — only real numbers
  if (leads30 > 0 || rev30 > 0) {
    msg += `<b>30 days:</b> ${leads30} leads`;
    if (rev30 > 0) msg += ` | ${fmtMoney(rev30)}`;
    if (jobs > 0) msg += ` | ${jobs} jobs`;
    if (d30.conversion_rate > 0) msg += ` | ${fmtPct(d30.conversion_rate)} conv`;
    msg += '\n';
  }

  // Sources — only if leads exist, only non-zero
  if (d30.leads_by_source) {
    const sources = typeof d30.leads_by_source === 'string' ? JSON.parse(d30.leads_by_source) : d30.leads_by_source;
    const parts = [];
    for (const [src, cnt] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
      if (cnt > 0) parts.push(`${src}: ${cnt}`);
    }
    if (parts.length > 0) {
      msg += `\n<b>Sources:</b> ${parts.join(' | ')}\n`;
    }
  }

  // Critical/warning alerts only
  if (alerts.length > 0) {
    msg += '\n';
    for (const a of alerts) {
      msg += `${a.level === 'critical' ? '🔴' : '🟡'} ${a.msg}\n`;
    }
  }

  return msg;
}

// ── Report Formatting: Email (HTML) ──────────────────────────

function formatEmailHTML(kpi) {
  const { d7, d30, funnel, sla } = kpi;
  const alerts = generateAlerts(d7, d30);
  const date = fmtDate();
  const time = fmtTime();

  const css = `
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1a1a1a; background: #f9fafb; }
    h1 { color: #111827; font-size: 22px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px; }
    h2 { color: #374151; font-size: 16px; margin-top: 24px; }
    .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0 16px; }
    th { background: #f3f4f6; text-align: left; padding: 8px 12px; font-size: 13px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .val { font-weight: 600; }
    .up { color: #059669; }
    .down { color: #dc2626; }
    .null { color: #9ca3af; font-style: italic; }
    .alert { padding: 8px 12px; border-radius: 6px; margin: 4px 0; font-size: 13px; }
    .alert-critical { background: #fef2f2; border-left: 3px solid #dc2626; }
    .alert-warning { background: #fffbeb; border-left: 3px solid #f59e0b; }
    .alert-info { background: #eff6ff; border-left: 3px solid #3b82f6; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 11px; }
  `;

  function metricRow(label, value, prev, fmt = fmtNum) {
    const valStr = fmt(value);
    const isNull = value == null;
    const d = delta(value, prev);
    let deltaHtml = '';
    if (d != null) {
      const cls = d > 0 ? 'up' : d < 0 ? 'down' : '';
      const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→';
      deltaHtml = ` <span class="${cls}">${arrow}${Math.abs(d).toFixed(0)}%</span>`;
    }
    return `<tr><td>${label}</td><td class="${isNull ? 'null' : 'val'}">${valStr}${deltaHtml}</td></tr>`;
  }

  let html = `<!DOCTYPE html><html><head><style>${css}</style></head><body>`;
  html += `<h1>📊 Handy & Friend — Daily Report</h1>`;
  html += `<div class="meta">${date} • ${time} PT</div>`;

  // 7-Day table
  html += `<h2>📅 7-Day Performance</h2><table>`;
  html += `<tr><th>Metric</th><th>Value</th></tr>`;
  html += metricRow('Leads (prod)', d7.leads_total, d7.leads_prev);
  html += metricRow('Conversion Rate', d7.conversion_rate, null, fmtPct);
  html += metricRow('Revenue', d7.revenue, d7.revenue_prev, fmtMoney);
  html += metricRow('Profit', d7.profit, null, fmtMoney);
  html += metricRow('Expenses', d7.expenses_total, null, fmtMoney);
  html += metricRow('Avg Response (SLA)', d7.avg_response_min, null, fmtMin);
  html += metricRow('Jobs Completed', d7.jobs_completed, null);
  html += metricRow('Avg Job Rating', d7.avg_job_rating, null);
  html += `</table>`;

  // 30-Day table
  html += `<h2>📅 30-Day Performance</h2><table>`;
  html += `<tr><th>Metric</th><th>Value</th></tr>`;
  html += metricRow('Leads (prod)', d30.leads_total, d30.leads_prev);
  html += metricRow('Conversion Rate', d30.conversion_rate, null, fmtPct);
  html += metricRow('Revenue', d30.revenue, d30.revenue_prev, fmtMoney);
  html += metricRow('Profit', d30.profit, null, fmtMoney);
  html += metricRow('Expenses', d30.expenses_total, null, fmtMoney);
  html += metricRow('Avg Deal Size', d30.avg_deal_size, null, fmtMoney);
  html += metricRow('Avg Response (SLA)', d30.avg_response_min, null, fmtMin);
  html += metricRow('Pipeline Value', d30.pipeline_value, null, fmtMoney);
  html += metricRow('Jobs Completed', d30.jobs_completed, null);
  html += metricRow('Jobs Revenue', d30.jobs_revenue, null, fmtMoney);
  html += metricRow('Avg Job Rating', d30.avg_job_rating, null);
  html += metricRow('Stale Leads', d30.stale_leads, null);
  html += `</table>`;

  // Lead Sources
  if (d30.leads_by_source) {
    const sources = typeof d30.leads_by_source === 'string' ? JSON.parse(d30.leads_by_source) : d30.leads_by_source;
    html += `<h2>📡 Lead Sources (30d)</h2><table>`;
    html += `<tr><th>Source</th><th>Count</th></tr>`;
    for (const [src, cnt] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
      html += `<tr><td>${src}</td><td class="val">${cnt}</td></tr>`;
    }
    html += `</table>`;
  }

  // Lead Stages
  if (d30.leads_by_stage) {
    const stages = typeof d30.leads_by_stage === 'string' ? JSON.parse(d30.leads_by_stage) : d30.leads_by_stage;
    html += `<h2>📊 Lead Stages (30d)</h2><table>`;
    html += `<tr><th>Stage</th><th>Count</th></tr>`;
    for (const [stage, cnt] of Object.entries(stages).sort((a, b) => b[1] - a[1])) {
      html += `<tr><td>${stage}</td><td class="val">${cnt}</td></tr>`;
    }
    html += `</table>`;
  }

  // Services
  if (d30.leads_by_service) {
    const services = typeof d30.leads_by_service === 'string' ? JSON.parse(d30.leads_by_service) : d30.leads_by_service;
    html += `<h2>🔧 Services (30d)</h2><table>`;
    html += `<tr><th>Service</th><th>Count</th></tr>`;
    for (const [svc, cnt] of Object.entries(services).sort((a, b) => b[1] - a[1])) {
      html += `<tr><td>${svc.replace(/_/g, ' ')}</td><td class="val">${cnt}</td></tr>`;
    }
    html += `</table>`;
  }

  // Funnel
  if (funnel && funnel.length > 0) {
    html += `<h2>🔄 Funnel (all-time, prod)</h2><table>`;
    html += `<tr><th>Stage</th><th>Count</th><th>%</th></tr>`;
    for (const row of funnel) {
      html += `<tr><td>${row.stage}</td><td class="val">${row.cnt}</td><td>${row.pct}%</td></tr>`;
    }
    html += `</table>`;
  }

  // Chat & Reviews
  html += `<h2>💬 Engagement (30d)</h2><table>`;
  html += `<tr><th>Metric</th><th>Value</th></tr>`;
  html += `<tr><td>Chat Sessions</td><td class="val">${fmtNum(d30.chat_sessions)}</td></tr>`;
  html += `<tr><td>Chat Messages</td><td class="val">${fmtNum(d30.chat_messages)}</td></tr>`;
  html += `<tr><td>FB Messenger Sessions</td><td class="val">${fmtNum(d30.fb_sessions)}</td></tr>`;
  html += `<tr><td>Reviews</td><td class="val">${fmtNum(d30.reviews_total)}</td></tr>`;
  html += `<tr><td>Avg Review Rating</td><td class="${d30.reviews_avg_rating == null ? 'null' : 'val'}">${d30.reviews_avg_rating ?? 'No data'}</td></tr>`;
  html += `</table>`;

  // Alerts
  if (alerts.length > 0) {
    html += `<h2>🚨 Alerts</h2>`;
    for (const a of alerts) {
      html += `<div class="alert alert-${a.level}">${a.level === 'critical' ? '🔴' : a.level === 'warning' ? '🟡' : 'ℹ️'} ${a.msg}</div>`;
    }
  }

  // Test leads
  html += `<h2>🧪 Test Leads (30d)</h2><table>`;
  html += `<tr><th>Metric</th><th>Value</th></tr>`;
  html += `<tr><td>Test Leads Count</td><td class="val">${d30.test_leads_total}</td></tr>`;
  html += `<tr><td>Test Leads Share</td><td class="val">${d30.test_leads_pct}%</td></tr>`;
  html += `</table>`;

  // SLA detail (recent leads)
  if (sla && sla.length > 0) {
    const withSLA = sla.filter(r => r.sla_min != null);
    const withoutSLA = sla.filter(r => r.sla_min == null);
    html += `<h2>⏱ SLA Detail (recent 10 leads)</h2><table>`;
    html += `<tr><th>Source</th><th>Count</th></tr>`;
    html += `<tr><td>With SLA data (lead_events)</td><td class="val">${withSLA.length}</td></tr>`;
    html += `<tr><td>Without SLA data</td><td class="val">${withoutSLA.length}</td></tr>`;
    html += `</table>`;
  }

  html += `<div class="footer">`;
  html += `Generated by <b>daily-report.mjs</b> • Data source: dashboard_stats() RPC<br>`;
  html += `All lead metrics filtered by is_test=false • SLA uses lead_events only (migration 023)`;
  html += `</div>`;
  html += `</body></html>`;

  return html;
}

// ── Report Formatting: Archive (Markdown) ────────────────────

function formatArchiveMD(kpi) {
  const { d7, d30, funnel, sla } = kpi;
  const alerts = generateAlerts(d7, d30);
  const date = fmtDate();
  const time = fmtTime();

  let md = `# Daily Report — ${date}\n`;
  md += `Generated: ${time} PT\n\n`;
  md += `---\n\n`;

  md += `## 7-Day Performance\n\n`;
  md += `| Metric | Value | Δ vs prev |\n|--------|-------|----------|\n`;
  md += `| Leads (prod) | ${d7.leads_total} | ${deltaStr(d7.leads_total, d7.leads_prev)} |\n`;
  md += `| Conversion | ${fmtPct(d7.conversion_rate)} | |\n`;
  md += `| Revenue | ${fmtMoney(d7.revenue)} | ${deltaStr(d7.revenue, d7.revenue_prev)} |\n`;
  md += `| Profit | ${fmtMoney(d7.profit)} | |\n`;
  md += `| Expenses | ${fmtMoney(d7.expenses_total)} | |\n`;
  md += `| Avg Response (SLA) | ${fmtMin(d7.avg_response_min)} | |\n`;
  md += `| Jobs Completed | ${d7.jobs_completed} | |\n`;
  md += `| Avg Job Rating | ${d7.avg_job_rating ?? 'No data'} | |\n\n`;

  md += `## 30-Day Performance\n\n`;
  md += `| Metric | Value | Δ vs prev |\n|--------|-------|----------|\n`;
  md += `| Leads (prod) | ${d30.leads_total} | ${deltaStr(d30.leads_total, d30.leads_prev)} |\n`;
  md += `| Conversion | ${fmtPct(d30.conversion_rate)} | |\n`;
  md += `| Revenue | ${fmtMoney(d30.revenue)} | ${deltaStr(d30.revenue, d30.revenue_prev)} |\n`;
  md += `| Profit | ${fmtMoney(d30.profit)} | |\n`;
  md += `| Expenses | ${fmtMoney(d30.expenses_total)} | |\n`;
  md += `| Avg Deal Size | ${fmtMoney(d30.avg_deal_size)} | |\n`;
  md += `| Avg Response (SLA) | ${fmtMin(d30.avg_response_min)} | |\n`;
  md += `| Pipeline | ${fmtMoney(d30.pipeline_value)} | |\n`;
  md += `| Jobs Completed | ${d30.jobs_completed} | |\n`;
  md += `| Jobs Revenue | ${fmtMoney(d30.jobs_revenue)} | |\n`;
  md += `| Avg Job Rating | ${d30.avg_job_rating ?? 'No data'} | |\n`;
  md += `| Stale Leads | ${d30.stale_leads} | |\n\n`;

  // Sources
  if (d30.leads_by_source) {
    const sources = typeof d30.leads_by_source === 'string' ? JSON.parse(d30.leads_by_source) : d30.leads_by_source;
    md += `## Lead Sources (30d)\n\n| Source | Count |\n|--------|-------|\n`;
    for (const [src, cnt] of Object.entries(sources).sort((a, b) => b[1] - a[1])) {
      md += `| ${src} | ${cnt} |\n`;
    }
    md += '\n';
  }

  // Stages
  if (d30.leads_by_stage) {
    const stages = typeof d30.leads_by_stage === 'string' ? JSON.parse(d30.leads_by_stage) : d30.leads_by_stage;
    md += `## Lead Stages (30d)\n\n| Stage | Count |\n|-------|-------|\n`;
    for (const [stage, cnt] of Object.entries(stages).sort((a, b) => b[1] - a[1])) {
      md += `| ${stage} | ${cnt} |\n`;
    }
    md += '\n';
  }

  // Funnel
  if (funnel && funnel.length > 0) {
    md += `## Funnel (all-time, prod)\n\n| Stage | Count | % |\n|-------|-------|---|\n`;
    for (const row of funnel) {
      md += `| ${row.stage} | ${row.cnt} | ${row.pct}% |\n`;
    }
    md += '\n';
  }

  // Chat
  md += `## Engagement (30d)\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Chat Sessions | ${d30.chat_sessions} |\n`;
  md += `| Chat Messages | ${d30.chat_messages} |\n`;
  md += `| FB Sessions | ${d30.fb_sessions} |\n`;
  md += `| Reviews | ${d30.reviews_total} |\n\n`;

  // Alerts
  if (alerts.length > 0) {
    md += `## Alerts\n\n`;
    for (const a of alerts) {
      const icon = a.level === 'critical' ? '🔴' : a.level === 'warning' ? '🟡' : 'ℹ️';
      md += `- ${icon} **${a.level}**: ${a.msg}\n`;
    }
    md += '\n';
  }

  // Test leads
  md += `## Test Leads (30d)\n\n`;
  md += `- Count: ${d30.test_leads_total}\n`;
  md += `- Share: ${d30.test_leads_pct}%\n\n`;

  md += `---\n*Data source: dashboard_stats() RPC • is_test=false • SLA events-only (migration 023)*\n`;

  return md;
}

// ── Delivery: Telegram ───────────────────────────────────────

async function sendTelegram(text, extra = {}) {
  log('info', 'Sending Telegram report...');
  const send = await unifiedTelegramSend({
    source: 'daily_report',
    text,
    token: ENV.TELEGRAM_BOT_TOKEN,
    chatId: ENV.TELEGRAM_CHAT_ID,
    timeoutMs: 8000,
    extra: { category: 'daily_report', actionable: false, ...extra }
  });
  if (!send.ok) {
    throw new Error(`Telegram error: ${send.errorCode} ${send.errorDescription}`);
  }
  log('info', 'Telegram sent', { message_id: send.messageId, telegram_send_id: send.telegramSendId });
  return send.messageId;
}

async function sendTelegramAlert(text) {
  try {
    await unifiedTelegramSend({
      source: 'daily_report',
      text: `⚠️ <b>Daily Report Alert</b>\n\n${text}`,
      token: ENV.TELEGRAM_BOT_TOKEN,
      chatId: ENV.TELEGRAM_CHAT_ID,
      timeoutMs: 8000,
      extra: { category: 'daily_report_alert', actionable: true }
    });
  } catch (e) {
    console.error('CRITICAL: Telegram alert also failed:', e.message);
  }
}

// ── Delivery: Email ──────────────────────────────────────────

async function sendEmail(subject, html) {
  log('info', 'Sending email report...');
  const res = await fetchWithRetry('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: ENV.REPORT_EMAIL_FROM,
      to: [ENV.REPORT_EMAIL_TO],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error: ${res.status} ${text}`);
  }

  const data = await res.json();
  log('info', 'Email sent', { email_id: data.id });
  return data.id;
}

// ── Delivery: Archive ────────────────────────────────────────

function saveArchive(markdown) {
  const dir = join(ROOT, 'ops', 'reports');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, `${fmtDate()}.md`);
  writeFileSync(file, markdown, 'utf-8');
  log('info', 'Archive saved', { file });
  return file;
}

// ── Main Orchestrator ────────────────────────────────────────

async function run(mode = 'full') {
  const startTime = Date.now();
  log('info', `Daily report starting (mode: ${mode})`, { date: fmtDate(), time: fmtTime() });

  // Smoke test — just ping Telegram
  if (mode === 'smoke') {
    validateEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY']);
    const msgId = await sendTelegram(`🔍 <b>Smoke Test</b>\n\nDaily report system is alive.\n${fmtTime()} PT`);
    await sendEmail(
      `[Smoke Test] Daily Report — ${fmtDate()}`,
      `<h1>Smoke Test</h1><p>Daily report system is alive.</p><p>${fmtTime()} PT</p>`
    );
    log('info', 'Smoke test complete', { telegram_msg: msgId });
    return;
  }

  validateEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);

  // 1. Fetch data
  const kpi = await fetchAllKPI();
  const deliveryDecision = shouldDeliverReport(kpi);

  if (mode === 'full' && !deliveryDecision.deliver) {
    log('info', 'Daily report delivery skipped by policy', { reason: deliveryDecision.reason });
    return;
  }

  // 2. Format reports
  const telegramText = formatTelegram(kpi);
  const emailHTML = formatEmailHTML(kpi);
  const archiveMD = formatArchiveMD(kpi);
  log('info', 'Reports formatted', {
    telegram_len: telegramText.length,
    email_len: emailHTML.length,
    archive_len: archiveMD.length,
  });

  if (mode === 'dry-run') {
    console.log('\n=== TELEGRAM PREVIEW ===\n');
    // Strip HTML tags for terminal preview
    console.log(telegramText.replace(/<[^>]+>/g, ''));
    console.log('\n=== ARCHIVE PREVIEW ===\n');
    console.log(archiveMD);
    log('info', 'Dry run complete — no messages sent');
    return;
  }

  validateEnv(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY']);

  const reportDigest = hashText(telegramText);
  const forceSend = ['1', 'true', 'yes', 'on'].includes(String(process.env.FORCE_SEND_REPORT || '').toLowerCase());
  let skipTelegramReason = null;
  if (mode === 'full' && !forceSend) {
    const lastDigest = await getLatestDailyReportDigest();
    if (lastDigest?.digest_hash === reportDigest && lastDigest?.created_at) {
      const ageMs = Date.now() - new Date(lastDigest.created_at).getTime();
      if (Number.isFinite(ageMs) && ageMs < 24 * 60 * 60 * 1000) {
        skipTelegramReason = `dedup_same_digest_${Math.round(ageMs / 60000)}m`;
      }
    }
  }

  // 3. Send Telegram
  let telegramState = 'failed';
  if (skipTelegramReason) {
    log('info', 'Telegram send skipped by digest dedup', { reason: skipTelegramReason, digest: reportDigest });
    telegramState = 'skipped';
  } else {
    try {
      await sendTelegram(telegramText, { digest_hash: reportDigest });
      telegramState = 'sent';
    } catch (err) {
      log('error', 'Telegram send failed', { error: err.message });
    }
  }

  // 4. Send Email
  let emailOk = false;
  try {
    await sendEmail(`📊 Daily Report — ${fmtDate()}`, emailHTML);
    emailOk = true;
  } catch (err) {
    log('error', 'Email send failed', { error: err.message });
    // Fallback: alert via Telegram
    if (telegramState === 'sent') {
      await sendTelegramAlert(`Email delivery failed: ${err.message}\nReport was sent to Telegram only.`);
    }
  }

  // 5. Save archive
  let archivePath = null;
  try {
    archivePath = saveArchive(archiveMD);
  } catch (err) {
    log('error', 'Archive save failed', { error: err.message });
  }

  // 6. If Telegram also failed, try one more alert
  if (telegramState !== 'sent' && !emailOk) {
    log('error', 'CRITICAL: Both Telegram and Email failed');
    await sendTelegramAlert('CRITICAL: Both Telegram and Email delivery failed for daily report.');
  }

  const elapsed = Date.now() - startTime;
  log('info', 'Daily report complete', {
    telegram: telegramState,
    email: emailOk ? 'sent' : 'FAILED',
    archive: archivePath || 'FAILED',
    elapsed_ms: elapsed,
  });
}

// ── CLI Entry ────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.includes('--dry-run') ? 'dry-run'
           : args.includes('--smoke')   ? 'smoke'
           : 'full';

run(mode).catch(err => {
  log('error', 'Fatal error in daily report', { error: err.message, stack: err.stack });
  // Last-resort Telegram alert
  const fatalTgEnabled = ['1', 'true', 'yes', 'on'].includes(String(process.env.REPORT_FATAL_TELEGRAM_ENABLED || '').toLowerCase());
  if (!fatalTgEnabled) {
    process.exit(1);
    return;
  }
  sendTelegramAlert(`FATAL: Daily report crashed.\n<code>${err.message}</code>`).finally(() => {
    process.exit(1);
  });
});
