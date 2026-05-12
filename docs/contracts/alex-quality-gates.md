# Alex Quality Gates — Handy & Friend

Status: ACTIVE

## Goal

Alex must behave as a lead-intake system, not just an AI chat.

## P0 gates

1. Production health is green.
2. Client response is bounded by provider timeout and fallback.
3. Fallback uses canonical public pricing: `$150 labor only`.
4. No legacy prices: `$185`, `$105`.
5. No banned claims: licensed, bonded, certified, best in LA.
6. Telegram health has no unproved lead backlog.
7. Attribution health maps `gclid` and Google CPC to `google_ads_search`.
8. Outbox queue depth and DLQ stay zero or explicitly explained.

## P1 gates

1. Every Alex response should be traceable by session/correlation fields.
2. Every captured lead should have source attribution.
3. Every owner alert should have durable proof or explicit skip reason.
4. Every stale `new` lead older than 20 minutes should be visible in health/reporting.
5. GA4/Ads/CRM event names should use the canonical event contract.

## Canonical event names

- `phone_click`
- `whatsapp_click`
- `form_submit`
- `sms_lead`
- `lead_created`

## Compatibility debt

Legacy CTA attributes such as `click_whatsapp` may still exist in old HTML. They must not be used as the GA4/Ads source of truth. Canonical emitted event is `whatsapp_click`.

## Manual proof commands

Use these only from a machine with normal DNS/network:

- `npm run test:alex`
- `npm run smoke:alex`
- `npm run validate:ads`
- `npm run audit:prod`

## Stop condition

Do not mark Alex fully verified until raw production POST smoke evidence exists.
