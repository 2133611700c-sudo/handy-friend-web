# SQL Ops Report Index

## Files

- `stale-leads-sla.sql` — stale lead SLA check.
- `supabase-rls-audit.sql` — RLS and policy inventory.
- `lead-quality-scoring-report.sql` — lead priority scoring.
- `booked-revenue-attribution-report.sql` — booked and revenue attribution.
- `telegram-proof-gap-report.sql` — leads without Telegram proof.
- `follow-up-recovery-report.sql` — leads needing contact, follow-up, or stage repair.
- `source-attribution-gap-report.sql` — missing or weak source attribution.
- `duplicate-leads-dedupe-report.sql` — likely duplicate leads across channels.
- `executive-dashboard-summary.sql` — owner dashboard summary.
- `paid-lead-escalation-report.sql` — urgent paid-lead escalation list.
- `weekly-ops-digest-report.sql` — weekly lead-engine digest.
- `lead-engine-full-health-report.sql` — combined 30-day lead engine health view.

## Rule

Run from a trusted admin/ops context and attach raw output to the related issue.
