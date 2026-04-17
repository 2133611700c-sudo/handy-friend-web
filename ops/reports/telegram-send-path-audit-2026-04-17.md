# Telegram Send-Path Audit — 2026-04-17
**Task:** A3 (Agent A read-only audit)
**Scope:** `api/`, `lib/`, `scripts/`
**Goal:** Verify whether Telegram outbound sends are actually routed through `lib/telegram/send.js` or still bypass it with raw `fetch()` to `api.telegram.org`.

---

## Method

```
grep -rn "api.telegram.org" api/ lib/ scripts/ \
  | grep -v "node_modules|\.map|\.backup|\.worktree|/skills/"
```

Runtime-only concerns: API handlers (`api/*.js`) and shared libs (`lib/*.js`).
Ops scripts (`scripts/*.*`) are listed separately — they run outside Vercel function context and generally don't need the unified sender's durable `telegram_sends` logging (though they could use it).

---

## Classification

### 1. Unified sender (sanctioned path)  — **1 reference**

| File:line | Kind |
|---|---|
| `lib/telegram/send.js:36` | `const TG_API_BASE = 'https://api.telegram.org';` — the only blessed path. Every legitimate send should route through this module. |

### 2. Inbound / diagnostic (NOT outbound sends — do NOT need migration)  — **3 references**

| File:line | Purpose |
|---|---|
| `api/telegram-webhook.js:13` | Doc comment describing how to call `setWebhook` via `curl` at deploy time. Not a runtime send. |
| `api/telegram-webhook.js:194` | Bot-reply to an incoming Telegram DM (inbound webhook handler). Not lead-delivery path. Candidate for migration if we want unified logging of bot self-replies, but low-priority. |
| `api/health.js:169` | Calls `getWebhookInfo` for the `?type=telegram` dashboard. Pure read. Not a send. |

### 3. Raw outbound sends in API handlers — MUST migrate (P1)  — **13 references**

These are the ones that produce customer-facing side effects and still bypass `lib/telegram/send.js`. Every one of these creates a `telegram_sends` blind spot.

| File:line | Function | Channel impact | Status |
|---|---|---|---|
| `api/ai-chat.js:432` | `sendTelegramLeadCard` | website_chat lead alert (LEAD_CAPTURED card) | FAIL |
| `api/ai-chat.js:524` | `sendPreLeadPhotoToTelegram` text part | pre-lead photo inquiry alert | FAIL |
| `api/ai-chat.js:691` | `sendTelegramPhotoWithRetry` helper | photo forwarding for both the above | FAIL |
| `api/alex-webhook.js:472` | FB Messenger sales-card | FB Messenger lead alert | FAIL |
| `api/alex-webhook.js:497` | FB Messenger send text | FB Messenger follow-up | FAIL |
| `api/alex-webhook.js:505` | FB Messenger sendPhoto | FB Messenger photo forward | FAIL |
| `api/ai-intake.js:174` | Intake sendText | legacy query-ai intake path | FAIL |
| `api/ai-intake.js:230` | Intake sendPhoto | legacy query-ai intake photo | FAIL |
| `api/process-outbox.js:482` | Outbox worker primary send | **retry backbone** — every retried telegram_owner job sends raw | FAIL |
| `api/process-outbox.js:600` | Outbox worker secondary path | DLQ replay send | FAIL |
| `lib/lead-pipeline.js:1112` | Pipeline Telegram push | shared lib used by multiple API handlers | FAIL |
| `lib/lead-pipeline.js:1303` | Pipeline secondary send | shared lib secondary path | FAIL |

Plus **1 sanctioned outbound** that IS through the unified sender (from my earlier Task-1.5 partial wave):
- `api/ai-chat.js:573` — `unifiedTelegramSend()` call in `sendStrictSalesCard`. **PASS.** Only one of four sales-card paths.

**13 of 14 runtime outbound sends bypass the unified sender.**

### 4. Ops scripts — out of Vercel function runtime (P2, lower priority)  — **13 references**

These run via cron/CLI/manual on the Dell worker or locally. They don't share the Vercel functions' durable logging SLA. Migration is useful for consistency but not urgent.

| File:line |
|---|
| `scripts/daily-report.mjs:843, 864` |
| `scripts/sla-check.mjs:171` |
| `scripts/telegram-send.sh:14` (CLI wrapper — has its own `lib/telegram_logger.py` — separate logging) |
| `scripts/quote_draft.py:72` |
| `scripts/followup_scheduler.py:113` |
| `scripts/setup-telegram-bot.sh:42` |
| `scripts/tg-alert.sh:9` |
| `scripts/sprint1-autopilot.mjs:83` |
| `scripts/social_scanner.py:185` |
| `scripts/autonomous_watchdog.py:84` (I wrote this; acceptable — operational alert, not customer-facing) |
| `scripts/openclaw_health_monitor.py:456` |
| `scripts/deploy-optimized-system.sh:148` |
| `scripts/daily_sales_pulse.py:69` (I wrote this; handler is now DISABLED per Task 0.2) |

### 5. Stale backup files — should be cleaned (P3)  — **2 references**

| File:line |
|---|
| `scripts/followup_scheduler.py.bak_20260413_2238:113` |
| `scripts/sla-check.mjs.bak_20260413_2238:157` |

Recommend `git rm` these in a separate Task 2.6-adjacent cleanup.

---

## Verdict

**Overall status: PARTIAL.**

- Unified sender module exists and is wired. ✅
- 1 of 14 runtime paths migrated to it (the `sendStrictSalesCard` path in `api/ai-chat.js`). ✅
- **13 of 14 runtime outbound sends still bypass unified, so telegram_sends table remains blind for them.** ❌
- Ops scripts: 13 additional raw sends (P2, lower severity).
- Backup files: 2 (P3).

**Count of raw runtime outbound sends remaining: 13**

This means the earlier Task 1.5 claim "unified sender in place" was never fully delivered. The ledger has row 1.5 as `READY_PARTIAL`; this audit confirms that label is still accurate. A real Task 1.5 completion needs to route every one of those 13 lines through `sendTelegramMessage` / `sendTelegramPhoto` from `lib/telegram/send.js`.

### Why this matters to ADR-0004

The delivery-evidence gate added in Task A2 sums `sent_count` across all `outbound_jobs.metrics[]` status rows. That source of truth IS correct for `telegram_owner` jobs queued through `lib/lead-pipeline.js:enqueueOutboundJob` — but every bypass path at the 13 sites above never touches `outbound_jobs` at all. They write directly to `api.telegram.org`. If one of those 13 paths silently fails, neither `outbox_health` nor the new delivery gate will see it.

Closing the 13 paths is the only way to make the gate meaningful for the full Telegram surface.

---

## Proof files

- `ops/reports/telegram-send-path-audit-2026-04-17.md` — this file
- Raw grep output produced during audit (not committed — reproducible via command in §Method)

## Rollback

```
git rm ops/reports/telegram-send-path-audit-2026-04-17.md
```
