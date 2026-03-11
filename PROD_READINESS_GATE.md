# PROD Readiness Gate

Purpose: provide a hard PASS/FAIL gate before production release for Handy & Friend.

## Run

```bash
npm run audit:prod
```

Default behavior is strict:
- fails on dirty git tree
- fails on any route/API/tracking/test mismatch
- fails if protected stats endpoint cannot be verified

Useful flags:

```bash
bash scripts/audit.sh --allow-dirty
bash scripts/audit.sh --site https://handyandfriend.com --allow-dirty
bash scripts/audit.sh --stats-key "<key>" --allow-dirty
```

## Gate sections

1. Git hygiene
- inside git repo
- current branch detected
- working tree clean (unless `--allow-dirty`)

2. Local quality gates
- `npm run workflow:validate`
- `npm run validate:pricing`
- `npm run validate:ads`

3. Public routes and redirects
- `/` -> `200`
- `/pricing` -> `200`
- `/privacy` -> `200`
- `/terms` -> `200`
- `/api/health` -> `200`
- `/r/one-tap/` -> `200`
- `/fb` -> `302` + Facebook URL
- `/review` -> `302` + Google URL

4. Health and runtime checks
- `/api/health` returns `ok=true`
- required integrations true: Supabase, Telegram, DeepSeek, FB, Resend
- `sendgrid_api_key=false` is informational (accepted)

5. API contract checks
- `POST /api/submit-lead` with empty body -> `400`
- `POST /api/ai-chat` with invalid body -> `400`
- `POST /api/ai-chat` with valid contract -> `200`
- AI reply contains canonical TV anchors (`$105`, `$185`)

6. Tracking and pricing integrity
- GA4 ID `G-Z05XJ8E281` present on main/pricing/one-tap
- GTM ID `GTM-NQTL3S6Q` present on main/pricing/one-tap
- Google Ads ID `AW-17971094967` present on main and pricing
- forbidden legacy prices not present: `$155`, `$165`, `$175`

7. Protected stats verification
- call `/api/health?type=stats&key=<secret>&days=30`
- must return `ok=true` and numeric core metrics

Stats key resolution order in script:
1) `--stats-key` argument
2) `STATS_SECRET` env var
3) first 16 chars of `SUPABASE_SERVICE_ROLE_KEY` from env or `.env.production`

## Pass criteria

PASS means:
- no FAILED checks
- no missing critical sections

Any FAIL blocks release.

## Output contract

`audit.sh` prints:
- timestamp, site, branch
- check-by-check PASS/FAIL
- failed checks list
- final verdict

Exit codes:
- `0` = PASS
- `1` = FAIL
