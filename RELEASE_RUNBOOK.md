# Release Runbook (Production)

## Goal
Deploy safely with explicit rollback readiness.

## Pre-Release (Hard Gate)
1. `npm run vercel:guard` (block accidental wrong-project deploys)
2. `npm run workflow:validate`
3. `npm run validate:pricing`
4. `npm run validate:ads`
5. `npm run audit:prod` (or `bash scripts/audit.sh --skip-stats` in CI)
6. Confirm Supabase migration state: `supabase migration list`
7. Confirm no accidental secrets in tracked files.

## Release Steps
1. Merge approved PR into `main`.
2. Verify CI green (including production readiness audit).
3. Confirm production health endpoints:
   - `/api/health`
   - `/api/health?type=pricing`
4. Smoke-check critical API contracts:
   - `/api/submit-lead` invalid payload returns `400`
   - `/api/ai-chat` valid payload returns `200`

## Post-Release (15-minute check)
1. Route checks: `/`, `/pricing`, `/privacy`, `/terms`, `/api/health`, `/r/one-tap/`.
2. Redirect checks: `/fb`, `/review`.
3. Tracking presence check (GA4/GTM/Ads IDs).
4. Confirm no legacy prices leak (`$155/$165/$175`).

## Rollback Triggers
Rollback immediately if any of these occur:
- `api/health` degraded or unavailable
- pricing consistency mismatch
- ai-chat contract broken
- route/redirect failures on core pages

## Rollback Procedure
1. Revert last deployment commit(s) on `main`.
2. Push revert.
3. Re-run production audit.
4. Verify health + pricing + ai-chat contracts.
5. Document incident in `ops/reports/YYYY-MM-DD-incident.md`.

## Incident Operations
- Create incident docs from template: `ops/incidents/INCIDENT_TEMPLATE.md`.
- Fast create incident file: `npm run incident:new -- --severity SEV2 --impact \"...\" --services website,api`
- Generate dashboard + MTTR snapshot: `npm run incident:dashboard`.
- Nightly monitor auto-builds incident dashboard artifact for trend visibility.

## Communication Template
- Incident summary
- User impact
- Root cause
- Fix + rollback status
- Preventive action
