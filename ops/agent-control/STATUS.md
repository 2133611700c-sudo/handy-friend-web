# Agent Control Status

## Goal

Harden Supabase SQL reporting from tolerant mode to production-grade gates with evidence and remediation artifacts.

## Current State

- `VERIFIED`: split workflow set exists:
  - `.github/workflows/supabase-infra-gate.yml`
  - `.github/workflows/supabase-schema-contract.yml`
  - `.github/workflows/supabase-business-reports.yml`
- `VERIFIED`: legacy `.github/workflows/supabase-sql-reports.yml` migrated to hard-gate flow semantics.
- `VERIFIED`: SQL contract assets created:
  - `ops/sql/contracts/generated-inventory.json`
  - `ops/sql/contracts/lead_operational_view.v1.yaml`
  - `ops/sql/contracts/README.md`
- `VERIFIED`: scripts added:
  - `scripts/check-supabase-infra.sh`
  - `scripts/check-supabase-schema-contract.sh`
  - `scripts/run-supabase-business-reports.sh`
  - `scripts/build-sql-remediation-packet.mjs`

## ChatGPT OpenClaw Delegation Rule

`VERIFIED`: OpenClaw is available as ChatGPT's external execution hand through GitHub Actions and evidence commits.

Rule:

- ChatGPT must use direct tools first when it can safely complete the task itself.
- ChatGPT should delegate to OpenClaw when the task requires cloud browser execution, screenshots, long-running runner work, environment-specific verification, or evidence that ChatGPT cannot obtain directly.
- OpenClaw is not a replacement brain. ChatGPT remains supervisor: define task, review evidence, verify outcome, decide next action.
- No OpenClaw result is accepted as DONE without committed evidence, artifact, run URL, or report path.
- OpenClaw must not perform customer messaging, paid ads changes, DNS/password/payment changes, destructive DB actions, or public posting without explicit approval.

Verified collaboration smoke:

- task file: `ops/agent-control/tasks/chatgpt-collab-smoke-20260513-001.json`
- workflow run: `25785309596`
- evidence commit: `fe62ca12b0fc3025de6e9fcc9a9c1dcbbc5085b7`
- evidence report: `ops/agent-control/reports/openclaw-heartbeat/20260513T073810Z.md`
- result: `PASS`

## Status Taxonomy Contract

- Hard gates (`infra`, `schema`): `PASS | FAIL | BLOCKED`.
- Business reports: `PASS | DEGRADED | FAIL`.
- `DEGRADED` forbidden for infra/schema.

## Artifact Contract

- Root: `ops/reports/sql/<run_id>/`, `run_id=YYYYMMDDTHHMMSSZ`.
- Required files:
  - `run-meta.json`
  - `infra-gate.json`, `infra-gate.md`
  - `schema-contract.json`, `schema-contract.md`
  - `business/summary.json`, `business/summary.md`
  - `summary.md`
- Conditional files:
  - `REMEDIATION.md`
  - `alerts/github-issue-comment.md`

## Risks and Control

- No secrets in logs: DSN/token redaction enforced in scripts.
- No PII-rich raw dumps committed by default.
- Concurrency group enabled: `supabase-sql-${{ github.ref }}`.

## Blockers

- No active blockers for activation baseline.
- If `SUPABASE_DATABASE_URL` secret missing/invalid in future runs, runtime status will be `BLOCKED`/`FAIL` with exact reason.

## HF-SUPABASE-SQL-HARDENING-001 Final Activation

- PR #101 merged: https://github.com/2133611700c-sudo/handy-friend-web/pull/101
- PR #101 merge SHA: `4d96b70da889236f0439cae56385ce19688991df`
- Main SHA after activation fixes: `a5af2844633f84203764a6b97bf00bf867872972`
- Follow-up hardening hotfix merges:
  - PR #102: https://github.com/2133611700c-sudo/handy-friend-web/pull/102
  - PR #103: https://github.com/2133611700c-sudo/handy-friend-web/pull/103

### Live Workflow Runs (from `main`)

- Infra Gate:
  - run_id: `25773380346`
  - url: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25773380346
  - workflow conclusion: `success`
  - classification: `PASS`
- Schema Contract:
  - run_id: `25773401913`
  - url: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25773401913
  - workflow conclusion: `failure`
  - classification: `FAIL`
  - exact missing column: `lead_operational_view.source_details`
- Business Reports:
  - run_id: `25773430807`
  - url: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25773430807
  - workflow conclusion: `failure`
  - classification: `FAIL` (because schema gate failed)
  - business summary status: `BLOCKED` (skipped due non-PASS schema)

### Artifacts Summary

- Infra artifacts:
  - `infra-gate.md`
  - `infra-gate.json`
  - `run-meta.json`
- Schema artifacts:
  - `schema-contract.md`
  - `schema-contract.json`
  - `schema-missing-columns.txt`
  - `run-meta.json`
  - `REMEDIATION.md`
- Business artifacts:
  - `summary.md`
  - `business/summary.md`
  - `business/summary.json`
  - `run-meta.json`
  - `REMEDIATION.md`
  - `alerts/github-issue-comment.md`

### Known Blockers

- `FAIL`: schema contract requires `lead_operational_view.source_details`, missing in current DB.
- This is a real DB/schema mismatch, not a workflow wiring issue.

### Remediation Packet Paths

- `ops/reports/sql/20260513T015536Z/REMEDIATION.md`
- `ops/reports/sql/20260513T015629Z/REMEDIATION.md`

### Next Scheduled Run

- Infra gate: daily cron `17 15 * * *` (UTC).
- Schema gate: daily cron `27 15 * * *` (UTC).
- Business reports: daily cron `37 15 * * *` (UTC).

### Rollback Note

- Rollback not required.
- Failures are expected hard-gate behavior for real schema drift and should be fixed in DB schema or contract versioning path.

## HF-SUPABASE-SQL-HARDENING-001 Final Revalidation (PASS)

- Contract resiliency fix merged: https://github.com/2133611700c-sudo/handy-friend-web/pull/105
- PR #105 merge SHA / main SHA: `549f2417b2388fd4b4d0d4bbbdbabe4551bfc625`

### Live Workflow Runs (from `main`, final)

- Infra Gate:
  - run_id: `25782905075`
  - url: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25782905075
  - workflow conclusion: `success`
  - classification: `PASS`
  - artifact: `supabase-infra-gate-25782905075` (id `6963282239`)
- Schema Contract:
  - run_id: `25782947914`
  - url: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25782947914
  - workflow conclusion: `success`
  - classification: `PASS`
  - artifact: `supabase-schema-contract-25782947914` (id `6963293945`)
- Business Reports:
  - run_id: `25782979827`
  - url: https://github.com/2133611700c-sudo/handy-friend-web/actions/runs/25782979827
  - workflow conclusion: `success`
  - classification: `PASS`
  - artifact: `supabase-business-reports-25782979827` (id `6963315297`)

### Final Status

- Infra gate: `PASS`
- Schema gate: `PASS`
- Business reports: `PASS`
- Activation: `PASS`
