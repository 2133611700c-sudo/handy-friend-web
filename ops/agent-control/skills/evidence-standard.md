# Evidence Standard

Every OpenClaw report must include:

- `status`
- `task_id`
- `task_type`
- `failure_class`
- `dedupe_key`
- `task_file`
- `run_id`
- `timestamp_utc`
- `git_sha`
- `actor`
- `workflow_run_url`
- `details`
- `error` (if any)
- `next_action`

Browser task reports additionally include:

- `target_origin`
- `routes_checked`
- `desktop/mobile screenshots path`
- `console errors count`
- `network failures count`
- `forbidden claims summary`

Rules:

- No secret values.
- No customer PII in committed reports.
- Compact markdown in repo, large output as workflow artifacts.
