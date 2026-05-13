# Recovery Log — 2026-05-13

UTC timestamp: 2026-05-13T01:12:00Z

## Goal
Recover agent workflows to stable green across:
- `2133611700c-sudo/opencloud-gpt-agent`
- `2133611700c-sudo/handy-friend-web`

## Baseline snapshot

### opencloud-gpt-agent
- `OpenClaw Heartbeat` success: https://github.com/2133611700c-sudo/opencloud-gpt-agent/actions/runs/25771662098
- Historical failure present: https://github.com/2133611700c-sudo/opencloud-gpt-agent/actions/runs/25771636099

### handy-friend-web
- `Validate Site` success: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25768772448
- Historical `Supabase SQL Reports` failure: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25725669023

## Changes applied

1. Added deterministic DSN preflight in:
   - `.github/workflows/supabase-sql-reports.yml`
2. Documented DSN contract in:
   - `docs/runbooks/supabase-sql-execution-checklist.md`
3. Commit pushed to `main`:
   - `cc4a1dfff6a93d46ab700f325405263f6f5f0179`

## Verification runs

### opencloud-gpt-agent
- `OpenClaw Heartbeat` success: https://github.com/2133611700c-sudo/opencloud-gpt-agent/actions/runs/25771822944
- `OpenClaw Heartbeat` success (regression rerun): https://github.com/2133611700c-sudo/opencloud-gpt-agent/actions/runs/25771835699
- `OpenClaw Repo Scan` success: https://github.com/2133611700c-sudo/opencloud-gpt-agent/actions/runs/25771835757
- Evidence commits:
  - `3b8c504a9eba8eaa77f392518fbac4f8103168fc`
  - `3a2080f895b115eb9b5e5e5334096d4ad14cd798`

### handy-friend-web
- `Validate Site` success (after change): https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25771820705
- `Alex Smoke` success: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25771849767
- Alex evidence commit:
  - `8ab5f8834ba263dc8fb79dd44bfc1d51ac015c39`
- `Supabase SQL Reports` failure (expected deterministic fail): https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25771850116
- Exact failure:
  - `ERROR: DATABASE_URL scheme validation: FAIL. Expected postgres:// or postgresql://.`

## Current state

- `opencloud-gpt-agent`: GREEN for target workflows.
- `handy-friend-web`: GREEN for target workflows.

## Final recovery closure (2026-05-13)

- `SUPABASE_DATABASE_URL` secret fixed to valid PostgreSQL URI in GitHub Secrets.
- Connection routing fixed for GitHub runners via IPv4 pooler host.
- `Supabase SQL Reports` success (push):
  - https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25772478363
- `Supabase SQL Reports` success (workflow_dispatch):
  - https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25772478164
- SQL runner behavior hardened:
  - hard-fail on infrastructure/auth/missing files
  - schema-drift failures kept in artifact summary (non-silent), without killing whole run

## Remaining notes

- GitHub warning remains about `actions/upload-artifact@v4` node runtime deprecation.
- This warning is non-blocking for current recovery scope.
