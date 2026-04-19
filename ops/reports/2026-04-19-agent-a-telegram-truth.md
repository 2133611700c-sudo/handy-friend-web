# Agent A Session Report — Telegram Truth + Audit Gate
Date: 2026-04-19
Branch: `codex/telegram-truth-unify-20260419`

## Goal
Close Agent A scope for:
- Task 1.5: migrate runtime Telegram outbound sends to `lib/telegram/send.js`
- Task 1.7: harden `scripts/audit.sh` with delivery-evidence gate
- Task 1.6: keep `/api/notify` fail-closed and document exact manual enablement

## Facts (verified this session)

### 1) Raw Telegram runtime paths removed from target files
Edited files:
- `api/ai-chat.js`
- `api/ai-intake.js`
- `api/alex-webhook.js`
- `api/process-outbox.js`
- `lib/lead-pipeline.js`
- `lib/telegram/send.js`

Static evidence:
```bash
rg -n "https://api\.telegram\.org" api lib
```
Output now shows only:
- `api/telegram-webhook.js` (inbound bot reply handler)
- `api/health.js` (`getWebhookInfo` check)
- `lib/telegram/send.js` (the unified sender itself)

No raw outbound Telegram calls remain in the 5 Task-1.5 target paths.

### 2) Unified sender upgraded for data URLs in photos
`lib/telegram/send.js` now supports:
- JSON sendPhoto for URL/file_id photo
- multipart sendPhoto for `data:image/...;base64,...`

This preserves old behavior from chat/intake photo flows while keeping durable `telegram_sends` logging.

### 3) Audit gate hardened (delivery evidence)
Edited file:
- `scripts/audit.sh`

New logic:
- Parses outbox payload for delivery evidence (`sent_1h` + metrics sent/failed counters).
- `main` run: FAIL when delivery evidence is missing or shows failed-only.
- `pull_request` run: WARN (no greenwash by PASSing silently).

Validation output:
```bash
GITHUB_EVENT_NAME=pull_request bash scripts/audit.sh --skip-stats
```
Contains:
- `[WARN] outbox delivery evidence missing (sent=0 failed=0)`

```bash
bash scripts/audit.sh --skip-stats
```
Contains:
- `[FAIL] outbox delivery evidence missing (sent=0 failed=0)`

### 4) `/api/notify` fail-closed confirmed live
Live checks:
```bash
curl -X POST https://handyandfriend.com/api/notify ...
curl -X POST https://handyandfriend.com/api/notify -H 'X-HF-Notify-Secret: wrong' ...
```
Both returned:
```json
{"success":false,"error":"notify_disabled"}
```

Manual enablement runbook created:
- `docs/runbook-notify-secret.md`

## Unknowns / External blockers
- Full SQL proof for each Task-1.5 path requires controlled triggers per path against prod and service-role DB access in this session.
- `/api/notify` remains `BLOCKED_EXTERNAL` until owner sets `HF_NOTIFY_SECRET` in Vercel.

## Risks
- After merging this branch, `audit.sh` on main will continue to fail until at least one real outbox send is observed in window.
- This is intentional strictness, not a false failure.

## Next action
1. Trigger controlled per-path sends for the 5 runtime paths and collect SQL rows from `telegram_sends`.
2. Set `HF_NOTIFY_SECRET` in Vercel and run the three-curl verification from runbook.
3. Merge once owner accepts strict gate behavior.
