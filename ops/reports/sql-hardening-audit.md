# Supabase SQL Hardening Audit

Date: 2026-05-13 (UTC)

## Baseline

- Current baseline SHA before hardening edits: `4d44083`.
- Existing workflow before split: `.github/workflows/supabase-sql-reports.yml`.
- Existing runner script before split: `scripts/run-supabase-sql-reports.sh`.
- Tolerant branch found: `schema_drift_failures` in `run-supabase-sql-reports.sh` allowed workflow pass with warning.

## SQL Inventory (required by current reports)

- Required view: `lead_operational_view`.
- Required table: `lead_events`.
- Required system catalogs for audit query: `pg_class`, `pg_namespace`, `pg_policies`.
- CTE names were detected and excluded from contract requirements.

## Tolerant/Degraded Branches

- `schema_drift_failures` did not fail job in legacy script.
- Missing report files were hard failure.
- DB connection and URL scheme were hard failure.

## Workflow Baseline (before hardening split)

- Single workflow mixed infra + schema + business concerns.
- No explicit contract file versioning.
- No strict artifact contract (`run-meta.json`, `schema-contract.json`, etc.).
- No dedicated concurrency group for all SQL workflows.

## Hardening Target

- Hard gates:
  - Infra: PASS/FAIL/BLOCKED only.
  - Schema: PASS/FAIL/BLOCKED only.
- Business reports:
  - PASS/DEGRADED/FAIL allowed.
  - DEGRADED only after infra/schema PASS.
- Artifact root: `ops/reports/sql/<run_id>/` with run-specific immutable outputs.
