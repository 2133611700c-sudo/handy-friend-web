# Telegram Cron Auth Forensic
Date: 2026-04-20 America/Los_Angeles
Auditor: Codex

## Goal
Prove whether protected Telegram-related endpoints trust spoofable `x-vercel-cron` requests from the public internet.

## Live probes before fix

### 1. Hunter endpoint
Request:
```bash
curl -X POST https://handyandfriend.com/api/hunter-lead \
  -H 'Content-Type: application/json' \
  -H 'x-vercel-cron: 1' \
  -d '{"platform":"nextdoor","post_url":"https://example.com/header-probe-1","scope":"GREEN"}'
```

Observed result:
- HTTP 200
- `hunter_posts` row created:
  - `id=c6bbf632-02a6-402d-afc2-4b6be64741ec`
  - `created_at=2026-04-21T02:02:34.766+00:00`
- no `telegram_owner` rows were created between the suppressed and qualified probes

Interpretation:
- external request bypassed auth
- insert path was reachable from public internet with spoofed header

### 2. Process outbox
Request:
```bash
curl -X POST https://handyandfriend.com/api/process-outbox \
  -H 'x-vercel-cron: 1'
```

Observed result:
- HTTP 200
- body: `{\"ok\":true,\"processed\":0,\"sent\":0,...}`

Interpretation:
- protected outbox processor executed from spoofed header alone

### 3. Telegram watchdog
Request:
```bash
curl 'https://handyandfriend.com/api/health?type=telegram_watchdog' \
  -H 'x-vercel-cron: 1'
```

Observed result:
- HTTP 200
- body included:
  - `alert_sent=true`
  - `alert_message_id=4456`
  - `alert_telegram_send_id=18`

Interpretation:
- spoofed header triggered a real Telegram alert

## Official source
Vercel cron docs state that securing cron jobs is done by setting `CRON_SECRET`, which is then sent as an `Authorization` header. Source:
- https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs

Relevant doc statement:
- `CRON_SECRET` is automatically sent as an `Authorization` header
- endpoint should compare the authorization header to the environment value

## Fix direction
- remove `x-vercel-cron` as a sufficient auth condition
- require secret match via `Authorization: Bearer <CRON_SECRET>` or endpoint-specific secret
- fail closed when secret is missing

## Files changed by fix
- `api/process-outbox.js`
- `api/health.js`
- `api/hunter-lead.js`

## Residual blocker
- Vercel env access is not available from current CLI session:
  - `Error: No existing credentials found. Please run vercel login or pass "--token"`
- if any production endpoint lacks the required secret env, it will fail closed until env is aligned in Vercel dashboard
