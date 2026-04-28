# WhatsApp Cloud API + Alex + Telegram Approval — Acceptance Report

**Date:** 2026-04-28  
**Engineer:** Claude Sonnet 4.6 (final acceptance run)  
**Final verdict:** READY WITH RISK (live E2E pending)

---

## 1. Executive Summary

The WhatsApp Cloud API integration for Handy & Friend is hardened to production standards.
HMAC validation is fail-closed in production: bad/missing signatures from a WhatsApp payload
return 403, valid signatures pass, and Telegram approval callbacks correctly bypass HMAC.
All 3014 unit/integration tests pass. The Meta App Secret has been verified against the
`debug_token` API and stored in Vercel production. The only remaining item is a one-time
live customer→Alex→Telegram→reply round trip from the owner's personal phone, which
captures the final wamids for the report.

---

## 2. Final Production State

| Component | State |
|---|---|
| Production URL | `https://handyandfriend.com` |
| Active webhook | `/api/alex-webhook` |
| Latest commit | `971b3be4c148d4578ff0ae7dab1911e68638141c` |
| Vercel deploy ID | `dpl_3FecwzysCWEqt6pTEUS2yXCHcbGb` |
| Aliases | `handyandfriend.com`, `www.handyandfriend.com` |
| Region | `iad1` |
| Phone number | `+1 213-361-1700` |
| Phone ID | `1085039581359097` |
| WABA ID | `825762536760123` |
| Meta App ID | `767361159439856` ("Handy Friend Messenger") |
| Phone status | CONNECTED, LIVE, CLOUD_API, GREEN quality |
| Mac bridge | NOT RUNNING |

---

## 3. Env Status (no values printed)

```
Command: npx vercel env ls production
```

| Variable | Status |
|---|---|
| FB_APP_SECRET | ✅ **PRESENT** (added 2026-04-28, verified against Meta `debug_token`) |
| WHATSAPP_ACCESS_TOKEN | ✅ |
| WHATSAPP_PHONE_NUMBER_ID | ✅ |
| WHATSAPP_VERIFY_TOKEN | ✅ |
| META_PHONE_NUMBER_ID | ✅ |
| META_WABA_ID | ✅ |
| FB_VERIFY_TOKEN | ✅ |
| FB_PAGE_ACCESS_TOKEN | ✅ |
| TELEGRAM_BOT_TOKEN | ✅ |
| TELEGRAM_CHAT_ID | ✅ |
| SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY | ✅ |
| DEEPSEEK_API_KEY, RESEND_API_KEY, GA4_*, RECAPTCHA_MIN_SCORE | ✅ |

**Verification proof:** Meta `debug_token` accepted `app_id|secret` combo —
returned `app_id=767361159439856, type=SYSTEM_USER, valid=True`.

---

## 4. HMAC Validation Evidence (live production)

```
Endpoint: https://handyandfriend.com/api/alex-webhook
Date: 2026-04-28
```

| Test | Headers | Status | Body | Verdict |
|---|---|---|---|---|
| 1. Valid HMAC + WA payload | `x-hub-signature-256: sha256=<correct>` | **200** | `EVENT_RECEIVED` | ✅ |
| 2. Bad HMAC + WA payload | `x-hub-signature-256: sha256=000…000` | **403** | `{"error":"Invalid signature"}` | ✅ |
| 3. Missing HMAC + WA payload | (no signature header) | **403** | `{"error":"Invalid signature"}` | ✅ |
| 4. Telegram callback (no Meta sig) | (no signature header) | **200** | `{"ok":true,"action":"approve",…}` | ✅ Telegram bypass |
| 5. GET verify correct token | `?hub.verify_token=<WA_VERIFY>` | **200** | `phase5-prod` (challenge echoed) | ✅ |
| 6. GET verify wrong token | `?hub.verify_token=WRONG` | **403** | `Forbidden` | ✅ |

**Result: 6/6 PASS — production is fail-closed for unsigned/bad-signed WhatsApp payloads, while Telegram approval callbacks are not blocked.**

---

## 5. Real Inbound WhatsApp Evidence

**Status: PENDING** — owner action required.

To complete acceptance, owner must send any WhatsApp message from a personal phone to
**+1 213-361-1700**. The watcher (`bm11x4298`) is monitoring Supabase
`whatsapp_messages.direction=inbound` and will capture:

- inbound wamid
- sender phone (`phone_from`)
- recipient phone (`phone_to` = `+12133611700`)
- message body
- created_at timestamp
- direction: `inbound`

This section will be updated upon arrival.

---

## 6. Telegram Approval Evidence

**Status: PENDING** — depends on inbound (section 5).

Architecture verified by tests:
- `sendApprovalRequest()` constructs Telegram inline keyboard ✅/✏️/❌
- `callback_data` format: `wa:approve:<short_id>` (sha256(wamid)[0:16]) → 27 bytes (under Telegram's 64-byte limit)
- `telegram_sends` table stores: `source=whatsapp_approval`, `extra={short_id, wamid, alex_draft, customer_message, customer_name}`
- Callback handler resolves short_id → wamid via `telegram_sends?source=eq.whatsapp_approval&extra->>short_id=eq.<sid>`

Will be populated with: telegram_sends row id, message_id, short_id, full wamid mapping.

---

## 7. Outbound WhatsApp Evidence

**Status: PENDING** — depends on Telegram approval (section 6).

Cloud API credentials verified:
```
GET /v19.0/1085039581359097?fields=...
  platform_type: CLOUD_API
  status: CONNECTED
  account_mode: LIVE
  code_verification_status: VERIFIED
  quality_rating: GREEN
```

Token: SYSTEM_USER, non-expiring, scopes `whatsapp_business_messaging` + `whatsapp_business_management`.

Will be populated with: outbound wamid, Cloud API response, customer-confirmed receipt.

---

## 8. Supabase Evidence

**Table:** `public.whatsapp_messages` (created via `migrations/whatsapp_cloud_api.sql`)

```sql
-- UNIQUE constraint on wamid prevents duplicates
CREATE UNIQUE INDEX whatsapp_messages_wamid_idx ON public.whatsapp_messages (wamid);
```

**Dedup proven:** POST with `?on_conflict=wamid` and `Prefer: resolution=ignore-duplicates,return=representation` returns `[]` on duplicate (no 23505 error).

**Live evidence queries (run by `/tmp/capture-e2e-evidence.py`):**
```sql
SELECT wamid, direction, phone_from, phone_to, body, created_at
  FROM whatsapp_messages WHERE created_at >= now() - interval '30 minutes'
  ORDER BY created_at DESC;

SELECT id, source, ok, extra FROM telegram_sends
  WHERE source = 'whatsapp_approval' AND created_at >= now() - interval '30 minutes';

SELECT type, lead_id, created_at FROM lead_events
  WHERE type IN ('wa_inbound_received','wa_approval_sent','wa_approve_callback','wa_outbound_sent')
    AND created_at >= now() - interval '30 minutes';
```

Row counts will be filled in upon E2E completion.

---

## 9. Test Results

```
Command: node tests/<file>.test.js
```

| File | Tests | Pass | Fail |
|---|---|---|---|
| whatsapp-webhook.test.js | 14 | 14 | 0 |
| whatsapp-cloud.test.js | 8 | 8 | 0 |
| whatsapp-owner-alert.test.js | 1 | 1 | 0 |
| telegram-proof.test.js | 11 | 11 | 0 |
| outbox-fixes.test.js | 13 | 13 | 0 |
| pricing-policy.test.js | 2956 | 2956 | 0 |
| ads-attribution.test.js | 11 | 11 | 0 |
| **TOTAL** | **3014** | **3014** | **0** |

The 4 dedicated HMAC tests inside `whatsapp-webhook.test.js`:
- POST WA with valid HMAC passes when FB_APP_SECRET set ✅
- POST WA with bad HMAC is rejected 403 when FB_APP_SECRET set ✅
- POST WA with missing HMAC is rejected 403 when FB_APP_SECRET set ✅
- POST Telegram callback bypasses HMAC even when FB_APP_SECRET set ✅

---

## 10. Production Smoke Checks

| Check | Command | Result |
|---|---|---|
| Health | `GET /api/health` | `{"ok":true,"status":"healthy","region":"iad1","env":"production"}` |
| GET verify correct | `?hub.verify_token=<WA_VERIFY>&hub.challenge=phase9-smoke` | `phase9-smoke` (200) |
| GET verify wrong | `?hub.verify_token=WRONG` | 403 |
| POST WA bad HMAC | `x-hub-signature-256: sha256=bad` | 403 |
| POST WA missing HMAC | (no header) | 403 |
| POST Telegram callback | (no header) | 200 (Telegram bypass) |
| `/api/whatsapp-webhook` backward-compat | rewrites to `/api/alex-webhook` | 200 |
| Mac bridge process | `pgrep openclaw-wa-bridge` | NOT RUNNING |

---

## 11. Old Bridge / Old Endpoint Status

- **Mac bridge (`scripts/openclaw-wa-bridge.js`)**: not running, posts to deprecated `/api/whatsapp-webhook` with old phone ID `920678054472684`. Effectively isolated from new Cloud API path which uses `/api/alex-webhook` and phone ID `1085039581359097`.
- **`/api/whatsapp-webhook` route**: Vercel rewrite in `vercel.json` → `/api/alex-webhook`. Safe backward compatibility (Meta webhook subscriptions pointing to old URL still resolve to the active handler).

---

## 12. Remaining Risks

| Risk | Severity | Status |
|---|---|---|
| ~~FB_APP_SECRET missing~~ | ~~HIGH~~ | ✅ RESOLVED |
| Live E2E test not yet run | MEDIUM | Watcher armed, awaiting owner WhatsApp message |
| Only `hello_world` template approved on WABA | LOW | Sufficient for MVP; create custom templates as scope grows |
| Profile `about` field is default ("Hey there! I am using WhatsApp.") | LOW | Optional polish via Graph API |

---

## 13. Deployment IDs and Commit Hashes

| Item | Value |
|---|---|
| Latest main commit | `971b3be4c148d4578ff0ae7dab1911e68638141c` |
| HMAC fix commit | `09416a8cee52c3eb02f574b97d6d8cd592379360` |
| Initial Cloud API commit | `1dcf978cbc06fda7700e1eeb42238a89c1479652` |
| Final deploy (with FB_APP_SECRET) | `dpl_3FecwzysCWEqt6pTEUS2yXCHcbGb` (READY) |
| Previous deploys | `dpl_F8ohQzdxeVyH8d9ANm1m9vz7cYsj`, `dpl_3iTazwdsbAwb8izYchzxctFBD6jN`, `dpl_3Vj8yLCK21zD2XHwdrd49i69YZeK`, `dpl_693xsrJxYNhs62aPUM9gqfdprYET` |
| Supabase project | `taqlarevwifgfnjxilfh` (West US Oregon) |

---

## 14. Final Verdict

```
READY WITH RISK
```

**All technical hardening complete:**
- ✅ FB_APP_SECRET present in Vercel production (verified against Meta API)
- ✅ Production redeployed: `dpl_3FecwzysCWEqt6pTEUS2yXCHcbGb` READY
- ✅ Bad HMAC → 403
- ✅ Missing HMAC → 403
- ✅ Valid HMAC → 200
- ✅ Telegram callback bypasses Meta HMAC
- ✅ 3014/3014 tests pass
- ✅ Mac bridge confirmed off
- ✅ Backward-compat route safe
- ✅ Profile typos fixed ("Los Angeles", "Labor-only")
- ✅ HMAC bug-fix preventing Telegram lockout

**Pending evidence (one owner action away from full READY):**
- ⏸ Real inbound WhatsApp message from personal phone to +1 213-361-1700
- ⏸ Telegram approval flow firing
- ⏸ Outbound Cloud API send + customer confirmed receipt
- ⏸ Outbound wamid captured

---

## 15. Exact Next Owner Action

Send any WhatsApp message from your personal phone to **+1 213-361-1700**.

Suggested text:
> `Test WhatsApp lead from owner — please reply via Alex approval.`

Then watch your Telegram for the approval message with ✅/✏️/❌ buttons. Tap **✅ Approve & Send**.

The watcher (`bm11x4298`) automatically captures all evidence and Claude updates this report
with exact wamids, timestamps, Supabase row counts, and Telegram message_ids.
