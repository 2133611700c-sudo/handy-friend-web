# WhatsApp Cloud API + Alex + Telegram Approval — Acceptance Report

**Date:** 2026-04-28  
**Engineer:** Claude Sonnet 4.6 (production acceptance run)  
**Final verdict:** READY WITH RISK

---

## 1. Executive Summary

The WhatsApp Cloud API integration for Handy & Friend is deployed and operational on
`handyandfriend.com`. Inbound webhooks, Telegram approval gate, dedup, and HMAC validation
are all in place. The system is fail-closed for HMAC once `FB_APP_SECRET` is added to Vercel.
Two owner actions remain before the verdict upgrades to READY: adding the secret and
completing a live E2E test.

---

## 2. Final Production State

| Component | State |
|---|---|
| Production URL | `https://handyandfriend.com` |
| Active webhook endpoint | `/api/alex-webhook` |
| Vercel deployment ID | `dpl_3Vj8yLCK21zD2XHwdrd49i69YZeK` |
| Latest main commit | `09416a8cee52c3eb02f574b97d6d8cd592379360` |
| GitHub repo | `2133611700c-sudo/handy-friend-web` |
| Vercel project | `prj_cB1RFa7bfSuWpuhBZs76UiYvTLzg` |
| Region | `iad1` (US East) |
| Phone number | `+1 213-361-1700` |
| Phone ID | `1085039581359097` |
| WABA ID | `825762536760123` |
| Meta App ID | `767361159439856` ("Handy Friend Messenger") |
| Platform type | `CLOUD_API` |
| Phone status | `CONNECTED`, `LIVE`, quality `GREEN` |
| Mac bridge | NOT RUNNING |
| Old `/api/whatsapp-webhook` | Vercel rewrite → `/api/alex-webhook` (safe) |

---

## 3. Env Status (no secret values)

```
Command: npx vercel env ls production
```

| Variable | Status |
|---|---|
| META_PHONE_NUMBER_ID | ✅ present |
| META_WABA_ID | ✅ present |
| META_PHONE_TWO_STEP_PIN | ✅ present |
| WHATSAPP_PHONE_NUMBER_ID | ✅ present |
| WHATSAPP_ACCESS_TOKEN | ✅ present |
| WHATSAPP_VERIFY_TOKEN | ✅ present |
| FB_VERIFY_TOKEN | ✅ present |
| FB_PAGE_ACCESS_TOKEN | ✅ present |
| TELEGRAM_BOT_TOKEN | ✅ present |
| TELEGRAM_CHAT_ID | ✅ present |
| SUPABASE_URL | ✅ present |
| SUPABASE_SERVICE_ROLE_KEY | ✅ present |
| DEEPSEEK_API_KEY | ✅ present |
| RESEND_API_KEY | ✅ present |
| **FB_APP_SECRET** | ❌ **MISSING — owner action required** |

**Action required:**  
1. Open https://developers.facebook.com/apps/767361159439856/settings/basic/  
2. Click "Показать" next to App Secret  
3. Copy value  
4. `npx vercel env add FB_APP_SECRET production`  
5. Vercel will auto-redeploy on next push, OR trigger manually

---

## 4. HMAC Validation Status

**Current state (FB_APP_SECRET missing):** soft-fail — unverified requests accepted with warning logged.

**When FB_APP_SECRET is added:**
- WhatsApp POST with valid signature → passes ✅ (proven in test)
- WhatsApp POST with bad signature → 403 ✅ (proven in test)
- WhatsApp POST with missing signature → 403 ✅ (proven in test, length-mismatch path)
- Telegram callback_query POST → bypasses HMAC entirely ✅ (no signature header expected)

**Key bug fixed in commit `09416a8c`:**  
HMAC was previously checked before body parse (lines 87-100 of original code), which would
have rejected all Telegram approval callbacks once FB_APP_SECRET was configured. Fixed by
moving HMAC check to after body parse and scoping it to `body.object === 'whatsapp_business_account'`.

```
Command: node tests/whatsapp-webhook.test.js
Result: 14/14 pass — includes 4 dedicated HMAC tests
```

---

## 5. Real Inbound Evidence

**Status: PENDING — owner action required**

No real inbound message has been received on the production Cloud API path since the new
deployment. This is required to complete acceptance.

**To trigger:**  
Send any WhatsApp message from a personal phone to **+1 213-361-1700**.

Once received, this report will be updated with:
- Inbound wamid
- Supabase `whatsapp_messages` row
- Telegram approval message_id

---

## 6. Telegram Approval Evidence

**Status: PENDING** — depends on real inbound (section 5).

Architecture proven in tests:
- `sendApprovalRequest()` fires after Alex generates draft
- `callback_data` format: `wa:approve:<16hex>` = 27 bytes (under 64-byte Telegram limit)
- `short_id` = first 16 hex chars of SHA256(wamid)
- Callback resolves via Supabase: `telegram_sends?source=eq.whatsapp_approval&extra->>short_id=eq.<sid>`

---

## 7. Outbound WhatsApp Evidence

**Status: PENDING** — depends on Telegram approval (section 6).

Cloud API credentials verified:
```
GET https://graph.facebook.com/v19.0/1085039581359097
  ?fields=id,display_phone_number,code_verification_status,platform_type,status,account_mode

Response:
  platform_type: CLOUD_API
  status: CONNECTED
  account_mode: LIVE
  code_verification_status: VERIFIED
  quality_rating: GREEN
```

Token debug:
```
GET https://graph.facebook.com/debug_token?input_token=<token>&access_token=<token>

Response (sanitized):
  type: SYSTEM_USER
  is_valid: true
  expires_at: 0 (never expires)
  scopes: [whatsapp_business_management, whatsapp_business_messaging, public_profile]
  app_id: 767361159439856
```

Free-form text requires a customer-initiated 24h conversation window (LIVE mode constraint).
The first real inbound message (section 5) opens that window for the outbound reply.

---

## 8. Supabase Evidence

**Table created:**
```sql
-- migrations/whatsapp_cloud_api.sql
CREATE TABLE public.whatsapp_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wamid text UNIQUE NOT NULL,
  direction text NOT NULL,  -- 'inbound' | 'outbound'
  phone_from text,
  phone_to text,
  ...
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX whatsapp_messages_wamid_idx ON public.whatsapp_messages (wamid);
```

**Dedup verified (pre-prod testing):**
```
POST /rest/v1/whatsapp_messages?on_conflict=wamid
Headers: Prefer: resolution=ignore-duplicates,return=representation
On duplicate wamid → returns [] (no 23505 error)
```

**Row count query (run after live E2E):**
```sql
SELECT direction, count(*) FROM public.whatsapp_messages GROUP BY direction;
```

---

## 9. Test Results

### Local node:test suite

| File | Tests | Pass | Fail |
|---|---|---|---|
| tests/whatsapp-webhook.test.js | 14 | 14 | 0 |
| tests/whatsapp-cloud.test.js | 8 | 8 | 0 |
| tests/whatsapp-owner-alert.test.js | 1 | 1 | 0 |
| tests/telegram-proof.test.js | 11 | 11 | 0 |
| tests/outbox-fixes.test.js | 13 | 13 | 0 |
| tests/pricing-policy.test.js | 20 | 20 | 0 |
| **TOTAL** | **67** | **67** | **0** |

### Production smoke checks

| Check | Command | Result |
|---|---|---|
| Health | `GET /api/health` | `{"ok":true,"status":"healthy","region":"iad1"}` |
| GET verify WA token | `hub.verify_token=<WA_TOKEN>&hub.challenge=smoke-wa-42` | `smoke-wa-42` (200) |
| GET verify FB token | `hub.verify_token=<FB_TOKEN>&hub.challenge=smoke-fb-77` | `smoke-fb-77` (200) |
| GET wrong token | `hub.verify_token=wrong` | 403 |
| Old endpoint rewrite | `GET /api/whatsapp-webhook?...` | routes to `/api/alex-webhook` (200) |
| POST bad HMAC (no secret) | `x-hub-signature-256: sha256=badhash` | 200 soft-fail (expected, no secret yet) |
| Mac bridge | `pgrep openclaw-wa-bridge` | NOT RUNNING |

---

## 10. Deployment IDs and Commit Hashes

| Item | Value |
|---|---|
| Final commit (main) | `09416a8cee52c3eb02f574b97d6d8cd592379360` |
| Previous commit | `1dcf978cbc06fda7700e1eeb42238a89c1479652` |
| HMAC fix commit | `09416a8cee52c3eb02f574b97d6d8cd592379360` |
| Vercel deploy (HMAC fix) | `dpl_3Vj8yLCK21zD2XHwdrd49i69YZeK` (READY) |
| Vercel deploy (initial) | `dpl_693xsrJxYNhs62aPUM9gqfdprYET` (READY) |
| Supabase project | `taqlarevwifgfnjxilfh` (West US Oregon) |

---

## 11. Phase E — Profile Cleanup

WhatsApp Business profile typos fixed via Graph API:

```
PATCH https://graph.facebook.com/v19.0/1085039581359097/whatsapp_business_profile
Body: {"messaging_product":"whatsapp","description":"Handyman services in Los Angeles — TV mounting, painting, repairs, furniture assembly. Labor-only quotes after photos."}
Response: {"success":true}
```

Before: `"Los Ageles"`, `"repairs,furniture"`, `"Labor-nly"`  
After: `"Los Angeles"`, `"repairs, furniture"`, `"Labor-only"`

---

## 12. Remaining Risks

| Risk | Severity | Action |
|---|---|---|
| **FB_APP_SECRET missing** | HIGH | Owner must add to Vercel (section 3) |
| **No live E2E test** | HIGH | Owner must send test WhatsApp message (section 5) |
| **Only `hello_world` template** | MEDIUM | Create service-specific template for proactive outreach |
| **`about` field** = default value | LOW | Update "Hey there! I am using WhatsApp." to business description |

---

## 13. Final Verdict

```
READY WITH RISK
```

**Infrastructure:** COMPLETE — all code deployed, tested, and verified in production.  
**Blocking for READY:** FB_APP_SECRET must be added + real E2E test must pass.

Once the owner completes the two actions in section 3 and section 5, this report should be
updated with the live evidence and the verdict changed to **READY**.

---

## Appendix — Files Changed in This Release

| File | Change |
|---|---|
| `api/alex-webhook.js` | Cloud API handler, Telegram approval callback, HMAC fix |
| `lib/whatsapp/cloud-api-client.js` | NEW — Meta Cloud API client |
| `lib/whatsapp/dedup.js` | NEW — atomic dedup via whatsapp_messages.wamid UNIQUE |
| `lib/whatsapp/parse-webhook.js` | NEW — webhook parser |
| `lib/whatsapp/signature-verify.js` | NEW — HMAC verifier (used in tests) |
| `lib/telegram/approval.js` | NEW — Telegram approval gate |
| `migrations/whatsapp_cloud_api.sql` | NEW — whatsapp_messages table |
| `tests/whatsapp-webhook.test.js` | UPDATED — mockReq stream + 4 HMAC tests |
