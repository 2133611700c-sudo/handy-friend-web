# Event & Attribution Contract — Handy & Friend

Status: ACTIVE

## Goal

Keep site tracking, GA4, Google Ads, Supabase CRM, and Telegram reporting aligned.

## Canonical frontend events

Use only these public event names for lead-related actions:

| Event | Meaning | Primary use |
|---|---|---|
| `phone_click` | User clicked a website phone/tel CTA | GA4 key event / Ads conversion candidate |
| `whatsapp_click` | User clicked a WhatsApp CTA | GA4 key event / Ads conversion candidate |
| `form_submit` | User submitted a website quote/contact form | GA4 key event / Ads conversion candidate |
| `sms_lead` | User clicked/sent SMS lead action | GA4 event / secondary signal |
| `lead_created` | Backend created a lead or durable lead event | Ads conversion candidate / CRM reconciliation |

## Forbidden stale aliases

Do not use:

- `click_whatsapp` — stale alias; use `whatsapp_click`.
- `phone_call` — stale alias; use `phone_click`.
- `sms_lead_generated` — stale alias; use `sms_lead`.

## CRM source contract

Canonical CRM source/channel values:

- `google_ads_search`
- `google_lsa`
- `google_business`
- `google_organic`
- `facebook`
- `facebook_organic`
- `website_chat`
- `website_form`
- `whatsapp`

## Attribution rules

- Any valid `gclid` maps to `google_ads_search`.
- `utm_source=google` + `utm_medium=cpc` maps to `google_ads_search`, unless campaign clearly indicates LSA.
- Google Business Profile traffic maps to `google_business`.
- Plain Google referrer maps to `google_organic`.
- Missing tracking params default to the form/channel-specific source, usually `website_form`.

## Google Ads conversion rules

Primary conversion candidates:

- `phone_click`
- `whatsapp_click`
- `form_submit`
- `lead_created`

Do not mark soft navigation as primary conversion:

- pricing page view;
- book page view;
- generic page view;
- scroll/click engagement.

## Required checks

The repository test `tests/ads-attribution.test.js` must fail if:

- canonical events disappear from code/docs;
- stale aliases return;
- gclid no longer maps to `google_ads_search`;
- Google LSA/GBP/organic source mapping regresses.

## Operational note

If GA4 or Ads UI cannot find a conversion event, first verify the exact name in this contract before creating a new event or alias.
