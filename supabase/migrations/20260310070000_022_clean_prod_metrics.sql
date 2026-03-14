-- ============================================================
-- Migration 022: Clean Production Metrics
-- Date: 2026-03-10
-- Purpose:
--   1. Fix avg_response_min KPI (use lead_events SLA, not contacted_at)
--   2. Exclude test leads from dashboard_stats()
--   3. Exclude test leads from refresh_daily_stats()
-- ============================================================

-- ┌─────────────────────────────────────────────────────────┐
-- │  1. NEW FUNCTION: calc_real_response_min                │
-- │     SLA = created_at → first (owner_email_sent OR       │
-- │           telegram_sent OR status=contacted event)       │
-- └─────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.calc_real_response_min(p_lead_id text)
RETURNS integer
LANGUAGE plpgsql STABLE
SET search_path = public
AS $$
DECLARE
  lead_created timestamptz;
  first_contact timestamptz;
BEGIN
  -- Get lead creation time
  SELECT created_at INTO lead_created
  FROM leads WHERE id = p_lead_id;

  IF lead_created IS NULL THEN RETURN NULL; END IF;

  -- Find the earliest meaningful contact event
  SELECT MIN(le.created_at) INTO first_contact
  FROM lead_events le
  WHERE le.lead_id = p_lead_id
    AND le.event_type IN (
      'owner_email_sent',
      'telegram_sent',
      'status_contacted',
      'stage_contacted'
    );

  -- Fallback: if no lead_events, use contacted_at from leads table
  IF first_contact IS NULL THEN
    SELECT contacted_at INTO first_contact
    FROM leads WHERE id = p_lead_id;
  END IF;

  IF first_contact IS NULL THEN RETURN NULL; END IF;

  RETURN GREATEST(0,
    EXTRACT(EPOCH FROM (first_contact - lead_created)) / 60
  )::integer;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  2. BACKFILL: Recalculate response_time_min for all     │
-- │     production leads using the new SLA formula           │
-- └─────────────────────────────────────────────────────────┘

UPDATE leads
SET response_time_min = calc_real_response_min(id)
WHERE is_test = false
  AND id IN (
    SELECT DISTINCT le.lead_id
    FROM lead_events le
    WHERE le.event_type IN ('owner_email_sent','telegram_sent','status_contacted','stage_contacted')
  );

-- ┌─────────────────────────────────────────────────────────┐
-- │  3. REPLACE: dashboard_stats() — exclude test leads     │
-- │     + use real SLA for avg_response_min                  │
-- └─────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.dashboard_stats(
  p_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  since timestamptz := now() - (p_days || ' days')::interval;
  prev_since timestamptz := since - (p_days || ' days')::interval;
BEGIN
  SELECT jsonb_build_object(
    'period_days', p_days,
    'generated_at', now(),

    -- Leads (PROD ONLY)
    'leads_total', (SELECT count(*) FROM leads WHERE created_at >= since AND is_test = false),
    'leads_prev', (SELECT count(*) FROM leads WHERE created_at >= prev_since AND created_at < since AND is_test = false),
    'leads_by_source', (
      SELECT jsonb_object_agg(coalesce(nullif(source,''),'unknown'), cnt)
      FROM (SELECT source, count(*) AS cnt FROM leads WHERE created_at >= since AND is_test = false GROUP BY source) s
    ),
    'leads_by_service', (
      SELECT jsonb_object_agg(coalesce(nullif(service_type,''),'unknown'), cnt)
      FROM (SELECT service_type, count(*) AS cnt FROM leads WHERE created_at >= since AND is_test = false GROUP BY service_type) s
    ),
    'leads_by_stage', (
      SELECT jsonb_object_agg(stage, cnt)
      FROM (SELECT stage, count(*) AS cnt FROM leads WHERE created_at >= since AND is_test = false GROUP BY stage) s
    ),

    -- Revenue (PROD ONLY)
    'revenue', coalesce((SELECT sum(won_amount) FROM leads WHERE outcome = 'won' AND closed_at >= since AND is_test = false), 0),
    'revenue_prev', coalesce((SELECT sum(won_amount) FROM leads WHERE outcome = 'won' AND closed_at >= prev_since AND closed_at < since AND is_test = false), 0),
    'avg_deal_size', (SELECT round(avg(won_amount),2) FROM leads WHERE outcome = 'won' AND closed_at >= since AND is_test = false),
    'pipeline_value', coalesce((SELECT sum(quoted_amount) FROM leads WHERE stage IN ('quoted','qualified') AND quoted_amount > 0 AND is_test = false), 0),

    -- Jobs (unchanged — jobs table doesn't have is_test)
    'jobs_completed', (SELECT count(*) FROM jobs WHERE status = 'completed' AND completed_date >= since::date),
    'jobs_revenue', coalesce((SELECT sum(total_amount) FROM jobs WHERE status = 'completed' AND completed_date >= since::date), 0),
    'jobs_scheduled', (SELECT count(*) FROM jobs WHERE status = 'scheduled' AND scheduled_date >= current_date),
    'avg_job_rating', (SELECT round(avg(rating)::numeric,2) FROM jobs WHERE rating IS NOT NULL AND completed_date >= since::date),

    -- Performance (PROD ONLY + event-based SLA)
    'avg_response_min', (
      SELECT round(avg(sla_min)::numeric, 1)
      FROM (
        SELECT calc_real_response_min(id) AS sla_min
        FROM leads
        WHERE created_at >= since
          AND is_test = false
          AND stage NOT IN ('new')  -- only leads that progressed
      ) sub
      WHERE sla_min IS NOT NULL AND sla_min > 0
    ),
    'conversion_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE outcome = 'won') / nullif(count(*),0), 1)
      FROM leads WHERE created_at >= since AND is_test = false
    ),

    -- Chat (unchanged)
    'chat_sessions', (SELECT count(DISTINCT session_id) FROM ai_conversations WHERE created_at >= since),
    'chat_messages', (SELECT count(*) FROM ai_conversations WHERE created_at >= since AND message_role = 'user'),
    'fb_sessions', (SELECT count(DISTINCT session_id) FROM ai_conversations WHERE created_at >= since AND session_id LIKE 'fb_%'),

    -- Reviews (unchanged)
    'reviews_total', (SELECT count(*) FROM reviews WHERE created_at >= since),
    'reviews_avg_rating', (SELECT round(avg(rating)::numeric,2) FROM reviews WHERE created_at >= since),

    -- Expenses (unchanged)
    'expenses_total', coalesce((SELECT sum(amount) FROM expenses WHERE created_at >= since), 0),
    'profit', coalesce((SELECT sum(total_amount) FROM jobs WHERE status='completed' AND completed_date >= since::date),0)
              - coalesce((SELECT sum(amount) FROM expenses WHERE created_at >= since),0),

    -- Alerts (PROD ONLY)
    'stale_leads', (SELECT count(*) FROM leads WHERE stage = 'new' AND created_at < now() - interval '24 hours' AND is_test = false),
    'unresponded_reviews', (SELECT count(*) FROM reviews WHERE NOT responded),
    'overdue_jobs', (SELECT count(*) FROM jobs WHERE status = 'scheduled' AND scheduled_date < current_date),

    -- NEW: Test lead stats (informational)
    'test_leads_total', (SELECT count(*) FROM leads WHERE created_at >= since AND is_test = true),
    'test_leads_pct', (
      SELECT round(100.0 * count(*) FILTER (WHERE is_test = true) / nullif(count(*), 0), 1)
      FROM leads WHERE created_at >= since
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  4. REPLACE: refresh_daily_stats() — exclude test leads │
-- └─────────────────────────────────────────────────────────┘

CREATE OR REPLACE FUNCTION public.refresh_daily_stats(p_date date DEFAULT current_date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO daily_stats (stat_date, leads_new, leads_contacted, leads_quoted, leads_won, leads_lost,
    chat_sessions, chat_messages, fb_messages, jobs_completed, revenue, expenses, profit,
    avg_response_min, avg_job_rating, reviews_received, updated_at)
  VALUES (
    p_date,
    (SELECT count(*) FROM leads WHERE created_at::date = p_date AND is_test = false),
    (SELECT count(*) FROM leads WHERE contacted_at::date = p_date AND is_test = false),
    (SELECT count(*) FROM leads WHERE quoted_at::date = p_date AND is_test = false),
    (SELECT count(*) FROM leads WHERE outcome = 'won' AND closed_at::date = p_date AND is_test = false),
    (SELECT count(*) FROM leads WHERE outcome = 'lost' AND closed_at::date = p_date AND is_test = false),
    (SELECT count(DISTINCT session_id) FROM ai_conversations WHERE created_at::date = p_date),
    (SELECT count(*) FROM ai_conversations WHERE created_at::date = p_date AND message_role = 'user'),
    (SELECT count(*) FROM ai_conversations WHERE created_at::date = p_date AND session_id LIKE 'fb_%'),
    (SELECT count(*) FROM jobs WHERE completed_date = p_date AND status = 'completed'),
    coalesce((SELECT sum(total_amount) FROM jobs WHERE completed_date = p_date AND status = 'completed'), 0),
    coalesce((SELECT sum(amount) FROM expenses WHERE created_at::date = p_date), 0),
    coalesce((SELECT sum(total_amount) FROM jobs WHERE completed_date = p_date AND status = 'completed'), 0)
      - coalesce((SELECT sum(amount) FROM expenses WHERE created_at::date = p_date), 0),
    (SELECT round(avg(sla)::numeric, 1) FROM (
      SELECT calc_real_response_min(id) AS sla FROM leads
      WHERE created_at::date = p_date AND is_test = false AND stage NOT IN ('new')
    ) sub WHERE sla IS NOT NULL AND sla > 0),
    (SELECT round(avg(rating)::numeric,2) FROM jobs WHERE completed_date = p_date AND rating IS NOT NULL),
    (SELECT count(*) FROM reviews WHERE created_at::date = p_date),
    now()
  )
  ON CONFLICT (stat_date) DO UPDATE SET
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
END;
$$;

-- ┌─────────────────────────────────────────────────────────┐
-- │  5. NEW VIEW: v_response_sla — detailed SLA breakdown   │
-- └─────────────────────────────────────────────────────────┘

CREATE OR REPLACE VIEW public.v_response_sla AS
SELECT
  l.id,
  l.full_name,
  l.phone,
  l.source,
  l.stage,
  l.created_at,
  l.contacted_at,
  l.response_time_min AS old_response_min,
  calc_real_response_min(l.id) AS sla_min,
  (SELECT MIN(le.created_at)
   FROM lead_events le
   WHERE le.lead_id = l.id
     AND le.event_type IN ('owner_email_sent','telegram_sent','status_contacted','stage_contacted')
  ) AS first_contact_event_at,
  (SELECT le.event_type
   FROM lead_events le
   WHERE le.lead_id = l.id
     AND le.event_type IN ('owner_email_sent','telegram_sent','status_contacted','stage_contacted')
   ORDER BY le.created_at ASC LIMIT 1
  ) AS first_contact_method
FROM leads l
WHERE l.is_test = false
ORDER BY l.created_at DESC;
