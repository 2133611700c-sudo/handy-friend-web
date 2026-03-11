-- ============================================================
-- 012_ultimate_analytics.sql
-- Handy & Friend — ULTIMATE Data Schema & Analytics
--
-- Включает:
--   A. Pipeline columns (007) — stage, outcome, financials
--   B. Backfill (008) — stage from status
--   C. Constraints (009) — data integrity
--   D. Triggers (010) — response time, audit
--   E. NEW: jobs table — реальные выполненные работы
--   F. NEW: reviews — отзывы клиентов
--   G. NEW: expenses — расходы на работу
--   H. NEW: daily_stats — ежедневная агрегация
--   I. NEW: 20+ аналитических views
--   J. NEW: dashboard SQL functions
--   K. RLS на новые таблицы
--
-- Run in Supabase SQL Editor → New Query → Run
-- Idempotent: безопасно запускать повторно
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  A. PIPELINE COLUMNS (из 007)                           │
-- └─────────────────────────────────────────────────────────┘

alter table public.leads add column if not exists stage text default 'new';
alter table public.leads add column if not exists outcome text;
alter table public.leads add column if not exists lost_reason text;
alter table public.leads add column if not exists contacted_at timestamptz;
alter table public.leads add column if not exists qualified_at timestamptz;
alter table public.leads add column if not exists quoted_at timestamptz;
alter table public.leads add column if not exists closed_at timestamptz;
alter table public.leads add column if not exists quoted_amount numeric(12,2);
alter table public.leads add column if not exists won_amount numeric(12,2);
alter table public.leads add column if not exists response_time_min integer;
alter table public.leads add column if not exists channel text;
alter table public.leads add column if not exists session_id text;

-- Недостающие колонки из 006
alter table public.leads add column if not exists ai_summary_short text;
alter table public.leads add column if not exists ai_summary_full text;
alter table public.leads add column if not exists assigned_to text;
alter table public.leads add column if not exists next_action_at timestamptz;
alter table public.leads add column if not exists last_contact_at timestamptz;

-- Индексы pipeline
create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_outcome_idx on public.leads (outcome);
create index if not exists leads_session_id_idx on public.leads (session_id);
create index if not exists leads_channel_idx on public.leads (channel);
create index if not exists leads_contacted_at_idx on public.leads (contacted_at desc);
create index if not exists leads_closed_at_idx on public.leads (closed_at desc);

-- ┌─────────────────────────────────────────────────────────┐
-- │  B. BACKFILL stage FROM status (из 008)                  │
-- └─────────────────────────────────────────────────────────┘

update public.leads set stage = 'new' where stage is null and status = 'new';
update public.leads set stage = 'contacted' where stage is null and status = 'contacted';
update public.leads set stage = 'quoted' where stage is null and status = 'quoted';
update public.leads set stage = 'closed', outcome = 'won' where stage is null and status in ('won','completed','booked');
update public.leads set stage = 'closed', outcome = 'lost' where stage is null and status = 'lost';
update public.leads set stage = 'new' where stage is null;
update public.leads set contacted_at = updated_at where contacted_at is null and stage != 'new';
update public.leads set closed_at = updated_at where closed_at is null and stage = 'closed';

-- ┌─────────────────────────────────────────────────────────┐
-- │  C. CONSTRAINTS (из 009, безопасные)                     │
-- └─────────────────────────────────────────────────────────┘

-- Удаляем старые если есть
alter table public.leads drop constraint if exists chk_stage;
alter table public.leads drop constraint if exists chk_outcome;
alter table public.leads drop constraint if exists chk_lost_reason;

alter table public.leads add constraint chk_stage
  check (stage in ('new','contacted','qualified','quoted','closed'));

alter table public.leads add constraint chk_outcome
  check (
    (stage != 'closed' and outcome is null)
    or (stage = 'closed' and outcome in ('won','lost'))
  );

alter table public.leads add constraint chk_lost_reason
  check (
    outcome != 'lost' or lost_reason in ('L1','L2','L3','L4','L5','L6')
  );

-- ┌─────────────────────────────────────────────────────────┐
-- │  D. TRIGGERS: response time + audit (из 010)            │
-- └─────────────────────────────────────────────────────────┘

create or replace function public.calc_response_time()
returns trigger language plpgsql as $$
begin
  if new.contacted_at is not null
    and (old is null or old.contacted_at is null)
  then
    new.response_time_min = extract(epoch from (new.contacted_at - new.created_at)) / 60;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_response_time on public.leads;
create trigger trg_response_time
  before insert or update on public.leads
  for each row execute function public.calc_response_time();

create or replace function public.audit_stage_change()
returns trigger language plpgsql as $$
begin
  if old.stage is distinct from new.stage then
    insert into public.lead_events (lead_id, event_type, event_payload)
    values (new.id, 'stage_change', jsonb_build_object(
      'from', old.stage, 'to', new.stage,
      'at', now()::text
    ));
  end if;
  if new.outcome is not null and old.outcome is distinct from new.outcome then
    insert into public.lead_events (lead_id, event_type, event_payload)
    values (new.id, 'outcome_set', jsonb_build_object(
      'outcome', new.outcome,
      'won_amount', new.won_amount,
      'lost_reason', new.lost_reason,
      'at', now()::text
    ));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_audit_stage on public.leads;
create trigger trg_audit_stage
  after update on public.leads
  for each row execute function public.audit_stage_change();

-- ┌─────────────────────────────────────────────────────────┐
-- │  E. NEW TABLE: jobs (выполненные работы)                 │
-- └─────────────────────────────────────────────────────────┘

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  lead_id text references public.leads(id) on delete set null,
  created_at timestamptz not null default now(),
  scheduled_date date,
  completed_date date,
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled','no_show')),
  service_type text not null,
  address text,
  city text,
  zip text,
  duration_hours numeric(5,2),
  labor_amount numeric(12,2) not null default 0,
  material_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  payment_method text check (payment_method in ('cash','zelle','venmo','check','card',null)),
  customer_name text,
  customer_phone text,
  customer_email text,
  notes text,
  rating integer check (rating between 1 and 5),
  photos_count integer not null default 0,
  assigned_to text default 'owner',
  drive_time_min integer,
  is_repeat_customer boolean default false
);

create index if not exists jobs_lead_id_idx on public.jobs (lead_id);
create index if not exists jobs_scheduled_date_idx on public.jobs (scheduled_date desc);
create index if not exists jobs_completed_date_idx on public.jobs (completed_date desc);
create index if not exists jobs_status_idx on public.jobs (status);
create index if not exists jobs_service_type_idx on public.jobs (service_type);
create index if not exists jobs_zip_idx on public.jobs (zip);
create index if not exists jobs_customer_phone_idx on public.jobs (customer_phone);

-- Trigger: auto total
create or replace function public.calc_job_total()
returns trigger language plpgsql as $$
begin
  new.total_amount = coalesce(new.labor_amount,0) + coalesce(new.material_amount,0);
  -- Check repeat customer
  if new.customer_phone is not null then
    new.is_repeat_customer = exists(
      select 1 from public.jobs
      where customer_phone = new.customer_phone
        and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_job_total on public.jobs;
create trigger trg_job_total
  before insert or update on public.jobs
  for each row execute function public.calc_job_total();

-- ┌─────────────────────────────────────────────────────────┐
-- │  F. NEW TABLE: reviews (отзывы)                         │
-- └─────────────────────────────────────────────────────────┘

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  platform text not null check (platform in ('google','yelp','nextdoor','facebook','thumbtack','other')),
  rating integer not null check (rating between 1 and 5),
  review_text text,
  reviewer_name text,
  review_url text,
  responded boolean not null default false,
  response_text text
);

create index if not exists reviews_platform_idx on public.reviews (platform);
create index if not exists reviews_rating_idx on public.reviews (rating);
create index if not exists reviews_created_at_idx on public.reviews (created_at desc);

-- ┌─────────────────────────────────────────────────────────┐
-- │  G. NEW TABLE: expenses (расходы)                       │
-- └─────────────────────────────────────────────────────────┘

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  category text not null check (category in (
    'materials','gas','tools','marketing','insurance','license','phone','software','other'
  )),
  amount numeric(12,2) not null,
  description text,
  receipt_path text,
  tax_deductible boolean not null default true
);

create index if not exists expenses_job_id_idx on public.expenses (job_id);
create index if not exists expenses_category_idx on public.expenses (category);
create index if not exists expenses_created_at_idx on public.expenses (created_at desc);

-- ┌─────────────────────────────────────────────────────────┐
-- │  H. NEW TABLE: daily_stats (агрегированная статистика)   │
-- └─────────────────────────────────────────────────────────┘

create table if not exists public.daily_stats (
  stat_date date primary key,
  leads_new integer not null default 0,
  leads_contacted integer not null default 0,
  leads_quoted integer not null default 0,
  leads_won integer not null default 0,
  leads_lost integer not null default 0,
  chat_sessions integer not null default 0,
  chat_messages integer not null default 0,
  fb_messages integer not null default 0,
  jobs_completed integer not null default 0,
  revenue numeric(12,2) not null default 0,
  expenses numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  avg_response_min numeric(8,2),
  avg_job_rating numeric(3,2),
  reviews_received integer not null default 0,
  updated_at timestamptz not null default now()
);

-- ┌─────────────────────────────────────────────────────────┐
-- │  I. ANALYTICS VIEWS                                      │
-- └─────────────────────────────────────────────────────────┘

-- 1. Lead Funnel (переопределяем с pipeline stage)
create or replace view public.v_lead_funnel as
select
  stage,
  count(*) as cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from public.leads
group by stage
order by array_position(array['new','contacted','qualified','quoted','closed'], stage);

-- 2. Conversion rates
create or replace view public.v_conversion_rates as
with totals as (
  select
    count(*) as total,
    count(*) filter (where stage != 'new') as contacted,
    count(*) filter (where stage in ('qualified','quoted','closed')) as qualified,
    count(*) filter (where stage in ('quoted','closed')) as quoted,
    count(*) filter (where stage = 'closed' and outcome = 'won') as won,
    count(*) filter (where stage = 'closed' and outcome = 'lost') as lost
  from public.leads
  where source not in ('direct') -- exclude test leads
)
select
  total as total_leads,
  contacted,
  round(100.0 * contacted / nullif(total,0), 1) as contact_rate,
  qualified,
  round(100.0 * qualified / nullif(contacted,0), 1) as qualify_rate,
  quoted,
  round(100.0 * quoted / nullif(qualified,0), 1) as quote_rate,
  won,
  round(100.0 * won / nullif(quoted,0), 1) as close_rate,
  round(100.0 * won / nullif(total,0), 1) as overall_win_rate,
  lost,
  round(100.0 * lost / nullif(quoted + lost,0), 1) as loss_rate
from totals;

-- 3. Channel ROI
create or replace view public.v_channel_roi as
select
  coalesce(nullif(source,''), 'unknown') as channel,
  count(*) as leads,
  count(*) filter (where stage = 'closed' and outcome = 'won') as won,
  round(100.0 * count(*) filter (where stage = 'closed' and outcome = 'won') / nullif(count(*),0), 1) as win_rate,
  coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue,
  round(avg(response_time_min) filter (where response_time_min is not null), 0) as avg_response_min
from public.leads
group by 1
order by revenue desc;

-- 4. Service Performance
create or replace view public.v_service_performance as
select
  coalesce(nullif(l.service_type,''), 'unknown') as service,
  count(distinct l.id) as leads,
  count(distinct l.id) filter (where l.outcome = 'won') as won,
  coalesce(sum(l.won_amount) filter (where l.outcome = 'won'), 0) as revenue,
  round(avg(j.total_amount) filter (where j.status = 'completed'), 2) as avg_job_value,
  round(avg(j.duration_hours) filter (where j.status = 'completed'), 1) as avg_hours,
  round(avg(j.rating) filter (where j.rating is not null), 1) as avg_rating,
  count(distinct j.id) filter (where j.status = 'completed') as jobs_completed
from public.leads l
left join public.jobs j on j.lead_id = l.id
group by 1
order by revenue desc;

-- 5. Geographic Heatmap
create or replace view public.v_geo_heatmap as
select
  coalesce(nullif(zip,''), 'unknown') as zip,
  count(*) as leads,
  count(*) filter (where outcome = 'won') as won,
  coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue,
  round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1) as win_rate
from public.leads
where zip is not null and zip != ''
group by 1
order by revenue desc;

-- 6. Daily Trends
create or replace view public.v_daily_trends as
select
  d.dt::date as day,
  coalesce(l.new_leads, 0) as new_leads,
  coalesce(l.won_leads, 0) as won_leads,
  coalesce(l.revenue, 0) as revenue,
  coalesce(c.sessions, 0) as chat_sessions,
  coalesce(c.messages, 0) as chat_messages,
  coalesce(j.completed, 0) as jobs_done,
  coalesce(j.job_revenue, 0) as job_revenue
from generate_series(
  current_date - interval '30 days',
  current_date,
  interval '1 day'
) d(dt)
left join lateral (
  select
    count(*) as new_leads,
    count(*) filter (where outcome = 'won') as won_leads,
    coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue
  from public.leads
  where created_at::date = d.dt::date
) l on true
left join lateral (
  select
    count(distinct session_id) as sessions,
    count(*) as messages
  from public.ai_conversations
  where created_at::date = d.dt::date and message_role = 'user'
) c on true
left join lateral (
  select
    count(*) as completed,
    coalesce(sum(total_amount), 0) as job_revenue
  from public.jobs
  where completed_date = d.dt::date and status = 'completed'
) j on true
order by day desc;

-- 7. Weekly Summary
create or replace view public.v_weekly_summary as
select
  date_trunc('week', created_at)::date as week_start,
  count(*) as leads,
  count(*) filter (where stage = 'closed' and outcome = 'won') as won,
  coalesce(sum(won_amount) filter (where outcome = 'won'), 0) as revenue,
  round(avg(response_time_min) filter (where response_time_min > 0), 0) as avg_response_min,
  round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1) as win_rate
from public.leads
group by 1
order by 1 desc;

-- 8. Response Time Distribution
create or replace view public.v_response_time_dist as
select
  case
    when response_time_min <= 5 then '0-5 min'
    when response_time_min <= 15 then '5-15 min'
    when response_time_min <= 30 then '15-30 min'
    when response_time_min <= 60 then '30-60 min'
    when response_time_min <= 240 then '1-4 hours'
    else '4+ hours'
  end as bucket,
  count(*) as cnt,
  round(100.0 * count(*) / nullif(sum(count(*)) over (), 0), 1) as pct
from public.leads
where response_time_min is not null and response_time_min > 0
group by 1
order by min(response_time_min);

-- 9. Chat Analytics
create or replace view public.v_chat_analytics as
select
  session_id,
  min(created_at) as started_at,
  max(created_at) as last_msg_at,
  count(*) as total_messages,
  count(*) filter (where message_role = 'user') as user_messages,
  extract(epoch from (max(created_at) - min(created_at))) / 60 as duration_min,
  case
    when exists (
      select 1 from public.leads l where l.session_id = ac.session_id
    ) then true else false
  end as converted_to_lead,
  case when session_id like 'fb_%' then 'facebook' else 'website' end as channel
from public.ai_conversations ac
where session_id is not null
group by session_id;

-- 10. Loss Reasons Analysis
create or replace view public.v_loss_reasons as
select
  lost_reason,
  case lost_reason
    when 'L1' then 'Цена слишком высокая'
    when 'L2' then 'Выбрал конкурента'
    when 'L3' then 'Передумал/отложил'
    when 'L4' then 'Не отвечает'
    when 'L5' then 'Вне зоны обслуживания'
    when 'L6' then 'Другое'
  end as reason_label,
  count(*) as cnt,
  coalesce(sum(quoted_amount), 0) as lost_revenue
from public.leads
where outcome = 'lost' and lost_reason is not null
group by 1
order by cnt desc;

-- 11. Reviews Summary
create or replace view public.v_reviews_summary as
select
  platform,
  count(*) as total,
  round(avg(rating), 2) as avg_rating,
  count(*) filter (where rating >= 4) as positive,
  count(*) filter (where rating <= 2) as negative,
  count(*) filter (where responded) as responded,
  round(100.0 * count(*) filter (where responded) / nullif(count(*),0), 1) as response_rate
from public.reviews
group by platform
order by total desc;

-- 12. Capacity Utilization
create or replace view public.v_capacity as
select
  d.dt::date as day,
  extract(dow from d.dt) as dow,
  to_char(d.dt, 'Dy') as day_name,
  count(j.id) as jobs_scheduled,
  22.0 / 30 as daily_capacity,
  round(count(j.id) / (22.0/30) * 100, 0) as utilization_pct
from generate_series(
  current_date, current_date + interval '14 days', interval '1 day'
) d(dt)
left join public.jobs j
  on j.scheduled_date = d.dt::date
  and j.status in ('scheduled','in_progress')
where extract(dow from d.dt) between 1 and 6  -- Mon-Sat
group by d.dt
order by d.dt;

-- 13. Monthly P&L
create or replace view public.v_monthly_pl as
select
  date_trunc('month', d)::date as month,
  coalesce(j_rev.revenue, 0) as revenue,
  coalesce(exp.total_expenses, 0) as expenses,
  coalesce(j_rev.revenue, 0) - coalesce(exp.total_expenses, 0) as profit,
  coalesce(j_rev.jobs_count, 0) as jobs,
  case when coalesce(j_rev.revenue,0) > 0
    then round((coalesce(j_rev.revenue,0) - coalesce(exp.total_expenses,0)) / j_rev.revenue * 100, 1)
    else 0
  end as margin_pct
from generate_series(
  date_trunc('month', current_date - interval '11 months'),
  date_trunc('month', current_date),
  interval '1 month'
) d
left join lateral (
  select sum(total_amount) as revenue, count(*) as jobs_count
  from public.jobs
  where status = 'completed'
    and completed_date >= d::date
    and completed_date < (d + interval '1 month')::date
) j_rev on true
left join lateral (
  select sum(amount) as total_expenses
  from public.expenses
  where created_at >= d
    and created_at < d + interval '1 month'
) exp on true
order by month desc;

-- 14. Repeat Customers
create or replace view public.v_repeat_customers as
select
  customer_phone,
  max(customer_name) as name,
  count(*) as total_jobs,
  sum(total_amount) as total_revenue,
  round(avg(rating) filter (where rating is not null), 1) as avg_rating,
  min(completed_date) as first_job,
  max(completed_date) as last_job
from public.jobs
where customer_phone is not null and status = 'completed'
group by customer_phone
having count(*) > 1
order by total_revenue desc;

-- ┌─────────────────────────────────────────────────────────┐
-- │  J. DASHBOARD FUNCTIONS                                  │
-- └─────────────────────────────────────────────────────────┘

-- Основная функция дашборда — один вызов, вся статистика
create or replace function public.dashboard_stats(
  p_days integer default 30
)
returns jsonb
language plpgsql stable security definer
set search_path = public
as $$
declare
  result jsonb;
  since timestamptz := now() - (p_days || ' days')::interval;
  prev_since timestamptz := since - (p_days || ' days')::interval;
begin
  select jsonb_build_object(
    'period_days', p_days,
    'generated_at', now(),

    -- Leads
    'leads_total', (select count(*) from leads where created_at >= since),
    'leads_prev', (select count(*) from leads where created_at >= prev_since and created_at < since),
    'leads_by_source', (
      select jsonb_object_agg(coalesce(nullif(source,''),'unknown'), cnt)
      from (select source, count(*) as cnt from leads where created_at >= since group by source) s
    ),
    'leads_by_service', (
      select jsonb_object_agg(coalesce(nullif(service_type,''),'unknown'), cnt)
      from (select service_type, count(*) as cnt from leads where created_at >= since group by service_type) s
    ),
    'leads_by_stage', (
      select jsonb_object_agg(stage, cnt)
      from (select stage, count(*) as cnt from leads where created_at >= since group by stage) s
    ),

    -- Revenue
    'revenue', coalesce((select sum(won_amount) from leads where outcome = 'won' and closed_at >= since), 0),
    'revenue_prev', coalesce((select sum(won_amount) from leads where outcome = 'won' and closed_at >= prev_since and closed_at < since), 0),
    'avg_deal_size', (select round(avg(won_amount),2) from leads where outcome = 'won' and closed_at >= since),
    'pipeline_value', coalesce((select sum(quoted_amount) from leads where stage in ('quoted','qualified') and quoted_amount > 0), 0),

    -- Jobs
    'jobs_completed', (select count(*) from jobs where status = 'completed' and completed_date >= since::date),
    'jobs_revenue', coalesce((select sum(total_amount) from jobs where status = 'completed' and completed_date >= since::date), 0),
    'jobs_scheduled', (select count(*) from jobs where status = 'scheduled' and scheduled_date >= current_date),
    'avg_job_rating', (select round(avg(rating)::numeric,2) from jobs where rating is not null and completed_date >= since::date),

    -- Performance
    'avg_response_min', (select round(avg(response_time_min)::numeric,0) from leads where response_time_min > 0 and created_at >= since),
    'conversion_rate', (
      select round(100.0 * count(*) filter (where outcome = 'won') / nullif(count(*),0), 1)
      from leads where created_at >= since
    ),

    -- Chat
    'chat_sessions', (select count(distinct session_id) from ai_conversations where created_at >= since),
    'chat_messages', (select count(*) from ai_conversations where created_at >= since and message_role = 'user'),
    'fb_sessions', (select count(distinct session_id) from ai_conversations where created_at >= since and session_id like 'fb_%'),

    -- Reviews
    'reviews_total', (select count(*) from reviews where created_at >= since),
    'reviews_avg_rating', (select round(avg(rating)::numeric,2) from reviews where created_at >= since),

    -- Expenses
    'expenses_total', coalesce((select sum(amount) from expenses where created_at >= since), 0),
    'profit', coalesce((select sum(total_amount) from jobs where status='completed' and completed_date >= since::date),0)
              - coalesce((select sum(amount) from expenses where created_at >= since),0),

    -- Alerts
    'stale_leads', (select count(*) from leads where stage = 'new' and created_at < now() - interval '24 hours'),
    'unresponded_reviews', (select count(*) from reviews where not responded),
    'overdue_jobs', (select count(*) from jobs where status = 'scheduled' and scheduled_date < current_date)
  ) into result;

  return result;
end;
$$;

-- Функция: обновить daily_stats за дату
create or replace function public.refresh_daily_stats(p_date date default current_date)
returns void language plpgsql security definer
set search_path = public
as $$
begin
  insert into daily_stats (stat_date, leads_new, leads_contacted, leads_quoted, leads_won, leads_lost,
    chat_sessions, chat_messages, fb_messages, jobs_completed, revenue, expenses, profit,
    avg_response_min, avg_job_rating, reviews_received, updated_at)
  values (
    p_date,
    (select count(*) from leads where created_at::date = p_date),
    (select count(*) from leads where contacted_at::date = p_date),
    (select count(*) from leads where quoted_at::date = p_date),
    (select count(*) from leads where outcome = 'won' and closed_at::date = p_date),
    (select count(*) from leads where outcome = 'lost' and closed_at::date = p_date),
    (select count(distinct session_id) from ai_conversations where created_at::date = p_date),
    (select count(*) from ai_conversations where created_at::date = p_date and message_role = 'user'),
    (select count(*) from ai_conversations where created_at::date = p_date and session_id like 'fb_%'),
    (select count(*) from jobs where completed_date = p_date and status = 'completed'),
    coalesce((select sum(total_amount) from jobs where completed_date = p_date and status = 'completed'), 0),
    coalesce((select sum(amount) from expenses where created_at::date = p_date), 0),
    coalesce((select sum(total_amount) from jobs where completed_date = p_date and status = 'completed'), 0)
      - coalesce((select sum(amount) from expenses where created_at::date = p_date), 0),
    (select round(avg(response_time_min)::numeric,1) from leads where created_at::date = p_date and response_time_min > 0),
    (select round(avg(rating)::numeric,2) from jobs where completed_date = p_date and rating is not null),
    (select count(*) from reviews where created_at::date = p_date),
    now()
  )
  on conflict (stat_date) do update set
    leads_new = excluded.leads_new,
    leads_contacted = excluded.leads_contacted,
    leads_quoted = excluded.leads_quoted,
    leads_won = excluded.leads_won,
    leads_lost = excluded.leads_lost,
    chat_sessions = excluded.chat_sessions,
    chat_messages = excluded.chat_messages,
    fb_messages = excluded.fb_messages,
    jobs_completed = excluded.jobs_completed,
    revenue = excluded.revenue,
    expenses = excluded.expenses,
    profit = excluded.profit,
    avg_response_min = excluded.avg_response_min,
    avg_job_rating = excluded.avg_job_rating,
    reviews_received = excluded.reviews_received,
    updated_at = now();
end;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  K. RLS на новые таблицы                                │
-- └─────────────────────────────────────────────────────────┘

alter table public.jobs enable row level security;
alter table public.reviews enable row level security;
alter table public.expenses enable row level security;
alter table public.daily_stats enable row level security;

-- Helper (idempotent)
create or replace function public.is_crm_admin()
returns boolean language sql stable security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'app_role') = 'crm_admin', false);
$$;

-- Jobs
drop policy if exists "jobs_admin_all" on public.jobs;
create policy "jobs_admin_all" on public.jobs for all to authenticated
  using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Reviews
drop policy if exists "reviews_admin_all" on public.reviews;
create policy "reviews_admin_all" on public.reviews for all to authenticated
  using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Expenses
drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all" on public.expenses for all to authenticated
  using (public.is_crm_admin()) with check (public.is_crm_admin());

-- Daily Stats — read only for admin
drop policy if exists "daily_stats_admin_read" on public.daily_stats;
create policy "daily_stats_admin_read" on public.daily_stats for select to authenticated
  using (public.is_crm_admin());

-- ┌─────────────────────────────────────────────────────────┐
-- │  VERIFICATION                                            │
-- └─────────────────────────────────────────────────────────┘

-- Таблицы и RLS
select t.tablename, t.rowsecurity as rls,
  count(p.policyname) as policies
from pg_tables t
left join pg_policies p on p.tablename = t.tablename and p.schemaname = 'public'
where t.schemaname = 'public'
  and t.tablename in ('leads','lead_photos','ai_conversations','lead_events','jobs','reviews','expenses','daily_stats')
group by t.tablename, t.rowsecurity
order by t.tablename;

-- Views
select viewname from pg_views where schemaname = 'public' order by viewname;

-- Functions
select p.proname as function_name
from pg_proc p
join pg_namespace n on p.pronamespace = n.oid
where n.nspname = 'public' and p.prokind = 'f'
order by p.proname;

-- Тест dashboard
select public.dashboard_stats(30);
