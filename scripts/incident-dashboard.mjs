#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportsDir = path.join(root, 'ops', 'reports');
const incidentsDir = path.join(root, 'ops', 'incidents');

function listMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => path.join(dir, f));
}

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) return null;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return null;
  const raw = content.slice(4, end).trim();
  const data = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    data[k] = v.replace(/^"|"$/g, '');
  }
  return data;
}

function toDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function minutesBetween(a, b) {
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function todayPT() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

const files = [
  ...listMarkdown(incidentsDir),
  ...listMarkdown(reportsDir).filter((f) => /incident/i.test(path.basename(f))),
];

const incidents = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm || !fm.id) continue;
  if (!/^INC-\d{8}-\d{2}$/.test(String(fm.id).trim())) continue;
  const started = toDate(fm.started_at || '');
  const resolved = toDate(fm.resolved_at || '');
  const mttr = minutesBetween(started, resolved);
  incidents.push({
    id: fm.id,
    severity: fm.severity || 'unknown',
    status: fm.status || 'unknown',
    owner: fm.owner || 'unknown',
    started_at: fm.started_at || '',
    resolved_at: fm.resolved_at || '',
    mttr_min: mttr,
    file: path.relative(root, file),
  });
}

incidents.sort((a, b) => String(a.started_at).localeCompare(String(b.started_at)));

const bySeverity = {};
const byStatus = {};
let mttrCount = 0;
let mttrSum = 0;
for (const i of incidents) {
  bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
  byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  if (typeof i.mttr_min === 'number' && i.mttr_min >= 0) {
    mttrCount += 1;
    mttrSum += i.mttr_min;
  }
}

const avgMttr = mttrCount ? Math.round(mttrSum / mttrCount) : null;

if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const date = todayPT();
const dashboardPath = path.join(reportsDir, `incident-dashboard-${date}.md`);
const mttrCsvPath = path.join(reportsDir, `incident-mttr-${date}.csv`);

let md = '';
md += `# Incident Dashboard — ${date}\n\n`;
md += `- Total incidents tracked: **${incidents.length}**\n`;
md += `- Resolved incidents with MTTR: **${mttrCount}**\n`;
md += `- Average MTTR: **${avgMttr == null ? 'N/A' : avgMttr + ' min'}**\n\n`;
md += `## By Severity\n`;
if (Object.keys(bySeverity).length === 0) md += `- none\n`;
for (const [k, v] of Object.entries(bySeverity).sort()) md += `- ${k}: ${v}\n`;
md += `\n## By Status\n`;
if (Object.keys(byStatus).length === 0) md += `- none\n`;
for (const [k, v] of Object.entries(byStatus).sort()) md += `- ${k}: ${v}\n`;
md += `\n## Incident List\n`;
if (incidents.length === 0) {
  md += `- none\n`;
} else {
  for (const i of incidents) {
    md += `- ${i.id} | ${i.severity} | ${i.status} | mttr=${i.mttr_min ?? 'N/A'} min | ${i.file}\n`;
  }
}

const csv = [
  'id,severity,status,owner,started_at,resolved_at,mttr_min,file',
  ...incidents.map((i) => [
    i.id,
    i.severity,
    i.status,
    i.owner,
    i.started_at,
    i.resolved_at,
    i.mttr_min ?? '',
    i.file,
  ].map((x) => `"${String(x).replaceAll('"', '""')}"`).join(',')),
].join('\n');

fs.writeFileSync(dashboardPath, md, 'utf8');
fs.writeFileSync(mttrCsvPath, csv, 'utf8');

console.log(`Incident dashboard written: ${dashboardPath}`);
console.log(`MTTR CSV written: ${mttrCsvPath}`);
