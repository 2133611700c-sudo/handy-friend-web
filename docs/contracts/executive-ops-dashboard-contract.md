# Executive Ops Dashboard Contract

Status: ACTIVE

## Goal

One owner-facing dashboard should show whether the Handy & Friend lead engine is healthy and profitable.

## Required sections

- Production site health
- Alex intake health
- Telegram proof health
- Outbox and DLQ health
- Stale lead SLA
- Source attribution gaps
- Duplicate lead count
- Media/photo proof gaps
- Ads and GA4 conversion status
- Lead quality scoring
- Booked and revenue attribution

## Required status colors

- GREEN: healthy or no action needed
- YELLOW: warning or partial gap
- RED: action required
- GRAY: not configured or not verified

## Required metrics

- total leads last 7 days
- total leads last 30 days
- leads by source
- booked jobs by source
- revenue by source
- stale leads count
- Telegram proof gap count
- attribution gap count
- duplicate lead count
- Alex timeout/fallback count

## Decision rules

- Do not increase Ads spend if conversion proof is red.
- Do not treat CRM leads as successful unless owner proof and follow-up status exist.
- Treat paid stale leads as urgent.
- Treat missing source on booked jobs as attribution debt.

## Data sources

- `/api/health`
- Telegram health
- attribution health
- outbox health
- Supabase SQL reports in `ops/sql`
- Google Ads and GA4 UI exports

## Acceptance

Dashboard is useful only if it shows both lead volume and booked/revenue outcomes.
