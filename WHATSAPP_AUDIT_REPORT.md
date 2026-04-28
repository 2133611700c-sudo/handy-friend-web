# WhatsApp + Alex + Telegram — Hard Evidence Audit

**Date:** 2026-04-28
**Auditor:** Claude Sonnet 4.6 (read-only audit, no code changes)
**Scope:** Production state of WhatsApp Cloud API → Alex reply engine → Telegram approval → WhatsApp outbound

---

## 1. Executive summary

The technical chain is fully wired and proven in non-destructive probes:
inbound webhook ✅, HMAC fail-closed ✅, Alex WhatsApp engine returning safe English ✅,
safety validator blocking Cyrillic / banned phrases ✅, Telegram callback routed to the
shared handler ✅, idempotency in place ✅, Cloud API token live ✅. However, **no real
customer has yet received an outbound WhatsApp reply** — `whatsapp_messages` direction='out'
count is **0** for the last 24 hours despite **2** real inbounds. This is the single
remaining unproven link.

## 2. Current verdict

```
NOT READY (verdict only flips when an outbound wamid is captured AND the customer
confirms receipt of the WhatsApp message in their phone).
```

Two pending approvals exist (`telegram_sends.id=89, 92`) — when the owner taps ✅ on
either, production now has all the safeguards to send a safe English reply. The audit
cannot upgrade verdict to READY without that real outbound proof.

---

## 3. Evidence table by system link

| Link | Expected | Actual | Evidence | Status |
|---|---|---|---|---|
| Production deployment | latest fix live | `dpl_AaYyYiFZMeF5bKknh745gAwkezay` (commit `1a717a0e`, READY, aliases `handyandfriend.com` / `www.handyandfriend.com`) | Vercel API, `/api/health` 200 | OK |
| Health endpoint | 200 | 200 healthy iad1 production | `curl /api/health` | OK |
| Vercel env presence (no values) | all required | DEEPSEEK_API_KEY, FB_APP_SECRET, FB_VERIFY_TOKEN, META_PHONE_NUMBER_ID, META_WABA_ID, META_PHONE_TWO_STEP_PIN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN | `vercel env ls production` | OK |
| `META_SYSTEM_USER_TOKEN` | optional | NOT set, but cloud-api-client falls back to `WHATSAPP_ACCESS_TOKEN` | code line 17 of cloud-api-client.js | OK (intentional fallback) |
| Mac bridge | OFF | NOT RUNNING | `pgrep openclaw-wa-bridge` empty | OK |
| Phone object | CONNECTED LIVE | display=+1 213-361-1700 status=CONNECTED platform=CLOUD_API quality=GREEN mode=LIVE | Graph API | OK |
| WABA | APPROVED | name="Handy and Friend" account_review_status=APPROVED | Graph API | OK |
| Telegram bot webhook URL | `/api/telegram-webhook` | `https://handyandfriend.com/api/telegram-webhook` | `getWebhookInfo` | OK |
| Telegram bot allowed updates | message + callback_query | `['message', 'callback_query']` | `getWebhookInfo` | OK |
| Telegram bot last_error | none | last_error_date=None, pending_update_count=0 | `getWebhookInfo` | OK |
| `/api/alex-webhook` GET correct | 200 + challenge | 200 + `audit-ph6` | curl | OK |
| `/api/alex-webhook` GET wrong | 403 | 403 | curl | OK |
| WA POST valid HMAC | 200 | 200 + `EVENT_RECEIVED` | python signed POST | OK |
| WA POST bad HMAC | 403 | 403 | curl | OK |
| WA POST missing HMAC | 403 | 403 | curl | OK |
| Telegram callback at alex-webhook | routed → 200 with `{action, sid, result}` | 200 `{ok:true,action:"approve",sid:...,result:{ok:false,error:"short_id not found"}}` | curl synthetic non-destructive | OK |
| Telegram callback at telegram-webhook | routed → same shape | 200 same shape | curl | OK |
| `/api/whatsapp-webhook` rewrite | safe → alex-webhook | 200 + challenge | curl | OK |
| Inbound row stored | direction=in, body, phone | id=5 + id=6 in last 24h | Supabase REST | OK |
| Telegram approval row stored | source=whatsapp_approval | id=89 (EN draft after replacement) and id=92 (still RU draft in `extra`) | Supabase REST | PARTIAL |
| **Outbound row stored** | direction=out | **count=0** | Supabase REST | **MISSING** |
| **Customer received reply** | yes | **NO** (no outbound exists) | Supabase + owner statement | **MISSING** |
| Alex WA engine | English-only | Russian inbound "Привет" → English reply ("Hello! How can I help you with your handyman needs today?") | local `generateAlexWhatsAppReply` | OK |
| Alex service-specific intake | asks photos, scope, ZIP | TV/shelves → asks TV size, wall type, photo, ZIP; painting price → asks photos, sqft, prep, ZIP, timing | local | OK |
| Safety validator | blocks Cyrillic/banned/internal | flags fired correctly for `licensed`/`bonded`/`#1`/`Best in LA`/`worker rate`/Russian/empty/too_long | local | OK |
| Idempotency `alreadySentTo` | repeated ✅ → no duplicate | tested via 7-test unit suite | `tests/wa-approval-callback.test.js` | OK |
| Stale-draft block | Cyrillic stored draft → SAFE_FALLBACK in flight | tested via unit `approval callback blocks Cyrillic stored draft` | `tests/wa-alex-engine.test.js` | OK |
| Tests overall | 100% pass | 3034 / 3034 | `node tests/*.test.js` | OK |

---

## 4. Root causes confirmed during this run

### RC-1 — Telegram callback dropped at wrong endpoint (ALREADY FIXED in commit `d5c76d31`)
`/api/telegram-webhook` previously had `if (!message) return 200 ok` — Telegram sends
`callback_query` updates without a `message` field, so taps on ✅ silently 200ed and the
WhatsApp Cloud API send was never invoked. Fixed by extracting handler to
`lib/telegram/wa-approval-callback.js` and routing `wa:*` callback_query before the
early return.

### RC-2 — Alex prompt told Alex to match customer language (ALREADY FIXED in commit `3ac2e8c2`)
The website's `lib/alex-one-truth.js` instructs:
> "Match the customer's language (EN/RU/UK/ES) automatically. If customer writes in
> Russian, reply in Russian."

Correct for the multilingual landing chat. Wrong for WhatsApp where the LA business
must reply in English regardless of inbound language. Fixed by introducing
`lib/alex/whatsapp-reply-engine.js` with a WA-specific English-only system prompt and
a post-generation safety validator. Existing pending Russian draft for `short_id=89`
was rewritten in Supabase to `SAFE_FALLBACK`. The remaining Russian draft for
`short_id=92` will be replaced in flight by the safety validator when ✅ is tapped
(verified by unit test).

---

## 5. Confirmed working parts

- HMAC fail-closed enforcement on `/api/alex-webhook` for WhatsApp payloads.
- Telegram callback bypass of Meta HMAC.
- Vercel rewrite `/api/whatsapp-webhook` → `/api/alex-webhook`.
- Inbound `whatsapp_messages` row creation with UNIQUE wamid dedup.
- Lead creation from WhatsApp inbound (`source=whatsapp` → `lead_id`).
- Alex WhatsApp engine produces English replies for any inbound language.
- Service-specific intake guidance in Alex prompt.
- Post-generation validator catches Cyrillic, non-Latin script, banned claims, internal
  leak terms, empty, too long.
- Idempotency: 5-minute window check by `phone_number` prevents duplicate-tap re-sends.
- Stale-draft block: callback handler runs validator on stored draft and substitutes
  `SAFE_FALLBACK` if any safety flag fires.
- 3034 / 3034 tests pass.
- Mac bridge confirmed off — no parallel responder.
- Cloud API SYSTEM_USER token valid, non-expiring, scopes
  `whatsapp_business_messaging` + `whatsapp_business_management`.
- Phone CONNECTED LIVE GREEN; WABA APPROVED.

## 6. Broken / missing / unknown parts

| Item | Severity | Why |
|---|---|---|
| **Outbound row count = 0** | HIGH | No customer has yet received a reply. Verdict cannot upgrade until proven. |
| **Pending Russian draft in `telegram_sends.id=92.extra.alex_draft`** | MEDIUM | Validator will replace at send time, but the operator sees Russian text in Telegram message body. Confusing. Should be re-rendered from inbound text via the new engine. |
| Owner has not yet completed the live E2E | HIGH | Required to flip verdict. |
| No structured outbound failure alert path | MEDIUM | If Cloud API send fails after ✅, current code only logs to console. Owner should get a Telegram alert with the error. |
| No "missed lead" detector | MEDIUM | Inbound-with-no-outbound for >X minutes should alert the owner. The current bug would have stayed silent indefinitely. |
| `META_APP_SECRET` is also referenced (lib/whatsapp/signature-verify.js) | LOW | Code falls back to `FB_APP_SECRET`; works, but inconsistent naming. Pick one. |
| Existing branch `codex/telegram-contract-hardening` is ahead of `main` | LOW | `main` has all fixes; feature branch can be deleted. |
| `OWNER_DO_THIS.md`, `WHATSAPP_ACCEPTANCE_REPORT.md`, ops watchdog JSON files are untracked locally | LOW | Cosmetic — not in production. |

## 7. Security status

- HMAC fail-closed: PASS (3 production probes: valid 200, bad 403, missing 403).
- GET verify token: PASS (correct → 200 challenge, wrong → 403).
- Telegram callback bypass of Meta HMAC: PASS.
- Telegram bot has no `secret_token` set on the webhook URL — anyone with the URL could
  POST callback updates with arbitrary `wa:*` callback_query and trigger the handler.
  The handler is safe in practice: it requires a valid `short_id` that resolves to a
  pre-existing `telegram_sends.extra` row, and it will only send to the `wa_from` from
  that row. But adding a `TELEGRAM_WEBHOOK_SECRET` and validating
  `x-telegram-bot-api-secret-token` would be a defense-in-depth improvement.
- No secret values exposed in this report.

## 8. Alex quality status

- WhatsApp-specific module exists: `lib/alex/whatsapp-reply-engine.js`.
- WA system prompt is 1606 chars, includes English-only mandate, intake guidance,
  service-specific hints, and hard rules.
- Live test with real DeepSeek:
  - "Hi" → English intake question with photos/ZIP/scope ask.
  - "Привет" → English reply ("Hello! How can I help you with your handyman needs?").
  - "I need TV mounting and shelves" → asks TV size, wall type, shelves count, photos, ZIP.
  - "How much to paint exterior?" → asks photos, sqft, prep state, ZIP, timing (does
    not give a price).
  - Multi-service "Need TV mounted, drywall patch, shelves" → asks ZIP, photos per
    area, scope, TV size + wall type, drywall photos.
- Replies ≤ ~350 chars. Safe length for WhatsApp.
- Safety validator catches all 7 categories listed in the rules.
- `SAFE_FALLBACK` text passes its own validator and is English-only.
- Reasonable fallback: when DeepSeek fails, `callAlex` returns a static reply; that
  static reply is also English and passes the safety validator.

## 9. Supabase data integrity status

- Schema correct (`direction` IN ('in','out'), `phone_number` single column,
  UNIQUE wamid).
- Inbound dedup verified (UNIQUE constraint).
- Two real inbounds in last 24h, both saved correctly.
- Two `telegram_sends` rows (whatsapp_approval source) with `extra` containing
  short_id, wamid, wa_from, alex_draft, customer_message, customer_name.
- Lead created (1) with `source=whatsapp`, linked via `lead_events.event_type=whatsapp_inbound`.
- `lead_events.event_type` values seen: `whatsapp_inbound`, `whatsapp_approval_queued`,
  `telegram_sent`, `ai_chat_capture`, `sla_escalation_15`.
- **No `whatsapp_outbound_sent` lead_event** (logical — no outbound has fired yet).
- **No outbound row in `whatsapp_messages`**.

## 10. Telegram approval status

- Bot webhook URL: `/api/telegram-webhook` (correct now).
- `callback_query` is no longer dropped — confirmed by curl probe returning
  `{ok:true, action:"approve", sid:"...", result:{ok:false, error:"short_id not found"}}`.
- `wa:approve:<sid>` → resolves short_id → loads draft → safety validator → idempotency
  check → Cloud API send → record outbound → answer callback.
- callback_data length: 27 bytes (safely under 64-byte limit).
- Two real approvals pending: `id=89` (English draft) and `id=92` (Russian draft, will
  be substituted by SAFE_FALLBACK at send time).
- Idempotency in place but not yet exercised live.

## 11. WhatsApp outbound status

- **Zero outbound rows in last 24h.**
- Cloud API client: token valid, phone CONNECTED LIVE.
- The fix path is verified end-to-end in unit tests but **not yet proven by a real
  customer message**.

## 12. Live E2E status

- **Not yet completed.**
- Owner has not tapped ✅ on either pending approval since the fix was deployed.
- Customer (`+38066xxxx312`) is still waiting for a reply.

## 13. Risks ranked by severity

| # | Risk | Severity | Owner |
|---|---|---|---|
| 1 | No real outbound has been sent — entire chain unproven by a customer message | HIGH | Owner (1 tap) |
| 2 | Russian draft remains in `extra.alex_draft` for `id=92` (Telegram message body) — operator UX confusing even though customer reply is auto-corrected | MEDIUM | Eng |
| 3 | No automatic "missed lead" alert if inbound has no outbound after N minutes | MEDIUM | Eng |
| 4 | Cloud API send failure path only logs; no Telegram error to owner | MEDIUM | Eng |
| 5 | Telegram bot webhook lacks `secret_token` validation | LOW | Eng |
| 6 | `META_APP_SECRET` vs `FB_APP_SECRET` inconsistent naming across modules | LOW | Eng |
| 7 | No daily WhatsApp pipeline health check / dashboard | MEDIUM | Ops |
| 8 | Edit-flow (✏️) is "feature WIP" in code — not implemented | LOW | Eng |
| 9 | No SLA timer for owner approval delay | LOW | Eng |
| 10 | Hard-coded Russian content in test fixtures could leak as test traffic if real | LOW | Eng |

## 14. Required fixes before READY

For verdict **READY**, all of the following must be true (P0 must be done):

1. Owner taps ✅ on `id=92` (or sends a fresh WhatsApp message and approves the resulting
   approval). Production sends a safe English reply via Cloud API.
2. `whatsapp_messages` direction=out gains a row with a real wamid, status=sent,
   approved_by populated.
3. Customer (`+380…312`) confirms WhatsApp reply was received on their phone.
4. Duplicate ✅ tap test (or evidence of `alreadySentTo` block) confirms no duplicate
   outbound.
5. Final report committed and pushed.

P1+ items are not blockers for READY but materially reduce future incident risk.
