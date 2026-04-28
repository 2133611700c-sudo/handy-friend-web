# WhatsApp Cloud API + Alex + Telegram Approval — Acceptance Report

**Date:** 2026-04-28
**Engineer:** Claude Sonnet 4.6 (incident commander after live failure)
**Final verdict:** READY WITH RISK — single owner action remaining

---

## 1. Executive Summary

A real production failure was hit during live E2E: customer "Привет" message reached
production, was logged, and produced a Telegram approval message — but tapping ✅
sent **nothing** to the customer because two independent bugs in the chain.

Both root causes were identified, fixed, tested (3034/3034), deployed to production,
and verified by behavior probe. The corrected English draft has been written to the
existing pending approval. The owner taps ✅ once on the existing Telegram message
to send the safe English fallback to the customer and capture the outbound wamid.

---

## 2. Root cause #1 — Telegram callback dropped at wrong endpoint

**Symptom:** owner taps ✅, no WhatsApp reply ever sends.

**Cause:** the Telegram bot webhook URL is `/api/telegram-webhook` (set via `setWebhook`),
not `/api/alex-webhook`. The wa-approval handler `handleTelegramUpdate` lived only in
`/api/alex-webhook`. `/api/telegram-webhook` had a hard early return:

```js
const message = update.message || update.edited_message;
if (!message) return res.status(200).json({ ok: true }); // ← drops callback_query
```

`callback_query` updates have no `.message` field → silently 200 → handler never reached
→ `cloudApi.sendTextMessage` never called → no outbound row → customer gets nothing.

**Fix (commit `d5c76d31`):**
- Extracted handler to `lib/telegram/wa-approval-callback.js` (shared module).
- `/api/telegram-webhook` now detects `wa:*` callback_query and delegates BEFORE the
  `!message` early return.
- `/api/alex-webhook` also delegates to the same shared module.
- Idempotency: `alreadySentTo()` blocks repeated ✅ taps from sending duplicate replies
  within 5 minutes.
- 7 new tests cover callback routing, idempotency, fallback, and regression of the
  "callback_query dropped as non-message" bug.

---

## 3. Root cause #2 — Alex prompt told Russia to reply in Russian

**Symptom:** even after callback routing was fixed, the stored draft was Russian
("Привет! Рад знакомству! Расскажите…") for a US business that requires English replies.

**Cause:** `lib/alex-one-truth.js` is the website's multilingual chat prompt:

```
- Match the customer's language (EN/RU/UK/ES) automatically
- If customer writes in Russian, reply in Russian. Same for Ukrainian, Spanish.
```

That is correct for the multilingual landing chat. It is wrong for WhatsApp where the
business serves Los Angeles and the owner mandates English-only customer-facing replies
regardless of inbound language. The same prompt was being passed into the WA path:

```js
const guardMode = getGuardMode({ hasContact, hasPhone });
const systemPrompt = buildSystemPrompt({ guardMode });   // ← multilingual
const alexResult = await callAlex(messages, systemPrompt);
```

**Fix (commit `3ac2e8c2`):**
- New module `lib/alex/whatsapp-reply-engine.js` exporting
  `generateAlexWhatsAppReply({ inboundText, customerPhone, conversationHistory })`.
- WA system prompt enforces:
  - "Reply ONLY in English. Never in Russian, Ukrainian, Spanish, or any other
    language, even if the customer wrote in those."
  - Intake guidance: ask for photos, scope, ZIP code, preferred timing.
  - Service-specific hints (TV mounting / painting / drywall / etc.).
  - Hard rules: no `licensed`, `bonded`, `certified`, `#1`, `best in LA`. No internal
    margin / worker rate / cost-of-goods leakage.
- Post-generation safety validator `detectSafetyFlags(text)` returns flags for:
  `cyrillic`, `non_latin_script`, `banned_phrase`, `internal_leak`, `empty`, `too_long`.
- If any flag fires, the engine emits `SAFE_FALLBACK` (English) and reports the reason.
- Output contract:
  ```
  { ok, replyText, source: 'model'|'fallback', model, reason, safetyFlags, needsOwnerApproval }
  ```
- The approval callback handler now also runs `detectSafetyFlags(stored draft)` BEFORE
  sending. If flags fire, the stored draft is replaced in-flight with `SAFE_FALLBACK`
  and the Telegram alert says: "⚠️ Draft blocked (<flags>). Sent SAFE_FALLBACK instead".
- The pending failed-lead draft (`telegram_sends.id=89`, `short_id=89830bbb8be738c3`)
  was rewritten in Supabase from Russian to `SAFE_FALLBACK` so the owner's existing
  Telegram approval can now safely fire.

---

## 4. Files changed

| File | Change |
|---|---|
| `lib/alex/whatsapp-reply-engine.js` | NEW — WA-specific Alex engine + safety validator |
| `lib/telegram/wa-approval-callback.js` | NEW — shared handler with idempotency + fail-safe |
| `tests/wa-alex-engine.test.js` | NEW — 13 tests (Cyrillic/banned/empty/fallback/handler) |
| `tests/wa-approval-callback.test.js` | NEW — 7 tests (routing/idempotency/fallback) |
| `api/alex-webhook.js` | wired engine; delegates callbacks to shared handler |
| `api/telegram-webhook.js` | routes `wa:*` callback_query to shared handler |

---

## 5. Test results

```
node tests/<file>.test.js
```

| File | Pass / Total |
|---|---|
| whatsapp-webhook | 14 / 14 |
| whatsapp-cloud | 8 / 8 |
| whatsapp-owner-alert | 1 / 1 |
| telegram-proof | 11 / 11 |
| outbox-fixes | 13 / 13 |
| pricing-policy | 2956 / 2956 |
| ads-attribution | 11 / 11 |
| **wa-approval-callback (new)** | **7 / 7** |
| **wa-alex-engine (new)** | **13 / 13** |
| **TOTAL** | **3034 / 3034** |

---

## 6. Production deployment

| Item | Value |
|---|---|
| Latest deploy | `dpl_6hzUfbEGCNqvgBaR9BMqgimeYQ12` (READY, target=production) |
| Commit | `3ac2e8c272eab4a15c061146ddd3ff50dd1d3641` |
| Aliases | `handyandfriend.com`, `www.handyandfriend.com` |
| Region | `iad1` |
| Health | `{"ok":true,"status":"healthy","env":"production"}` |
| Behavior probe | `POST /api/telegram-webhook` with `wa:approve:` returns `{"action":"approve"}` ✅ |
| HMAC fail-closed | unchanged (proven 6/6 in earlier deploy `dpl_3FecwzysCWEqt6pTEUS2yXCHcbGb`) |
| Mac bridge | NOT RUNNING |
| `/api/whatsapp-webhook` | safe Vercel rewrite to `/api/alex-webhook` |

---

## 7. Live failed lead — evidence

| Field | Value |
|---|---|
| inbound wamid | `wamid.HBgMMzgwNjY1NjM4MzEyFQIAEhgUM0FBRUU5RkQwNDI3MTJEQTQ0NzUA` |
| inbound timestamp | `2026-04-28T03:25:35.928Z` |
| customer phone (masked) | `+38066xxxx312` |
| customer name | Сергей |
| inbound body | `Привет` |
| Supabase `whatsapp_messages.id` | `5` (direction=in, status=received) |
| created lead | `lead_1777346734562_awn5fh` (source=whatsapp) |
| `lead_events` | `whatsapp_inbound` linked to lead |
| `telegram_sends.id` | `89`, source=`whatsapp_approval`, ok=true |
| short_id | `89830bbb8be738c3` |
| callback_data | `wa:approve:89830bbb8be738c3` = 27 bytes (under 64) |
| OLD draft | Russian ("Привет! Рад знакомству!…") — REPLACED 2026-04-28T03:35Z |
| NEW draft | `SAFE_FALLBACK` English text — written via `/tmp/regen-stale-draft.py` |
| `extra.alex_draft_replaced_reason` | `stale_russian_draft_replaced_by_english_fallback` |
| outbound wamid | **PENDING** owner ✅ tap |
| customer received reply | **PENDING** |

---

## 8. Telegram evidence

- `telegram_sends.id=89` — approval message was delivered (`ok=true`).
- `extra.short_id=89830bbb8be738c3` resolves to inbound wamid above via Supabase lookup.
- `callback_data=wa:approve:89830bbb8be738c3` is 27 bytes (under Telegram's 64-byte limit).
- Approval message is still in the owner's Telegram chat — it is the same message, no
  duplicate alert was generated. The stored draft inside it now points to `SAFE_FALLBACK`.

---

## 9. Outbound WhatsApp evidence

**Status:** PENDING — depends on owner tapping ✅ on the existing Telegram approval.

When the owner taps ✅:
1. Telegram → POST `/api/telegram-webhook` → `isWAApprovalCallback` matches `wa:approve:`.
2. Shared handler resolves `short_id=89830bbb8be738c3` → loads stored draft (now English).
3. Safety validator passes (English, no banned phrases).
4. Idempotency check: no outbound to `380665638312` in last 5 min → proceed.
5. Cloud API `POST /v19.0/1085039581359097/messages` with English text.
6. Outbound wamid stored in `whatsapp_messages` (direction=out, approved_by=owner).
7. Telegram answerCallbackQuery → "✅ Sent (wamid…)".

Watcher `bdzilskf2` is polling Supabase for the outbound row.

---

## 10. Old bridge / old endpoint status

- Mac bridge: NOT RUNNING (`pgrep openclaw-wa-bridge` empty).
- `/api/whatsapp-webhook`: Vercel rewrite to `/api/alex-webhook`. Same handler, safe.

---

## 11. Remaining risks

| Risk | Severity | Mitigation |
|---|---|---|
| Owner has not yet tapped ✅ on the existing Telegram approval | HIGH | Single click required; corrected draft is in place |
| Customer first reply is the generic SAFE_FALLBACK (not service-specific) | LOW | The customer wrote only "Привет" with no service hint — the engine cannot infer scope. Future inbound with specifics will produce contextual English replies. |
| Telegram bot webhook URL is hard-coded to `/api/telegram-webhook` | LOW | Both endpoints now route `wa:*` callback to the same shared handler |
| Auto-reply mode is OFF | by-design | All WA replies require owner ✅. Can be enabled later by setting `needsOwnerApproval=false` in the engine. |

---

## 12. Final verdict

```
READY WITH RISK
```

All technical fixes are deployed and tested. The system will send a correct English
reply the moment the owner taps ✅ on the existing Telegram approval message — proven
by the safety validator unit tests and the fact that the stored draft in Supabase has
been verified to start with "Hi! Thanks for reaching out…" (English).

Verdict will flip to **READY** when:
1. Owner taps ✅ on the pending Telegram approval message.
2. Outbound row appears in `whatsapp_messages` direction='out'.
3. Customer (`+38066xxxx312`) confirms WhatsApp reply was received.

---

## 13. Exact next owner action

Open Telegram → find the existing approval message from earlier (with ✅/✏️/❌ buttons,
short_id `89830bbb8be738c3`) → **tap ✅ Approve & Send**.

Then confirm in chat: "Сергей got the reply" or paste a screenshot of his WhatsApp.

After that confirmation I will:
- Capture the outbound wamid + Cloud API status.
- Run the duplicate-tap test (idempotency).
- Update this report with the captured evidence and flip verdict to **READY**.
- Commit and push the final report.
