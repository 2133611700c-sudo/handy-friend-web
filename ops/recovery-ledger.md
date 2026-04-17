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
| 0.2 | Agent A | DONE | `scripts/daily_sales_pulse.py`, `~/.claude/scheduled-tasks/handy-friend-daily-digest/SKILL.md` | classification table in PR body, disabled handy-friend-daily-digest | pending | 2026-04-17T02:15 |
| 0.3 | Agent A | DONE | `docs/claim-policy.md`, `docs/release-gate.md`, `docs/decisions/0001-adopt-parallel-agent-workflow.md`, `.github/pull_request_template.md` | files committed, PR pending | pending | 2026-04-17T02:10 |
| 1.1 | Agent A | DONE | `api/process-outbox.js` auth block only | ADR-0002 + this commit | pending | 2026-04-17T02:45 |
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

### 2026-04-17 — `ads_spend` signal unavailable (blocks replacement alert for Task 0.2)
**Status:** UNKNOWN
**Context:** Task 0.2 prescribes a replacement alert: "real_leads=0 AND ads_spend>0 for 48h".
**Blocker:** `ads_spend` is not queryable from any currently-integrated source.
- Google Ads API: no credentials in env.
- Supabase: no `ads_spend_daily` table or column.
- GA4→Ads link: present but not exposed to our backend.
**Access required to close:** Google Ads API (developer token + OAuth refresh) OR a daily ads_spend push from a separate scheduled task using Chrome MCP to read the Ads UI.
**Consequence while unresolved:** we cannot auto-distinguish "no leads because no ads traffic" from "no leads despite ads traffic". First is expected; second is P0.
**Owner:** Sergii must decide between (a) supply Ads API creds or (b) authorize Chrome MCP ads-spend scrape task. Either path returns this risk to READY.

### 2026-04-17 — Task 1.1 auth deadlock
**Status:** DONE on branch (awaiting merge + post-deploy PASS)
**Resolution:** Task 1.1 brought forward into PR #15. See `docs/decisions/0002-task-1.1-brought-forward-for-ci.md`. CI required `/api/health?type=outbox` + `/api/process-outbox?action=slo` to return `ok:true`, which required Task 1.1 to land before P0 could merge. Auth block in `api/process-outbox.js` adjusted so `x-vercel-cron` header is accepted independently of `CRON_SECRET` state. External 403 guard preserved. Post-deploy verification pending: cron firing 04:00 UTC + queue drain SQL.

### 2026-04-17 — Task 1.2 prerequisite: `followup_queue` view dropped, not recreated
**Status:** FAIL (pre-existing, re-confirmed in critical audit)
**Evidence:** `curl /rest/v1/followup_queue → HTTP 404 PGRST205`.
**Remediation:** Task 1.2 owned by Agent B. Blocked on P0 merge.

### 2026-04-17 — Task 1.6 data gathering: `/api/notify` callers enumerated
**Status:** info block for Sergii decision (READY for Task 1.6)
**Active callers of `/api/notify`:** exactly 1.
- `assets/js/main.js:2229` — client-side `fetch('/api/notify', {method:'POST', body: JSON.stringify({type:'sms', ...})})` — sends SMS estimate from the pricing-calculator form.
**Side effect of Agent A's prior hardening:** the secret-header check happens BEFORE the `type` branch. Since the client at `main.js:2229` cannot send `X-HF-Notify-Secret` (it is a browser request), the calculator SMS flow currently returns **HTTP 503 `notify_disabled`** for every real user.
**This means:** the only active caller of `/api/notify` is a browser-side SMS send from pricing, and Agent A's previous hardening broke it. The 503 fail-closed is correct for abuse protection but also closes the legitimate path.
**Decision required from Sergii (Task 1.6):**
- **1.6A (delete route):** if calculator SMS is not used in practice (probe SMS-send count in runtime logs / billing). Remove route + `main.js:2229` caller. Simple.
- **1.6B (keep route):** gate `type=telegram` with secret; keep `type=sms` open (but rate-limited + CAPTCHA) since it's a public form submission, not a server-to-server call. Requires refactoring the auth check to be type-aware.
- **1.6C (delete just the Telegram branch):** remove telegram path entirely; keep SMS path public. Minimal risk of spam since SMS costs Twilio $, not Telegram-bot abuse.
**No code change by Agent A until Sergii picks A/B/C.** Files recorded: `api/notify.js`, `assets/js/main.js:2229-2260`.

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
