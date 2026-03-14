# Stage B Autopilot Report — 2026-03-14

## Scope
Production execution and hardening of Sprint Autopilot follow-up logic:
1. Dynamic stale/open lead reactivation target selection.
2. Cooldown-safe reactivation + follow-up mode support.
3. Review flow split into `fresh` and `followup` packets.
4. Live production run and DB event verification.

## Code Changes
- Updated: `scripts/sprint1-autopilot.mjs`

### What changed
- Replaced single hardcoded stale lead logic with dynamic ranking across open non-test leads.
- Added service-aware message generation (`getServiceMeta`, `buildReactivationText`).
- Added reactivation cooldown guard (`REACTIVATION_COOLDOWN_HOURS=6`).
- Added review follow-up targeting (`REVIEW_FOLLOWUP_DAYS=3`).
- Added event diagnostics fields in summary (`targets_fresh`, `targets_followup`, `mode`).
- Added event types:
  - `reactivation_followup_prepared`
  - `review_followup_prepared`
- Fixed reactivation summary mode computation for cooldown path (no incorrect mode labeling).

## Validation
### Static checks
- `node --check scripts/sprint1-autopilot.mjs` -> PASS
- `npm run -s vercel:guard` -> PASS
- `bash scripts/audit.sh --allow-dirty` -> PASS (`42/42`)

### Live run
Command:
```bash
set -a; source .env.production.local; set +a
node scripts/sprint1-autopilot.mjs
```

Observed output:
```json
{
  "reactivation": {
    "found": true,
    "lead_id": "chat_1772464815694_cxe3l",
    "mode": "followup",
    "telegram_sent": true,
    "event_logged": true
  },
  "reviews": {
    "targets_fresh": 0,
    "targets_followup": 0,
    "events_logged": 0,
    "errors": []
  }
}
```

Cooldown verification rerun:
```bash
node scripts/sprint1-autopilot.mjs
```
- Output contained: `Reactivation cooldown active ... skipping`
- Summary: `skipped: cooldown_5h`, no duplicate packet/event.

### DB evidence
Verified in `lead_events` for `chat_1772464815694_cxe3l`:
- `reactivation_followup_prepared` at `2026-03-14T00:55:32.624684+00:00`
- previous `reactivation_attempt_prepared` exists (`2026-03-11T22:55:14.493914+00:00`)

## Operational Result
- Reactivation packet was delivered to Telegram and logged in production.
- No new review packets were required at this run (no eligible fresh/follow-up closed-won leads).
- Production readiness remains green after change set.

## Remaining manual work
1. Open WhatsApp deeplink from Telegram packet and send follow-up to the stale lead.
2. When new jobs close, rerun autopilot to emit fresh review packets.
