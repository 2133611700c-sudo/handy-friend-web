# Task Intake

## Goal

Accept task files from `ops/agent-control/tasks/*.json` with deterministic validation.

## Rules

- Prefer explicit `TASK_FILE` input.
- If no explicit file is provided, use latest modified task file.
- Validate task against `OPENCLAW_TASK_SCHEMA.v1.json`.
- Unsupported `type` returns `BLOCKED`, not `FAIL`.
- Unsafe tasks return `BLOCKED` when any of:
  - `safety.customer_action=true`
  - `safety.public_posting=true`
  - `safety.paid_ads_change=true`
  - `safety.destructive_action=true`

## Required output

- `task_id`, `task_type`, `status`, `failure_class`, `next_action`, `report_file`.
