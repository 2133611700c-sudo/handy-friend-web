# Handy & Friend — Recovery Ledger
**Last updated:** 2026-04-17T02:00 local (UTC-7)
**Plan doc:** `ops/recovery-plan-v2.md` (to be added by Sergii if canonicalized)
**Claim policy:** `docs/claim-policy.md` (created in Task 0.3)
**Release gate:** `docs/release-gate.md` (created in Task 0.3)

## Branch & Ownership

| Branch | Owner | Scope |
|---|---|---|
| `main` | Sergii (merger only) | protected, merges only via PR |
| `agent-a/reliability` | Agent A (Claude Code) | api/* runtime, lib/telegram/send.js, vercel.json crons |
| `agent-b/data-tests-tracking` | Agent B (Codex) | supabase/migrations/*, scripts/e2e_*.py, scripts/regression_*.py, tracking inject, HTML pages |

## Task Registry

| Task ID | Owner | Status | Files touched | Evidence | Commit | Updated |
|---|---|---|---|---|---|---|
| 0.1 | Agent A | DONE | `ops/recovery-ledger.md` | this file | 0732ad1 | 2026-04-17T02:02 |
| 0.2 | Agent A | READY | `vercel.json`, `scripts/daily_sales_pulse.py`, `scheduled-tasks` | — | — | — |
| 0.3 | Agent A | READY | `docs/claim-policy.md`, `docs/release-gate.md`, `docs/decisions/0001-*.md`, `.github/PULL_REQUEST_TEMPLATE.md` | — | — | — |
| 1.1 | Agent A | BLOCKED_ON_P0 | `api/process-outbox.js`, maybe `vercel.json` | — | — | — |
| 1.2 | Agent B | BLOCKED_ON_P0 | `supabase/migrations/20260417_035_recreate_followup_queue_view.sql` | — | — | — |
| 1.3 | Agent A | BLOCKED_ON_1.1 | `api/health.js`, `lib/conversation.js`, any other runtime `event_payload` reader | — | — | — |
| 1.4 | Agent A | BLOCKED_ON_1.3 | `api/health.js` auth block only | — | — | — |
| 1.5 | Agent A | BLOCKED_ON_1.1 and 2.1 visibility | `api/ai-chat.js`, `api/ai-intake.js`, `api/alex-webhook.js`, `api/process-outbox.js`, `api/lead-pipeline.js` (wait: `lib/lead-pipeline.js`), `lib/telegram/send.js` | — | — | — |
| 1.6 | Sergii + Agent A | BLOCKED_ON_P0 | `api/notify.js` + Vercel env | — | — | — |
| 2.1 | Agent B | BLOCKED_ON_P0 | migration 036 + `scripts/e2e_alex_telegram.py` + `scripts/cleanup_test_rows.py` + `vercel.json` | — | — | — |
| 2.2 | Agent B | BLOCKED_ON_1.3+1.4 | migration adding `ai_conversations.channel_source` + `api/health.js` reporting sections + `v_real_leads_7d` view | — | — | — |
| 2.3 | Agent B | BLOCKED_ON_P0 | `pricing/index.html`, `book/index.html`, possibly `scripts/inject_tracking.py` | — | — | — |
| 2.4 | Agent B | BLOCKED_ON_2.1 | migration 037 `funnel_events` + `/api/funnel-event` + chat widget client JS | — | — | — |
| 2.5 | Agent B | BLOCKED_ON_P0 | `scripts/regression_alex.py`, Alex system prompt files | — | — | — |
| 2.6 | Agent B | BLOCKED_ON_1.2+2.1+2.4 | cleanup of untracked files + migrations 031/032 | — | — | — |
| 3.1 | Sergii + any Agent via Chrome MCP | BLOCKED_ON_P0 | `ops/reports/2026-04-17-ads-snapshot/` | — | — | — |
| 3.2 | Sergii + any Agent via Chrome MCP | BLOCKED_ON_P0 | `ops/reports/2026-04-17-friction-map/` | — | — | — |
| 3.3 | Agent B | BLOCKED_ON_P0 | `ops/reports/2026-04-17-cta-truth-table.md` | — | — | — |

## Status Vocabulary (see `docs/claim-policy.md`)

- `READY` — unblocked, not yet started
- `IN_PROGRESS` — agent is working on it, ledger must show assignment timestamp
- `DONE` — committed on the agent's branch (not yet merged)
- `PASS` — merged to main, live validation returned expected result, evidence linked
- `PARTIAL` — works in N of M paths; remaining list must be enumerated
- `FAIL` — validation failed; repro recorded
- `UNKNOWN` — cannot verify from current access; required access recorded
- `SYNTHETIC` — works only on synthetic/test traffic; real-prod not verified
- `BLOCKED_ON_<task>` — gated on another task in the registry

## Evidence Requirements (per task closure)

Every task moving to `PASS` or `PARTIAL` must attach:
1. **Commit SHA** on `main` after merge
2. **Live validation output** — `curl`, `psql`, `grep` — with the exact command AND response
3. **Artifact file path** — log, screenshot, JSON snapshot — retained 7+ days under `ops/reports/`
4. **Rollback command** — how to undo this specific change

If any of these four cannot be produced, status must be `PARTIAL`, `SYNTHETIC`, or `UNKNOWN`.

## Open Risks

(none yet — to be appended as risks surface)

## Decisions Log

See `docs/decisions/`. Each decision = one markdown file, append-only.
- `0001-adopt-parallel-agent-workflow.md` — adoption of this two-agent process (Task 0.3).

## Coordination Protocol

- Before starting a task: set status to `IN_PROGRESS` in a dedicated commit.
- Conflict on a file shared with another agent: post in ledger under **Open Risks**, do not edit until the other agent's PR is merged.
- `vercel.json` may only be edited by Agent A — Agent B requests cron additions via ledger note.
- No force-push to any branch. No rebase of another agent's branch.
- `main` merges require the 6-point release-gate checklist (see `docs/release-gate.md`).

## Integrity Clock

This file is the single source of truth for progress. If reality disagrees with the ledger, the ledger is wrong — update it.
