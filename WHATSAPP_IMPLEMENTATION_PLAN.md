# WhatsApp + Alex + Telegram — Implementation Plan

**Date:** 2026-04-28
**Author:** Claude Sonnet 4.6
**Companion:** `WHATSAPP_AUDIT_REPORT.md`
**Status:** Plan only — no code changes will be made until owner explicitly says
**"Proceed with P0 implementation."**

---

## P0 — must fix before production READY

### P0-1 — Live E2E: customer must actually receive a WhatsApp reply
- **Priority:** Highest
- **Owner:** Owner (1 tap) + Eng (capture evidence)
- **Files/modules:** none (no code change — exercise existing pipeline)
- **Action:**
  1. Owner taps ✅ on the pending Telegram approval `telegram_sends.id=92` (or sends a
     fresh inbound and approves the resulting message).
  2. Eng watcher captures: outbound wamid, Cloud API HTTP status, `whatsapp_messages.direction='out'` row.
  3. Owner pastes screenshot from customer's phone confirming receipt.
- **Acceptance proof:**
  - `select count(*) from whatsapp_messages where direction='out' and phone_number='380665638312' and created_at > now() - interval '1 hour';` returns **1**.
  - That row's `wamid` is non-null and `status` ∈ {sent, delivered, read}.
  - Owner confirmation: "received" + screenshot.
- **Risk if not done:** Verdict cannot upgrade from NOT READY. Customer was lost.

### P0-2 — Regenerate the Russian draft for `telegram_sends.id=92`
- **Priority:** High
- **Owner:** Eng
- **Files/modules:** new one-off `scripts/regen-stuck-drafts.mjs` or extend
  `scripts/post-migration-update.sh`. No webhook code change.
- **Action:** for each `telegram_sends` row where `source='whatsapp_approval'` and
  `extra->>alex_draft` contains Cyrillic, re-call
  `generateAlexWhatsAppReply({ inboundText: extra.customer_message, customerPhone: extra.wa_from })`
  and write back the new `alex_draft` plus a `regenerated_at` timestamp.
- **Acceptance proof:**
  - After running the script, the `extra.alex_draft` for `id=92` is English and passes
    `detectSafetyFlags` with empty array.
  - The replaced field is timestamped for audit.
- **Risk if not done:** Operator sees Russian text in the Telegram message body even
  though the safety validator will substitute SAFE_FALLBACK at send time. Confusing UX
  but customer-facing reply is still safe.

### P0-3 — Telegram operator gets the corrected draft on resend, not the old message
- **Priority:** Medium
- **Owner:** Eng
- **Files/modules:** `lib/telegram/approval.js`, `api/alex-webhook.js`
- **Action:** when P0-2 regenerates a stale draft, also `editMessageText` on the
  Telegram message to show the new English draft (so the operator approves the actual
  text being sent). If `editMessageText` fails (older than 48h), send a NEW approval
  message and mark the old one as superseded in `extra.superseded_by`.
- **Acceptance proof:** unit test mocks `editMessageText` and asserts new draft is
  pushed; otherwise a new approval row is created with `extra.superseded_by` set.
- **Risk if not done:** Operator reads Russian, taps ✅, customer gets English. Visible
  inconsistency between operator preview and real send.

---

## P1 — Reliability hardening

### P1-1 — Cloud API send failure must alert the owner
- **Files:** `lib/telegram/wa-approval-callback.js`, `lib/telegram/send.js`
- **Action:** if `cloudApi.sendTextMessage` throws inside the approve branch, in
  addition to current console.error and `answerCallbackQuery` alert, send a high-priority
  Telegram message to `TELEGRAM_CHAT_ID` containing inbound wamid, customer phone (last
  4 digits), and the Cloud API error code/subcode/message.
- **Acceptance:** unit test for failure path produces a Telegram alert call with the
  exact incident shape.

### P1-2 — Missed-lead detector
- **Files:** new `scripts/missed-lead-watchdog.mjs` + GH Actions cron
- **Action:** every 5 minutes, query: any inbound row with `direction='in'` and
  `created_at > now() - interval '60 minutes'` AND no matching outbound (by
  `phone_number` within ±60 min). For each, send a Telegram alert to owner.
- **Acceptance:** synthetic inbound row without outbound triggers exactly one
  Telegram alert; second cron pass does not re-alert (idempotency by inbound wamid in
  a `lead_events.event_type='missed_lead_alert'` row).

### P1-3 — Outbound delivery status tracking
- **Files:** `api/alex-webhook.js` (already routes `value.statuses`), `lib/whatsapp/dedup.js`
- **Action:** confirm Meta status callbacks (`sent`, `delivered`, `read`, `failed`) are
  updating `whatsapp_messages.status` and timestamps via `dedup.updateStatus`. If the
  `failed` status arrives, send a Telegram alert to owner.
- **Acceptance:** integration test with mock status callback for `failed` produces
  alert; row's `failed_reason` is populated.

### P1-4 — Idempotency by inbound wamid (stronger than 5-min phone window)
- **Files:** `lib/telegram/wa-approval-callback.js`
- **Action:** in addition to `alreadySentTo(toPhone, 5min)`, also check whether an
  outbound row already exists where `body == replyText` and
  `created_at > inbound.created_at`. If so, treat as idempotent. Even better: store
  `in_reply_to_wamid` in `whatsapp_messages` for outbound rows so the lookup is exact.
- **Acceptance:** unit test with same inbound wamid + two ✅ taps produces exactly one
  outbound; the second returns `idempotent:true` with the prior wamid.

### P1-5 — Telegram webhook secret token
- **Files:** `api/telegram-webhook.js` (already references `TG_SECRET`)
- **Action:** set `TELEGRAM_WEBHOOK_SECRET` env var; configure bot webhook with
  `?secret_token=<value>`. Defense-in-depth so anyone with the public URL can't trigger
  the WA approval handler.
- **Acceptance:** smoke probe with no `x-telegram-bot-api-secret-token` header → 403;
  with correct token → 200.

### P1-6 — Pipeline health endpoint
- **Files:** new `api/wa-health.js`
- **Action:** internal endpoint that returns `{
    last_inbound_at, last_outbound_at, inbound_24h, outbound_24h, missed_leads_now,
    cloud_api_phone_status, telegram_webhook_set
  }`. Can be polled by uptime monitor.
- **Acceptance:** `GET /api/wa-health` returns valid JSON with all fields populated.

---

## P2 — Product quality

### P2-1 — Service-specific Alex prompts
- **Files:** `lib/alex/whatsapp-reply-engine.js`
- **Action:** detect intent from inbound (`tv_mount`, `painting`, `flooring`,
  `furniture_assembly`, `drywall`, `cabinet`, `electrical`, `plumbing`, `vague`) using
  keywords + few-shot. Inject service-specific intake checklist into the system prompt.
- **Acceptance:** unit tests for each intent produce the expected required-fields list.

### P2-2 — Photo request flow
- **Files:** `lib/alex/whatsapp-reply-engine.js`, `api/alex-webhook.js`
- **Action:** when inbound type is `image` (Cloud API media), download via Graph API,
  store in Supabase Storage, and feed image URL to Alex (or summarize before approval).
- **Acceptance:** customer sends a photo; Telegram approval includes a thumbnail link;
  outbound reply acknowledges the photo.

### P2-3 — Quote/scheduling intake
- **Files:** `lib/alex/whatsapp-reply-engine.js`
- **Action:** add structured slot-filling: track which of {photos, scope, ZIP, timing}
  are already provided across the conversation history and only ask for the missing
  ones. Acknowledge what's already given.
- **Acceptance:** synthetic 3-turn conversation completes intake in ≤3 customer turns
  (testable as deterministic fixtures).

### P2-4 — Edit (✏️) flow
- **Files:** `lib/telegram/wa-approval-callback.js`
- **Action:** currently returns "feature WIP". Implement: on ✏️, send Telegram prompt
  asking owner to reply with new text via reply-to. Resolve via `force_reply` and a
  short-lived state row. Then validate + send.
- **Acceptance:** integration test simulates the reply-to update and asserts the
  edited text is sent (after passing safety validator).

### P2-5 — Canned safe replies
- **Files:** `lib/alex/canned-replies.js`
- **Action:** for "vague hi", "weekend", "after hours", "out of service area", provide
  approved canned English replies that bypass the model entirely.
- **Acceptance:** vague inbound returns canned reply with `source='canned'` in
  generation result.

### P2-6 — Service-area gate
- **Files:** `lib/alex/whatsapp-reply-engine.js`
- **Action:** if customer's ZIP is outside Greater LA, switch reply to a polite "we
  don't serve that area, here are referrals" template.
- **Acceptance:** test inbound with ZIP=10001 (NYC) returns the out-of-area template.

---

## P3 — Monitoring / Ops

### P3-1 — Daily WhatsApp pipeline health digest
- **Files:** `scripts/wa-daily-digest.mjs` + GH Actions cron 7am PT
- **Action:** Telegram digest with: `inbound_24h, outbound_24h, average_response_time,
  failed_sends, missed_leads, model_fallback_rate, top_intents`.
- **Acceptance:** Telegram message arrives daily; row in `lead_events` for audit.

### P3-2 — Stale-approval alert
- **Files:** `scripts/wa-stale-approval-watchdog.mjs`
- **Action:** if a `telegram_sends.source='whatsapp_approval'` row has no matching
  outbound and `created_at < now() - 30 minutes`, send owner an "approval still
  pending" reminder.
- **Acceptance:** synthetic stale row triggers exactly one reminder per 30-min window.

### P3-3 — Duplicate-send detector
- **Files:** invariant view in Supabase + cron
- **Action:** SQL view `v_wa_duplicate_outbound` that detects 2+ outbound rows with
  same `phone_number` within 1 minute. Cron alerts owner if any rows present.
- **Acceptance:** synthetic double-row triggers alert; clean state produces no alert.

### P3-4 — SLA timer
- **Files:** existing SLA framework (`scripts/sla-check.mjs` already present)
- **Action:** add WhatsApp-channel SLA: `inbound → outbound` ≤ 15 minutes during
  business hours. Counts toward `lead_events.event_type='sla_escalation_15'`.
- **Acceptance:** existing SLA infra picks up new channel rule.

### P3-5 — Weekly audit report
- **Files:** `scripts/wa-weekly-audit.mjs`
- **Action:** weekly markdown report: total leads, conversion to outbound, average
  Alex draft length, fallback rate, top customer intents, broken links.
- **Acceptance:** Monday email/Telegram with the weekly numbers.

### P3-6 — Production env drift alert
- **Files:** `scripts/env-drift-watchdog.mjs`
- **Action:** daily comparison of expected env-var-name set vs actual; alert if any
  required key disappears or new unexpected keys appear.

---

## Files that will be created or changed by this plan (P0+P1+P2+P3)

| Phase | File | Action |
|---|---|---|
| P0-2 | `scripts/regen-stuck-drafts.mjs` | NEW |
| P0-3 | `lib/telegram/approval.js` | EDIT — `editMessageText` after regeneration |
| P1-1 | `lib/telegram/wa-approval-callback.js` | EDIT — owner alert on Cloud API failure |
| P1-2 | `scripts/missed-lead-watchdog.mjs` + `.github/workflows/missed-lead.yml` | NEW |
| P1-3 | `lib/whatsapp/dedup.js`, `api/alex-webhook.js` | EDIT — failed status alert |
| P1-4 | `lib/whatsapp/dedup.js`, `lib/telegram/wa-approval-callback.js`, migration adding `in_reply_to_wamid` | EDIT |
| P1-5 | `api/telegram-webhook.js`, env var | EDIT |
| P1-6 | `api/wa-health.js` | NEW |
| P2-1 | `lib/alex/whatsapp-reply-engine.js`, `lib/alex/intent-classifier.js` | EDIT/NEW |
| P2-2 | `lib/alex/whatsapp-reply-engine.js`, `api/alex-webhook.js` | EDIT |
| P2-3 | `lib/alex/whatsapp-reply-engine.js`, `lib/alex/intake-state.js` | EDIT/NEW |
| P2-4 | `lib/telegram/wa-approval-callback.js` | EDIT |
| P2-5 | `lib/alex/canned-replies.js` | NEW |
| P2-6 | `lib/alex/whatsapp-reply-engine.js` | EDIT |
| P3-1 | `scripts/wa-daily-digest.mjs` + workflow | NEW |
| P3-2 | `scripts/wa-stale-approval-watchdog.mjs` + workflow | NEW |
| P3-3 | Supabase migration + cron | NEW |
| P3-4 | reuse existing SLA infra | EDIT |
| P3-5 | `scripts/wa-weekly-audit.mjs` + workflow | NEW |
| P3-6 | `scripts/env-drift-watchdog.mjs` + workflow | NEW |

## Deployment + rollback

- All P0/P1 fixes are routed through GitHub → Vercel auto-deploy on `main`.
- Rollback: `vercel rollback <prior-deploy-id>` aliases the prior production back to
  `handyandfriend.com`. Last 4 deploys recorded in `WHATSAPP_AUDIT_REPORT.md`:
  - `dpl_AaYyYiFZMeF5bKknh745gAwkezay` (current, commit `1a717a0e`)
  - `dpl_6hzUfbEGCNqvgBaR9BMqgimeYQ12` (commit `3ac2e8c2`, fully working pre-docs)
  - `dpl_2XmiwbxtE2ArL7grWXETzVBhP4j1` (commit `d5c76d31`, callback routing fix only)
  - `dpl_3FecwzysCWEqt6pTEUS2yXCHcbGb` (commit `289e8be2`, pre-engine fix)
  Clean rollback target: `dpl_6hzUfbEGCNqvgBaR9BMqgimeYQ12`.

---

## How to authorize implementation

When ready, reply with one of:

- `Proceed with P0 implementation.` → I will implement P0-1, P0-2, P0-3 and confirm
  evidence.
- `Proceed with P0 + P1.` → I will implement all reliability items.
- `Proceed with P0 + P1 + P2.` → full quality work.
- `Implement only X.Y` → for selective items (e.g. `Implement only P0-2`).

I will not touch code until that explicit authorization arrives.
