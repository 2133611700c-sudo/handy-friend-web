# KPI Truth Contract

Purpose: prevent metric confusion and report drift.

## Source of Truth
- `dashboard_stats(p_days)` is primary for operational snapshots.
- Channel/service breakdowns come from dedicated views (`v_channel_roi`, `v_service_performance`, etc.).

## Non-Negotiable Definitions
- `avg_job_rating`: average rating from completed jobs (`jobs.rating`).
- `reviews_avg_rating`: average rating from review table (`reviews.rating`).
- `reviews_total`: count of review records in `reviews`.
- `conversion_rate`: lead-to-won conversion from pipeline logic used in `dashboard_stats()`.

## Hard Rule
Never present `avg_job_rating` as "Google reviews" or "public reviews".

## Required Reporting Format
Every report must explicitly show both metrics when available:
- Job rating: `avg_job_rating`
- Reviews rating: `reviews_avg_rating`
- Reviews count: `reviews_total`

If reviews data is empty:
- show `reviews_avg_rating = null`
- show `reviews_total = 0`
- do not infer public rating.

## Validation Checklist Snippet
Before publishing any report:
1. Confirm rating fields are not mixed.
2. Confirm labels match data source.
3. Confirm null/zero are shown honestly.

## Escalation Rule
If dashboard and report differ for any core metric (`leads_total`, `revenue`, `profit`, `conversion_rate`, ratings), block publication and run reconciliation.
