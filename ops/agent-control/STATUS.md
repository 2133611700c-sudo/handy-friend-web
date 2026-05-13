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

- `UNVERIFIED`: live workflow run IDs after this hardening change must be captured.
- If `SUPABASE_DATABASE_URL` secret missing/invalid in target repo, runtime status will be `BLOCKED`/`FAIL` with exact reason.
