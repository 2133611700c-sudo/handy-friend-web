# Global Execution Matrix — Handy & Friend

Status: ACTIVE

## Goal

One control map for all Handy & Friend reliability, lead, CRM, Telegram, Ads, and release-safety work.

## Block A — Production health

Status: VERIFIED by `/api/health`.

Controls:

- `scripts/ops-health-smoke.mjs`
- `Ops Health Smoke` workflow
- `/api/health`

Next:

- Keep as first check for any incident.

## Block B — Alex AI intake

Status: READY TO VERIFY.

Controls:

- `scripts/alex-prod-smoke.mjs`
- `Alex Smoke` workflow
- `scripts/run-manual-verification-workflows.sh`

Blocked by:

- Manual workflow run or GitHub CLI run.

Evidence needed:

- raw Alex Smoke log.

## Block C — Supabase CRM reports

Status: READY TO RUN.

Controls:

- `scripts/run-supabase-sql-reports.sh`
- `Supabase SQL Reports` workflow
- `ops/sql/*.sql`

Blocked by:

- GitHub secret `SUPABASE_DATABASE_URL`.

Evidence needed:

- workflow artifact with SQL outputs.

## Block D — Telegram proof

Status: READY TO AUDIT.

Controls:

- `ops/sql/telegram-proof-gap-report.sql`
- `docs/contracts/telegram-owner-card-v2.md`
- `docs/contracts/photo-media-proof-contract.md`

Evidence needed:

- proof gap count and sample rows.

## Block E — Stale leads and follow-up

Status: READY TO AUDIT.

Controls:

- `ops/sql/stale-leads-sla.sql`
- `ops/sql/follow-up-recovery-report.sql`
- `ops/sql/paid-lead-escalation-report.sql`

Evidence needed:

- stale lead count and paid stale lead count.

## Block F — Attribution and Ads truth

Status: READY FOR UI VERIFICATION.

Controls:

- `docs/runbooks/ads-ga4-conversion-checklist.md`
- `docs/reports/ads-ga4-crm-reconciliation-template.md`
- `ops/sql/source-attribution-gap-report.sql`

Blocked by:

- Google Ads and GA4 UI check.

Evidence needed:

- imported conversion actions and status.

## Block G — Revenue and source quality

Status: READY TO AUDIT.

Controls:

- `ops/sql/booked-revenue-attribution-report.sql`
- `ops/sql/lead-quality-scoring-report.sql`
- `ops/sql/lead-engine-full-health-report.sql`

Evidence needed:

- booked/revenue by source.

## Block H — Release safety

Status: READY FOR UI SETUP.

Controls:

- `docs/runbooks/vercel-deployment-checks-checklist.md`
- `docs/contracts/security-and-release-contract.md`

Blocked by:

- Vercel dashboard setup.

Evidence needed:

- Deployment Checks configured.

## Block I — Security and RLS

Status: READY TO AUDIT.

Controls:

- `scripts/security-surface-audit.mjs`
- `ops/sql/supabase-rls-audit.sql`
- `docs/contracts/security-and-release-contract.md`

Blocked by:

- Supabase SQL execution.

Evidence needed:

- RLS audit output.

## Execution order

1. Run Alex Smoke.
2. Add `SUPABASE_DATABASE_URL` secret.
3. Run Supabase SQL Reports.
4. Fix SQL column mismatches if any.
5. Fix actual stale/proof/attribution gaps found by reports.
6. Verify GA4 to Ads conversion imports.
7. Configure Vercel Deployment Checks.
8. Turn stable manual checks into blocking checks only after reliable logs exist.

## Non-negotiable rule

No blocker closes without raw log, artifact, query output, UI evidence, or live endpoint evidence.
