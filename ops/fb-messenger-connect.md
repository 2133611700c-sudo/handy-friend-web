# Facebook Messenger -> Alex (Autonomous Runbook)

## Current backend status
- Webhook endpoint: `https://handyandfriend.com/api/alex-webhook` deployed
- Webhook verification: works with `FB_VERIFY_TOKEN`
- `FB_PAGE_ACCESS_TOKEN`: set in Vercel production
- Alex pipeline: deployed (`alex-webhook` -> `alex-one-truth` -> Supabase)

## Why it still can fail
Meta has **two layers**:
1. App-level webhook subscription (`/{app-id}/subscriptions`, object=`page`)
2. Page subscribed to that app (`/{page-id}/subscribed_apps`)

If either is missing/misaligned (wrong App ID), inbound messages do not reach your webhook.

## One-shot finalizer (fully automatic once secret exists)
Script: `ops/fb-finalize-webhook.mjs`

What it does in one run:
1. Gets app access token from `FB_APP_ID + FB_APP_SECRET`
2. Creates/updates app subscription for `object=page`
3. Subscribes page to app events
4. Verifies callback challenge against production webhook
5. Prints final wiring report and fails fast if mismatch remains

## Required env for one-shot run
- `FB_APP_ID`
- `FB_APP_SECRET`
- `FB_PAGE_ACCESS_TOKEN`

Optional (defaults shown):
- `FB_PAGE_ID=61588215297678`
- `FB_VERIFY_TOKEN=handyfriend_webhook_2026`
- `FB_CALLBACK_URL=https://handyandfriend.com/api/alex-webhook`
- `FB_GRAPH_VERSION=v22.0`

## Command
```bash
cd /Users/sergiikuropiatnyk/handy-friend-landing-v6
FB_APP_ID="<APP_ID>" \
FB_APP_SECRET="<APP_SECRET>" \
FB_PAGE_ACCESS_TOKEN="<PAGE_TOKEN>" \
FB_VERIFY_TOKEN="handyfriend_webhook_2026" \
node ops/fb-finalize-webhook.mjs
```

## Expected success output
- `app_subscription_objects` contains `page`
- `page_subscribed_app_ids` contains your `FB_APP_ID`
- `challenge_http_status` = `200`
- `challenge_body` = `TEST_OK_123`
- final line: `SUCCESS: Messenger webhook is fully wired.`

## Hard security boundary (cannot be bypassed by code)
Meta does not expose `FB_APP_SECRET` publicly. It requires authenticated app-owner access and may require password/2FA re-auth.
Without app secret, app-level subscription cannot be created via Graph API.

## Post-finalization smoke test
1. Send DM to the page: `https://www.facebook.com/people/Handy-Friend/61588215297678/`
2. Check Vercel logs for inbound webhook event
3. Confirm Alex reply appears in Messenger
4. Confirm lead row in Supabase with `source='facebook'`
