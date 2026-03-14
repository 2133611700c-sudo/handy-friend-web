# Stage A Stabilization Report — 2026-03-13

## Scope
Production stability hardening for Handy & Friend:
1. Prevent wrong Vercel project usage.
2. Restore AI chat lead pipeline (no legacy fallback leakage).
3. Ensure Telegram delivery is reflected in `lead_events`.
4. Re-verify production readiness gates.

## Changes Applied

### 1) Vercel project safety guard
- Commit: `fd135ad`
- Added guard script and wired it into release/validation workflow.
- Files:
  - `scripts/vercel-project-guard.sh`
  - `package.json`
  - `RELEASE_RUNBOOK.md`
  - `BOOTSTRAP.md`
  - `VALIDATION_CHECKLIST.md`

Result:
- `npm run vercel:guard` passes.
- Vercel inventory remains exactly two projects (`handy-friend-landing-v6`, `messenginfo`).

### 2) AI chat pipeline recovery (root cause fix)
- Commit: `2ea25a7`
- Root cause: `createLead()` referenced `attribution` without passing it in args, triggering fallback path.
- Fix: pass attribution explicitly through both createLead call sites.
- File:
  - `api/ai-chat.js`

Before:
- `leadId` emitted as `chat_*` fallback IDs.
- no stage transition, no event trail.

After:
- `leadId` emitted as canonical `lead_*`.
- stage moves to `contacted`.
- `ai_chat_capture` + `stage_change` recorded.

### 3) Telegram observability + serverless completion
- Commit: `ec25276`
- Added `telegram_sent/telegram_failed` event logging from strict sales card flow.
- Changed strict sales card execution to awaited best-effort (`Promise.race` with timeout) before response return.
- File:
  - `api/ai-chat.js`

Result:
- Telegram events now appear in `lead_events` for captured chat leads.

### 4) CI guard propagation
- Commit: `3843d10`
- Added canonical Vercel guard step to all relevant workflows:
  - `.github/workflows/validate.yml`
  - `.github/workflows/nightly-health.yml`
  - `.github/workflows/daily-report.yml`
  - `.github/workflows/live-close-sheet.yml`
  - `.github/workflows/sla-escalation.yml`

## Production Verification

### Deployment state
- Production alias now points to latest deploy after fixes:
  - `dpl_Ez4pPULhP6BxyKf94HEQQNJgyXCA`
- Domain aliases:
  - `https://handyandfriend.com`
  - `https://www.handyandfriend.com`

### Readiness audit
- Command: `bash scripts/audit.sh --allow-dirty`
- Result: `PASS 42 / FAIL 0`

### E2E pipeline checks (AI chat path)
Controlled QA sessions executed against production with immediate DB verification.

Latest final check:
- `chatStatus=200`
- `leadCaptured=true`
- `leadId=lead_1773448769118_y9lo24` (canonical, not fallback)
- `stage=contacted`
- `lead_events` include:
  - `ai_chat_capture`
  - `stage_change`
  - `telegram_sent`

QA leads were post-marked `is_test=true` to avoid KPI contamination.

## Residual Risks
1. Local repo contains a large legacy `untracked` backlog (docs/assets/migrations); this is operational noise and can cause accidental commits if not controlled.
2. Full readiness audit without `--allow-dirty` still fails locally because of that backlog (not production logic failure).
3. QA lead classification still depends on explicit marking; recommend deterministic auto-flag by `session_id` prefix (`qa_`, `test_`) in pipeline code.

## Next Step (Stage B)
1. Lead rescue & stale lead reactivation runbook execution (24h).
2. Review-request push cadence (3/day) with response tracking.
3. Jobs-to-leads linking completeness check and remediation SQL if needed.
