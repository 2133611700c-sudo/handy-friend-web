# Stale Lead SLA Contract — Handy & Friend

Status: ACTIVE

## Goal

Prevent paid and organic leads from sitting in `new` without owner action.

## SLA definition

A lead is stale when:

- `stage = 'new'` or status equivalent is `new`;
- `lead_detected_at` or created timestamp is older than 20 minutes;
- no booked/contacted/follow-up proof exists.

## Severity

- P0: paid-source lead stale for more than 20 minutes.
- P1: organic/website lead stale for more than 30 minutes.
- P2: low-confidence/social monitoring lead stale for more than 60 minutes.

## Required fields

Report output must include:

- lead id;
- source;
- channel;
- service type;
- ZIP/area if available;
- stage/status;
- detected timestamp;
- age minutes;
- Telegram proof status;
- next action.

## Suggested SQL shape

Use the actual project view/table name, usually `lead_operational_view`:

```sql
select
  id,
  lead_source,
  source,
  service_type,
  zip,
  stage,
  lead_detected_at,
  extract(epoch from (now() - lead_detected_at)) / 60 as age_minutes,
  booked_at,
  contacted_at
from lead_operational_view
where lead_detected_at >= now() - interval '7 days'
  and coalesce(stage, '') in ('new', 'New')
  and booked_at is null
  and contacted_at is null
  and lead_detected_at < now() - interval '20 minutes'
order by lead_detected_at asc;
```

## Control rule

If stale count > 0, owner Telegram alert should be sent with count and top sample leads.

## Not enough

A lead existing in CRM is not enough. It must be owner-visible and moved out of `new` or intentionally closed/spam/lost.
