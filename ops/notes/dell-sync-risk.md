# Dell Sync Risk — social_scanner.py

**Created:** 2026-04-22  
**Severity:** HIGH — affects telegram_sends proof row completeness  
**Status:** UNRESOLVED — Dell code sync not confirmed

---

## The Problem

`scripts/social_scanner.py` on the Mac repo was updated to:
1. Call `log_telegram_send_proof()` after every HOT_SOCIAL_SIGNAL Telegram alert
2. Write a row to `telegram_sends` with `source='social_scanner'`, `extra.alert_class='HOT_SOCIAL_SIGNAL'`

**Dell Vostro** (`100.125.80.43`, `C:\cloud cod\`) runs `social_scanner.py` independently. There is no confirmed automatic git sync mechanism between the Mac repo and Dell.

**Result:** HOT_SOCIAL_SIGNAL alerts from Dell do NOT produce `telegram_sends` proof rows. The alert proof contract is broken for all scanner-originated signals.

---

## Evidence

```
GET /rest/v1/telegram_sends?source=eq.social_scanner&order=created_at.desc&limit=5
```

Returns only 1 row:
- `id=35, src=social_scanner, ok=True, tg_msg_id=88888`

`tg_msg_id=88888` is the synthetic test row created manually to verify the proof write mechanism.  
**Zero real HOT_SOCIAL_SIGNAL proof rows exist from Dell runs.**

---

## Sync Procedure

After any change to `scripts/social_scanner.py`:

```bash
# 1. SSH to Dell
ssh sergii@100.125.80.43

# 2. Navigate to project
cd "C:\cloud cod\"

# 3. Pull latest
git pull origin main

# 4. Verify dry-run works
python3 scripts/social_scanner.py --source craigslist --feed /tmp/test_feed.json --dry-run

# 5. Check telegram_sends after next real run
# (allow 1 scanner cycle to complete)
```

**Verification query after sync:**
```
GET /rest/v1/telegram_sends?source=eq.social_scanner&tg_message_id=neq.88888&order=created_at.desc&limit=5
```
If this returns rows with real message IDs → sync successful and proof contract restored.

---

## Risk Until Resolved

- HOT_SOCIAL_SIGNAL alerts ARE being sent (Telegram bot fires correctly)
- But `telegram_sends` has no proof rows → watchdog `leads_without_proof` check cannot audit scanner alerts
- Manual audit of scanner yield must rely on `social_leads` row count only (not proof rows)

---

## Workaround

Until Dell is synced, use `social_leads` as the scanner yield evidence:

```
GET /rest/v1/social_leads?platform=eq.nextdoor&order=created_at.desc&limit=5
GET /rest/v1/social_leads?platform=eq.craigslist&order=created_at.desc&limit=5
```

Age of most recent row = scanner staleness.
