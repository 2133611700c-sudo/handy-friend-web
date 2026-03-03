#!/usr/bin/env node
/**
 * Finalize Facebook Messenger webhook wiring in one run.
 *
 * Required env:
 * - FB_APP_ID
 * - FB_APP_SECRET
 * - FB_PAGE_ACCESS_TOKEN
 *
 * Optional env:
 * - FB_PAGE_ID (default: 61588215297678)
 * - FB_VERIFY_TOKEN (default: handyfriend_webhook_2026)
 * - FB_CALLBACK_URL (default: https://handyandfriend.com/api/alex-webhook)
 * - FB_GRAPH_VERSION (default: v22.0)
 */

const cfg = {
  appId: process.env.FB_APP_ID || '',
  appSecret: process.env.FB_APP_SECRET || '',
  pageToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
  pageId: process.env.FB_PAGE_ID || '61588215297678',
  verifyToken: process.env.FB_VERIFY_TOKEN || 'handyfriend_webhook_2026',
  callbackUrl: process.env.FB_CALLBACK_URL || 'https://handyandfriend.com/api/alex-webhook',
  graphVersion: process.env.FB_GRAPH_VERSION || 'v22.0'
};

const required = ['appId', 'appSecret', 'pageToken'];
const missing = required.filter((k) => !cfg[k]);
if (missing.length) {
  console.error('Missing required env:', missing.join(', '));
  process.exit(1);
}

const base = `https://graph.facebook.com/${cfg.graphVersion}`;

async function graph(path, method = 'GET', params = {}, body = null) {
  const qp = new URLSearchParams(params);
  const url = `${base}${path}${qp.size ? `?${qp}` : ''}`;
  const resp = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    body: body ? new URLSearchParams(body).toString() : undefined
  });

  let json;
  try {
    json = await resp.json();
  } catch {
    const text = await resp.text();
    throw new Error(`${method} ${path} non-JSON response: ${text.slice(0, 300)}`);
  }

  if (!resp.ok || json.error) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(json)}`);
  }

  return json;
}

async function main() {
  console.log('1) Requesting app access token...');
  const appTokenResp = await graph('/oauth/access_token', 'GET', {
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    grant_type: 'client_credentials'
  });
  const appAccessToken = appTokenResp.access_token;
  if (!appAccessToken) throw new Error('No app access token returned');

  console.log('2) Upserting app webhook subscription (object=page)...');
  await graph(`/${cfg.appId}/subscriptions`, 'POST', {}, {
    access_token: appAccessToken,
    object: 'page',
    callback_url: cfg.callbackUrl,
    verify_token: cfg.verifyToken,
    fields: 'messages,messaging_postbacks,message_echoes,messaging_referrals'
  });

  console.log('3) Subscribing page to app events...');
  await graph(`/${cfg.pageId}/subscribed_apps`, 'POST', {}, {
    access_token: cfg.pageToken,
    subscribed_fields: 'messages,messaging_postbacks,message_echoes,messaging_referrals'
  });

  console.log('4) Verifying app subscription config...');
  const appSubs = await graph(`/${cfg.appId}/subscriptions`, 'GET', {
    access_token: appAccessToken
  });

  const pageSubs = await graph(`/${cfg.pageId}/subscribed_apps`, 'GET', {
    access_token: cfg.pageToken
  });

  console.log('5) Verifying webhook challenge endpoint...');
  const challenge = 'TEST_OK_123';
  const check = await fetch(
    `${cfg.callbackUrl}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(cfg.verifyToken)}&hub.challenge=${challenge}`
  );
  const checkText = await check.text();

  const pageAppIds = (pageSubs.data || []).map((x) => x.id);
  const appObjects = (appSubs.data || []).map((x) => x.object);

  console.log('--- RESULT ---');
  console.log(JSON.stringify({
    app_id: cfg.appId,
    page_id: cfg.pageId,
    callback_url: cfg.callbackUrl,
    app_subscription_objects: appObjects,
    page_subscribed_app_ids: pageAppIds,
    challenge_http_status: check.status,
    challenge_body: checkText
  }, null, 2));

  const ok = check.status === 200 && checkText === challenge && appObjects.includes('page') && pageAppIds.includes(cfg.appId);
  if (!ok) {
    throw new Error('Final verification failed: app/page subscription mismatch or challenge mismatch');
  }

  console.log('SUCCESS: Messenger webhook is fully wired.');
}

main().catch((err) => {
  console.error('FAILED:', err.message);
  process.exit(1);
});
