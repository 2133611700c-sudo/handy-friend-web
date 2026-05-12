# Supabase SQL Execution Checklist

Status: ACTIVE

## Goal

Run the ops SQL reports safely and turn raw results into fixes.

## Before running

- Use Supabase SQL Editor or secure server-side ops context.
- Do not run from browser/client code.
- Do not expose service role keys.
- Save raw output for each report.

## Reports to run first

1. `ops/sql/lead-engine-full-health-report.sql`
2. `ops/sql/stale-leads-sla.sql`
3. `ops/sql/telegram-proof-gap-report.sql`
4. `ops/sql/source-attribution-gap-report.sql`
5. `ops/sql/duplicate-leads-dedupe-report.sql`
6. `ops/sql/paid-lead-escalation-report.sql`
7. `ops/sql/supabase-rls-audit.sql`

## How to interpret

- stale_paid_leads > 0: urgent owner action.
- telegram proof gaps > 0: owner visibility problem.
- attribution gaps > 0: Ads/CRM truth problem.
- duplicate leads > 0: dedupe/Telegram noise problem.
- RLS disabled on exposed CRM tables: security problem.

## Output rule

Each run must produce:

- report name
- run timestamp
- row count
- top 10 rows or summary
- next action

## Stop condition

If a query fails because columns differ, do not guess. Record exact error and adjust the SQL to the real schema.
