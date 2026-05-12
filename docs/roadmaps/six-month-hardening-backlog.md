# Six-Month Hardening Backlog — Handy & Friend

Status: ACTIVE
Scope: Alex, site intake, Supabase CRM, Telegram proof, Ads/GA4 attribution, OpenClaw-style external lead monitoring, operations.

## Source rules

- No fake DONE.
- No billing/payment changes.
- No force-push main.
- No new Vercel API routes unless function limit is confirmed.
- No claims of licensed/bonded/certified/best.
- Production claims require live proof.

## Month 1 — P0 reliability and proof

1. Close raw production POST smoke for `/api/ai-chat`.
2. Add response evidence contract to `/api/ai-chat`.
3. Prove synthetic lead chain: Alex -> Supabase -> Telegram.
4. Add stale `new` lead SLA monitor.
5. Clean legacy `click_whatsapp` CTA debt.
6. Standardize `ops-health-smoke` as first-line incident check.
7. Keep manual Ops Health Smoke workflow stable before adding schedule.
8. Confirm no service-role key is ever exposed client-side.

## Month 2 — release protection

9. Evaluate Vercel Deployment Checks for production alias protection.
10. Split blocking release checks from manual deep checks.
11. Keep pricing/policy and attribution tests in stable release gate.
12. Keep Alex smoke manual until raw logs are stable.
13. Store regression artifacts for Alex weekly checks.
14. Add incident status taxonomy to runbooks.

## Month 3 — attribution and conversion truth

15. Finalize canonical event names: phone_click, whatsapp_click, form_submit, sms_lead, lead_created.
16. Verify GA4 key events and Google Ads import mapping manually.
17. Verify auto-tagging/GCLID capture into CRM source details.
18. Build Ads -> GA4 -> Supabase -> Telegram -> booked reconciliation report.
19. Add weekly search-term cleanup workflow for Google Ads.
20. Add source quality scoring for paid vs organic leads.

## Month 4 — Alex quality

21. Expand golden service tests across top revenue services.
22. Add safety tests for legal claims, old prices, internal margin leakage, prompt injection.
23. Add legal cap guard: warn near $900 and stop/quote policy near $1,000 total job value.
24. Add photo-first logic for quote-heavy jobs.
25. Add fast-response and bounded side-effect architecture.

## Month 5 — external lead monitoring / OpenClaw proof

26. Implement OpenClaw-style source proof schema when actual component exists.
27. Add dedupe key for cross-channel lead detection.
28. Add Telegram owner card v2.
29. Add follow-up queue recovery for leads stuck in `new`.
30. Add no-silent-skip rule for monitored external sources.

## Month 6 — business operations

31. Add lead quality score.
32. Add booked/completed/lost/spam outcome tracking.
33. Add revenue attribution by source.
34. Add ops dashboard summary.
35. Add monthly executive audit: spend, leads, booked, missed, stale, broken channels.

## Current immediate execution order

1. Stale lead SLA monitor/report.
2. Legacy WhatsApp alias cleanup.
3. Response evidence contract.
4. Synthetic lead proof-chain.
5. Reconciliation report skeleton.
