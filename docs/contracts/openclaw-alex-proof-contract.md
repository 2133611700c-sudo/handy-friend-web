# OpenClaw → Alex → CRM → Telegram Proof Contract

Status: ACTIVE

## Goal

Every lead signal from site chat, WhatsApp, Messenger, Facebook, Craigslist, Nextdoor, or OpenClaw monitoring must become a traceable operational event.

## Required proof chain

For every real lead:

1. Source signal exists.
2. Alex or intake route receives it.
3. CRM record or event is written.
4. Attribution/source is assigned.
5. Telegram owner alert is sent or explicitly skipped with reason.
6. Follow-up status is visible.
7. Stale lead SLA is monitored.

## Required fields

Minimum fields for a lead/proof event:

- source
- channel
- service_type
- zip or area when available
- contact method when available
- message summary
- photo count when available
- lead_detected_at
- stage
- telegram proof id or skip reason
- attribution payload if available

## Source rules

- Website chat: `website_chat`
- Website form: `website_form`
- WhatsApp: `whatsapp`
- Facebook/Messenger: `facebook`
- Google Ads Search: `google_ads_search`
- Google Business Profile: `google_business`
- Organic Google: `google_organic`
- OpenClaw monitored group/source: source-specific value plus raw source metadata

## SLA rules

- New paid-source leads should be owner-visible within minutes.
- Any `new` lead older than 20 minutes should be surfaced as stale.
- Any Telegram send failure should be explicit, not silent.
- Any DLQ/outbox item should be counted and visible.

## Alex rules

Alex should:

- ask for photo, ZIP, timing, and scope;
- use `$150 labor only` public service-call language for eligible small jobs;
- avoid licensed/bonded/certified/best claims;
- avoid internal pricing or margin disclosure;
- escalate or quote-only for complex/licensed/high-risk work;
- keep response bounded by timeout/fallback.

## OpenClaw rules

OpenClaw should not be treated as complete unless it provides:

- raw detected source/post/message reference;
- extracted service need;
- confidence or rule hit;
- dedupe key;
- Telegram proof;
- CRM write result or explicit skip reason.

## Verification

Use:

- `/api/health`
- `/api/health?type=telegram`
- `/api/health?type=attribution&hours=720`
- `/api/health?type=outbox`
- `node scripts/ops-health-smoke.mjs`
- `npm run smoke:alex`

No DONE without raw evidence.
