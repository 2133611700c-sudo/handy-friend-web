# Handy & Friend Master Execution Plan

Status: ACTIVE
Scope: Handy & Friend site, Alex AI intake, OpenClaw-style monitoring, Supabase CRM, Telegram proof, GA4/Google Ads attribution, Vercel release safety.

## Operating rule

No DONE without raw evidence. Production claims require live checks.

## External rules verified

- Vercel Deployment Checks can prevent production promotion until selected checks pass.
- Google Ads can import GA4 web key events as conversion actions after GA4/Ads linking.
- Supabase service role keys bypass RLS and must never be exposed in browser/customer context.

## Current verified baseline

- Production project: `handy-friend-landing-v6`.
- Production domains: `handyandfriend.com`, `www.handyandfriend.com`.
- `/api/health` returns healthy.
- Supabase, Telegram, Facebook, Resend, DeepSeek env flags exist in production health.
- Alex fail-fast timeout and static fallback pricing have been deployed.
- Ops/runbook/contracts now exist for Alex, attribution, OpenClaw proof, stale leads, security, release safety, and reconciliation.

## Open blockers

1. Raw production POST smoke for `/api/ai-chat` still needs PASS evidence.
2. Legacy `click_whatsapp` markup debt still needs safe cleanup.
3. Supabase RLS audit SQL needs to be run in Supabase.
4. Vercel Deployment Checks need dashboard configuration.
5. GA4 key events need Ads import verification in UI.
6. Stale lead SLA monitor needs server-side implementation, not just SQL/runbook.
7. Response evidence contract needs a small safe patch in `/api/ai-chat`.

## Unified execution phases

### Phase 1 — Stabilize proof and monitoring

- Run `node scripts/ops-health-smoke.mjs` from a normal network.
- Run `npm run smoke:alex` from a normal network.
- Attach raw outputs to issue #70.
- Run `ops/sql/stale-leads-sla.sql` in Supabase.
- Run `ops/sql/supabase-rls-audit.sql` in Supabase.

### Phase 2 — Close tracking correctness

- Clean `click_whatsapp` legacy markup.
- Keep canonical event names:
  - `phone_click`
  - `whatsapp_click`
  - `form_submit`
  - `sms_lead`
  - `lead_created`
- Verify GA4 key events exist.
- Import correct GA4 key events to Google Ads conversion actions.
- Keep payment/billing out of scope.

### Phase 3 — Make Alex evidence-first

- Add safe response fields:
  - `session_id`
  - `correlation_id`
  - `latency_ms`
  - `model_source`
  - `fallback_used`
  - `leadCaptured`
  - `leadId`
  - `service`
- Do not expose secrets, system prompt, internal pricing, or provider keys.
- Keep frontend backward-compatible.

### Phase 4 — Stop lead loss

- Implement stale lead SLA monitor.
- Paid source stale threshold: 20 minutes.
- Site/organic stale threshold: 30 minutes.
- Low-confidence monitored leads: 60 minutes.
- Telegram owner alert must include count, source, service, age, next action.

### Phase 5 — Reconciliation and revenue truth

- Build recurring Ads -> GA4 -> Supabase -> Telegram -> booked report.
- Compare clicks, key events, CRM leads, Telegram proofs, booked jobs.
- Do not increase Ads budget without conversion/proof integrity.

### Phase 6 — Release and security hardening

- Configure Vercel Deployment Checks in dashboard.
- Keep blocking checks deterministic.
- Keep deep/live checks manual until stable raw logs exist.
- Confirm Supabase RLS and least privilege.
- Keep service role server-side only.

## Priority issues

- #70 Close Alex production POST smoke verification
- #75 Clean legacy click_whatsapp CTA attributes
- #76 Configure Vercel Deployment Checks
- #77 Run Supabase RLS and client-secret audit
- #78 Implement stale lead SLA monitor
- #79 Build Ads GA4 CRM Telegram reconciliation report

## Success definition

The system is considered operationally strong when:

1. Site health is green.
2. Alex POST smoke passes.
3. Supabase receives/keeps lead proof.
4. Telegram proof exists or skip reason exists.
5. GA4/Ads events match canonical event names.
6. CRM source attribution is explainable.
7. Stale leads are visible and alerted.
8. Production releases are protected by deployment checks.
9. Security/RLS audit has no blocking gaps.
10. Booked jobs can be traced back to source.
