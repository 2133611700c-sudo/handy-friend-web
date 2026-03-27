/**
 * Hunter Lead API — 4th input channel
 * POST /api/hunter-lead
 *
 * Called by OpenClaw skills (nextdoor-hunter, facebook-hunter) when they
 * respond to a post. Records the hunter_post and fires Telegram alert.
 *
 * NOTE: Hunter posts do NOT immediately create leads in the leads table.
 * A lead is created only when the person actually contacts us through
 * channels 1-3 (website, FB Messenger, Telegram). At that point,
 * createOrMergeLead auto-deduplicates and can be linked retroactively
 * to the hunter_post via name+area matching.
 *
 * Required body fields:
 *   platform, post_url, author_name, author_area, post_text,
 *   service_detected, scope, our_response, template_used
 *
 * Optional:
 *   scan_id, priority, comments_count
 */

'use strict';

const { formatHunterAlert } = require('../lib/alert-formats.js');

// ─── Supabase REST helpers ────────────────────────────────────────────────────

function getConfig() {
  const projectUrl     = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!projectUrl || !serviceRoleKey) return null;
  return { projectUrl, serviceRoleKey };
}

function buildHeaders(config, extra = {}) {
  return {
    apikey:        config.serviceRoleKey,
    Authorization: `Bearer ${config.serviceRoleKey}`,
    ...extra
  };
}

async function sbGet(config, table, params) {
  const q = new URLSearchParams(params).toString();
  const resp = await fetch(`${config.projectUrl}/rest/v1/${table}${q ? '?' + q : ''}`, {
    headers: buildHeaders(config, { Accept: 'application/json' })
  });
  if (!resp.ok) return [];
  return resp.json().catch(() => []);
}

async function sbInsert(config, table, body) {
  const resp = await fetch(`${config.projectUrl}/rest/v1/${table}`, {
    method:  'POST',
    headers: buildHeaders(config, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body:    JSON.stringify(body)
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`POST ${table} ${resp.status}: ${text.slice(0, 200)}`);
  }
  const rows = await resp.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] : rows;
}

async function sbInsertOutboundJob(config, payload) {
  await sbInsert(config, 'outbound_jobs', {
    id:            `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    job_type:      'telegram_owner',
    payload,
    status:        'queued',
    attempt_count: 0,
    max_attempts:  3,
    scheduled_at:  new Date().toISOString(),
    created_at:    new Date().toISOString()
  });
}

// ─── Priority calculator ──────────────────────────────────────────────────────

function calculatePriority(postText, area) {
  const text = String(postText || '').toLowerCase();
  if (/today|asap|urgent|emergency|right now|immediately/i.test(text)) return 'hot';
  if (/this week|soon|looking for|need help|estimate/i.test(text)) return 'warm';
  return 'cool';
}

// ─── Handler ─────────────────────────────────────────────────────────────────

const HUNTER_SECRET = process.env.HUNTER_API_SECRET || process.env.CRON_SECRET || '';

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Auth: require secret header or Vercel cron header
  const secret = req.headers['x-hunter-secret'] || req.headers['x-cron-secret']
    || String(req.headers['authorization'] || '').replace('Bearer ', '');
  const isVercelCron = Boolean(req.headers['x-vercel-cron']);
  if (!isVercelCron) {
    if (!HUNTER_SECRET || secret !== HUNTER_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  const config = getConfig();
  if (!config) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const {
    platform,
    post_url,
    author_name,
    author_area,
    post_text,
    service_detected,
    scope,
    our_response,
    template_used,
    scan_id        = null,
    priority       = null,
    comments_count = 0
  } = req.body || {};

  // Validate required fields
  if (!platform || !post_url || !scope) {
    return res.status(400).json({ error: 'platform, post_url, scope are required' });
  }

  // Dedup by post_url (each post responded to only once)
  const existing = await sbGet(config, 'hunter_posts', {
    select:   'id,status',
    post_url: `eq.${post_url}`,
    limit:    '1'
  }).catch(() => []);

  if (existing.length > 0) {
    return res.status(200).json({
      status:  'skip',
      reason:  'already_responded',
      post_id: existing[0].id
    });
  }

  // Calculate priority if not provided
  const finalPriority = priority || calculatePriority(post_text, author_area);

  // Save hunter post
  let post;
  try {
    post = await sbInsert(config, 'hunter_posts', {
      scan_id,
      platform,
      post_url,
      author_name,
      author_area,
      post_text,
      service_detected,
      scope,
      priority:          finalPriority,
      comments_count:    Number(comments_count) || 0,
      our_response,
      response_template: Number(template_used) || null,
      responded_at:      new Date().toISOString(),
      status:            'responded',
      created_at:        new Date().toISOString()
    });
  } catch (err) {
    console.error('[HUNTER_LEAD] Insert error:', err.message);
    return res.status(500).json({ error: err.message });
  }

  // Enqueue Telegram owner alert via outbox
  try {
    const alertText = formatHunterAlert({
      ...post,
      author_name:       author_name,
      author_area:       author_area,
      service_detected:  service_detected,
      platform,
      post_text,
      post_url,
      priority:          finalPriority,
      response_template: template_used
    });

    await sbInsertOutboundJob(config, { text: alertText, lead_id: null });
  } catch (err) {
    // Non-fatal: post saved, alert failed
    console.warn('[HUNTER_LEAD] Alert enqueue failed:', err.message);
  }

  console.log(`[HUNTER_LEAD] Saved ${platform} post ${post?.id} — priority: ${finalPriority}`);

  return res.status(200).json({
    status:  'ok',
    post_id: post?.id || null,
    priority: finalPriority
  });
}

module.exports = handler;
