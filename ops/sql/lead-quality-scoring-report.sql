-- Lead Quality Scoring Report — Handy & Friend
-- Purpose: prioritize leads by likelihood to become booked jobs.
-- Run in Supabase SQL editor or secure server-side ops job.
-- Adjust table/view names if canonical lead view differs.

with base as (
  select
    id,
    coalesce(lead_source, to_jsonb(lead_operational_view)->>'source') as source,
    service_type,
    zip,
    stage,
    coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) as lead_detected_at,
    phone,
    customer_phone,
    booked_at,
    contacted_at,
    source_details,
    round((extract(epoch from (now() - lead_detected_at)) / 60)::numeric, 1) as age_minutes
  from lead_operational_view
  where coalesce(nullif(to_jsonb(lead_operational_view)->>'lead_detected_at','')::timestamptz, created_at) >= now() - interval '30 days'
), scored as (
  select
    *,
    (
      case when coalesce(phone, customer_phone) is not null then 25 else -25 end +
      case when service_type in ('tv_mounting','furniture_assembly','drywall','interior_painting','cabinet_painting','flooring') then 20 else 0 end +
      case when zip is not null then 15 else 0 end +
      case when source in ('google_ads_search','google_lsa') then 10 else 0 end +
      case when coalesce(stage, '') in ('booked','completed') or booked_at is not null then 30 else 0 end +
      case when coalesce(stage, '') in ('contacted') or contacted_at is not null then 15 else 0 end +
      case when coalesce(stage, '') in ('new','New') and age_minutes > 20 then -30 else 0 end
    ) as lead_score
  from base
)
select
  id,
  source,
  service_type,
  zip,
  stage,
  lead_detected_at,
  age_minutes,
  lead_score,
  case
    when lead_score >= 80 then 'P0_hot'
    when lead_score >= 60 then 'P1_qualified'
    when lead_score >= 40 then 'P2_needs_clarification'
    else 'P3_low_or_spam_review'
  end as priority,
  case
    when coalesce(stage, '') in ('new','New') and age_minutes > 20 then 'follow_up_now'
    when coalesce(phone, customer_phone) is null then 'ask_for_contact'
    when service_type is null then 'clarify_service'
    else 'continue_sales_flow'
  end as next_action
from scored
order by lead_score desc, lead_detected_at desc;
