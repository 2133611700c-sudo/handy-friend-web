# Ads → GA4 → CRM → Telegram Reconciliation Template

Status: ACTIVE TEMPLATE

## Goal

Explain where paid clicks become leads, where they fail, and which source produces booked work.

## Period

- Start:
- End:
- Timezone: America/Los_Angeles

## Required source data

### Google Ads

- spend
- impressions
- clicks
- search terms
- conversions by action
- conversion action status
- payment/account warnings

### GA4

- key events:
  - `phone_click`
  - `whatsapp_click`
  - `form_submit`
  - `lead_created`
- event count by page/path
- source/medium/campaign

### Supabase CRM

Query source:

```sql
select source, count(*) as leads, count(booked_at) as booked
from lead_operational_view
where lead_detected_at >= now() - interval '30 days'
group by source
order by leads desc;
```

Also check stale leads:

```sql
-- see ops/sql/stale-leads-sla.sql
```

### Telegram proof

- sent alerts count
- failures count
- leads without Telegram proof
- stale lead alerts

## Reconciliation table

| Source | Ads clicks | Ads conversions | GA4 key events | CRM leads | Telegram proofs | Booked | Notes |
|---|---:|---:|---:|---:|---:|---:|---|
| google_ads_search | | | | | | | |
| google_lsa | | | | | | | |
| google_business | | | | | | | |
| google_organic | | | | | | | |
| website_form | | | | | | | |
| website_chat | | | | | | | |
| whatsapp | | | | | | | |
| facebook | | | | | | | |

## Expected interpretation

- Ads clicks > GA4 events: CTA/tracking/page issue.
- GA4 events > CRM leads: submit/intake/API issue.
- CRM leads > Telegram proofs: owner visibility issue.
- Telegram proofs > booked 0: follow-up/sales/SLA issue.
- CRM `new` backlog: operational follow-up failure.

## Decision rules

1. Do not increase Ads spend while Ads conversions are zero and CRM/Telegram proof is incomplete.
2. Do not optimize campaigns without source-level booked outcomes.
3. Do not mark a source as working until booked jobs or qualified follow-up evidence exists.
4. Treat paid stale leads as P0.

## Official-source notes

- GA4 key events can be used to create Google Ads conversions after linking GA4 and Ads and enabling auto-tagging.
- Vercel Deployment Checks can prevent production alias promotion until selected checks pass.
- Supabase service role keys bypass RLS and must not be exposed client-side.
