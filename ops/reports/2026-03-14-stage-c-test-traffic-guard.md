# Stage C Test-Traffic Guard Report — 2026-03-14

## Scope
Prevent QA/chat validation traffic from polluting production lead metrics.

## Changes Applied
- `api/ai-chat.js`
  - Added test-traffic detector (`isLikelyTestTraffic`) based on session-id prefixes and attribution markers.
  - Passed `is_test` into lead creation for both primary and fallback capture paths.
  - Added `is_test` marker into `ai_chat_capture` event payload.
  - Legacy fallback insert now sets `is_test` and stores `is_test_signal` in `source_details`.
- `lib/lead-pipeline.js`
  - Extended `createOrMergeLead` to accept optional `is_test` and include it on new lead insert.
  - Hardened `postLeadWithSchemaFallback` to safely drop unknown fields (`source_details`, `is_test`) if schema mismatch occurs.

## Deployment
- Commit: `b2d4695`
- Production deploy: `dpl_EmtPrzodxvQQfV6TQynhtjmrZjA5`
- Aliases: `handyandfriend.com`, `www.handyandfriend.com`

## Production Validation
### 1) QA session auto-flag
Request:
- `sessionId=qa_auto_test_20260314_03`
- phone: `310-444-2223` (non-555)

Result in `leads`:
- `id=lead_1773450231090_aqx3vy`
- `session_id=qa_auto_test_20260314_03`
- `is_test=true` ✅

### 2) Cleanup of pre-fix validation residue
- Lead `lead_1773450175576_fl6lxw` (created before deploy) was manually reclassified:
  - `is_test=true`
  - `test_reason=qa_session_manual`
  - `test_actor=codex_validation`

## Outcome
- New QA/test chat sessions are now auto-isolated from production KPI contours.
- No schema-risk regression introduced (fallback remains backward-safe).
