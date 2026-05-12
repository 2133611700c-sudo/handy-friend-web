-- Follow-up Recovery Report — Handy & Friend
-- Purpose: identify leads that need owner action or CRM stage recovery.
-- Run in Supabase SQL editor or secure server-side ops job.

select
  id,
  coalesce(lead_source, source) as source,
  service_type,
  zip,
  stage,
  lead_detected_at,
  contacted_at,
  booked_at,
  round((extract(epoch from (now() - lead_detected_at)) / 60)::numeric, 1) as age_minutes,
  case
    when booked_at is not null or stage = 'booked' then 'no_action_booked'
    when contacted_at is not null or stage = 'contacted' then 'follow_up_if_no_reply'
    when coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes' then 'contact_now_sla_breach'
    when coalesce(stage, '') in ('new','New') then 'contact_now'
    else 'review_stage'
  end as next_action
from lead_operational_view
where lead_detected_at >= now() - interval '14 days'
  and (
    coalesce(stage, '') in ('new','New','contacted')
    or contacted_at is null
  )
order by
  case
    when coalesce(stage, '') in ('new','New') and lead_detected_at < now() - interval '20 minutes' then 0
    when coalesce(stage, '') in ('new','New') then 1
    when contacted_at is not null or stage = 'contacted' then 2
    else 3
  end,
  lead_detected_at asc;

-- Control:
-- No qualified paid-source lead should stay in contact_now_sla_breach without Telegram escalation.
