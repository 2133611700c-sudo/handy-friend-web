# Alex Operations Runbook

Status: ACTIVE

## Purpose

Use this runbook when Alex, lead capture, Telegram proof, or Ads/GA4 attribution looks broken.

## Fast triage order

1. Check production deployment is READY in Vercel.
2. Check `/api/health` returns HTTP 200 and `ok=true`.
3. Check Telegram health endpoint.
4. Check attribution health endpoint.
5. Check outbox health endpoint.
6. Run local/runner checks if network/DNS works.

## Local/runner checks

From repo root:

```bash
node scripts/check-event-contract.mjs
npm run test:ads-attribution
npm run test:alex
npm run smoke:alex
```

If local DNS fails, do not call it site downtime. Verify with Vercel fetch/browser.

## Known compatibility debt

Some legacy CTA markup may still contain `click_whatsapp`. Do not use that as the Ads/GA4 conversion event. Canonical emitted event is `whatsapp_click`.

## What counts as production incident

- homepage is not HTTP 200;
- `/api/health` is not HTTP 200;
- Telegram health reports failures or proof gap;
- outbox queue/DLQ is non-zero without explanation;
- `/api/ai-chat` POST fails or exceeds 15 seconds from a normal network.

## What does not automatically count as site outage

- GitHub Validate failed but homepage and health are 200;
- preview deployment failed from a test branch;
- local container DNS cannot resolve public domains.

## Do not touch

- Google Ads billing/payment;
- secrets;
- force-push main;
- new Vercel API routes unless function limit is confirmed.
