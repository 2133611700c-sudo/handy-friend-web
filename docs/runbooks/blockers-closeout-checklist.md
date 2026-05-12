# Blockers Closeout Checklist

Status: ACTIVE

## Goal

Close remaining blockers with raw evidence, not assumptions.

## Blocker 1: Alex POST smoke

Action:

- Run GitHub workflow: `Alex Smoke`.

Evidence needed:

- workflow log;
- HTTP status;
- latency;
- reply check;
- no old prices.

## Blocker 2: Supabase SQL reports

Action:

- Add GitHub secret `SUPABASE_DATABASE_URL`.
- Run workflow: `Supabase SQL Reports`.

Evidence needed:

- uploaded artifact;
- `_summary.txt`;
- failed query errors if any.

## Blocker 3: GA4 to Google Ads conversions

Action:

- Verify GA4 and Google Ads are linked.
- Verify auto-tagging.
- Verify canonical lead events are imported.

Evidence needed:

- conversion action names;
- status;
- primary/secondary setting.

## Blocker 4: Vercel Deployment Checks

Action:

- Configure selected checks in Vercel project settings.

Evidence needed:

- screenshot or settings confirmation;
- next deployment blocked/promoted according to checks.

## Blocker 5: Supabase RLS audit

Action:

- Run `ops/sql/supabase-rls-audit.sql`.

Evidence needed:

- tables checked;
- RLS disabled count;
- policies inventory.
