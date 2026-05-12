# Security & Release Contract — Handy & Friend

Status: ACTIVE

## Goal

Protect production leads, CRM data, Telegram proof, and release flow.

## Release protection

Target architecture:

1. GitHub push creates Vercel deployment.
2. Production deployment must pass required safety checks before production aliases are promoted.
3. Blocking checks should stay stable and deterministic.
4. Deep network checks should be manual/non-blocking until their logs are reliable.

## Recommended Vercel checks

Use Vercel Deployment Checks for production alias protection when configured in dashboard.

Required blocking candidates:

- Validate Site
- Vercel project guard
- pricing/policy tests
- ads/attribution tests
- secrets guard
- production readiness audit

Manual/non-blocking candidates until stable:

- Alex production POST smoke
- OpenClaw deep scan
- Ads/GA4/CRM reconciliation
- full weekly regression

## Supabase security rules

- Service role key must only run server-side.
- Never expose service role key in browser code, public docs, bundles, URLs, or client logs.
- Public/exposed schema tables must use RLS and least-privilege policies.
- Admin/reporting jobs must use secure server-side context only.

## Production data protection

Lead data may include phone numbers, messages, photos, source metadata, and booking notes.

Do not expose:

- Supabase service role key
- Telegram bot token
- DeepSeek API key
- Facebook page access token
- raw customer PII in public logs

## Incident rule

If a deploy is READY but health is red, treat as production incident.
If GitHub Validate is red but homepage and health are green, treat as CI/release-gate incident.

## Stop conditions

Stop changes and report if:

- Vercel deployment fails;
- health endpoint returns non-200;
- secret exposure is detected;
- RLS/security posture cannot be verified;
- billing/payment changes are required.
