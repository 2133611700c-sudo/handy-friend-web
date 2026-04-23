# Handy & Friend — Lead System Operating Contracts

**Last updated:** 2026-04-22  
**Authority:** This document is the single source of truth for how every inbound lead channel
works, what proves a delivery, and what the owner must do manually.  
**Scope:** Non-WhatsApp channels only. WhatsApp is out of scope.

---

## 1. Source-of-Truth Contract

| Concern | Source of Truth | NOT |
|---|---|---|
| Lead CRM | `leads` table in Supabase | Google Sheets, Telegram history |
| Social signals queue | `social_leads` table | `hunter_posts`, ops_incidents |
| Telegram delivery proof | `telegram_sends` table | Telegram message history |
| Chat history | `ai_conversations` table | — |
| Outbound jobs | `outbound_jobs` table | — |
| Scanner health | `social_leads` last row age by platform | `ops_incidents` ("ALIVE" ≠ posts collected) |
| Pricing | `price-registry.js` v2026.03.25-v2 | CLAUDE.md, memory files |

### Critical Distinction: social_leads vs leads

- `social_leads` = **signal queue only**. A HOT/WARM row means "someone on the internet needs a handyman." It is NOT a CRM lead. Status values: `new` → `reviewed` → `contacted` / `ignored`.
- `leads` = **CRM**. Created when a person submits the website form, completes Messenger phone-gate, or receives an FB pre-lead row after ≥3 Messenger turns without a phone number.

---

## 2. Alert Contract

Every owner-facing Telegram alert MUST have a corresponding row in `telegram_sends`.  
No row in `telegram_sends` = alert did not happen, regardless of Telegram message history.

### Alert Classes

| Class | Trigger | Source Column | Proof Required |
|---|---|---|---|
| `LEAD_CREATED` | New real lead (website form) | `alex_webhook` / `ai_chat` | `telegram_sends.ok=true` |
| `PRE_LEAD_REVIEW` | FB Messenger ≥3 turns, no phone | `alex_webhook` | `telegram_sends.ok=true`, `extra.kind=pre_lead_alert` |
| `HOT_SOCIAL_SIGNAL` | HOT/WARM inserted in `social_leads` | `social_scanner` | `telegram_sends.ok=true`, `extra.alert_class=HOT_SOCIAL_SIGNAL` |
| `WATCHDOG_ALERT` | Any watchdog check fails | `autonomous_watchdog.py` | Snapshot JSON in `ops/reports/watchdog/` |
| `DAILY_DIGEST` | Daily sales pulse | `process_outbox` | `telegram_sends.src=process_outbox`, `extra.category=daily_digest` |

### Proof Query

```sql
-- Last 10 alerts, any class
SELECT id, source, ok, telegram_message_id, extra, created_at
FROM telegram_sends
ORDER BY created_at DESC
LIMIT 10;
```

---

## 3. Channel Operating Modes

### 3a. Website Form (handyandfriend.com)

**Mode:** Fully automated.  
**Flow:** Visitor → form submit → `api/submit-lead.js` → `processInbound(envelope)` → `leads` row → `outbound_jobs` → Telegram alert + customer auto-responder email.  
**Proof:** `leads.source IN ('website','google_ads_search')`, `telegram_sends.src='alex_webhook'`.  
**Owner action:** None automatic; respond to inbound call/SMS from customer.

---

### 3b. Facebook Messenger

**Mode:** Automated phone-gate + pre-lead fallback.  
**Flow:**
1. User sends message → `api/alex-webhook.js` → Alex AI responds
2. If user provides phone → `processInbound()` → real `leads` row created
3. If user reaches ≥3 turns WITHOUT phone → `maybeCreateFbPreLead()` → `leads` row with `source='facebook'`, `full_name='FB:<senderId>'`, `phone=null`, `source_details.pre_lead=true`, `status='new'` → `PRE_LEAD_REVIEW` Telegram alert

**Proof for pre-lead:** `telegram_sends.src='alex_webhook'`, `extra.kind='pre_lead_alert'`  
**Idempotency:** Pre-lead is only created once per session. Subsequent messages check for existing row first.  
**Owner action on pre-lead alert:** Open Facebook Messenger inbox → find the conversation → reply and ask for phone number manually.  

**Test flag:** `is_test=true` on any lead where `session_id` matches test prefixes OR phone matches synthetic pattern.

---

### 3c. Social Scanner — Craigslist

**Mode:** Scanner-only. **No relay email path exists** (confirmed: 90-day Gmail audit found 0 emails from `@hb.craigslist.org` or `@la.craigslist.org`).  
**Flow:** OpenClaw (Dell Vostro, `C:\cloud cod\`) scrapes CL → writes JSON feed → `social_scanner.py --source craigslist --feed <path>` → HOT/WARM rows inserted in `social_leads` → immediate `HOT_SOCIAL_SIGNAL` Telegram alert.  
**Proof:** `social_leads.platform='craigslist'`, `telegram_sends.src='social_scanner'`, `extra.platform='craigslist'`.  
**Staleness threshold:** Watchdog flags if last CL `social_leads` row > 7 days old (not yet implemented — currently only ND staleness is checked).  
**Owner action on HOT signal:** See §4 (Social Leads Follow-Through).

---

### 3d. Social Scanner — Nextdoor

**Mode:** Scanner + manual inbox.  
**Automated flow:** OpenClaw scrapes ND → `social_scanner.py --source nextdoor` → `social_leads` row → Telegram alert.  
**WARNING — "ALIVE" ≠ collecting posts:** `ops_incidents` entries like "ND Source 1: ALIVE" only mean the source URL is reachable. Actual yield is measured by `social_leads` row recency. If last ND row is > 7 days old, scanner yield is zero regardless of ALIVE status.  
**Current status (2026-04-22):** Last ND social_lead is 16.2 days old. Watchdog is alerting.  
**Manual channel:** Nextdoor Business inbox at `nextdoor.com/page/handy-friend/` — receives direct messages from neighbors. No automation. Must be checked manually ≥3×/week.  
**Owner action on HOT signal:** See §4. On inbox message: respond within 24h, collect phone, create lead manually in Supabase.

---

### 3e. Social Scanner — Facebook Groups

**Mode:** Scanner-only.  
**Flow:** OpenClaw scrapes FB Groups → `social_scanner.py --source facebook` → `social_leads` row → Telegram alert.  
**Proof:** `social_leads.platform='facebook'` (distinct from `leads.source='facebook'` which is Messenger).  
**Owner action on HOT signal:** See §4.

---

## 4. Social Leads Follow-Through Workflow

When a `HOT_SOCIAL_SIGNAL` Telegram alert fires:

```
1. Open post URL from the alert (linked in message).
2. Read the post — confirm it's a genuine service need, not spam/sold/old.
3. If genuine:
   a. Reply publicly or via DM with a brief intro ("Hi, I'm a local handyman in LA...").
   b. Ask for their phone or invite them to text/call: (323) xxx-xxxx.
   c. Once phone obtained → create lead manually in Supabase:
      INSERT into leads (full_name, phone, source, service_type, status, stage, is_test)
      VALUES ('<name>', '<phone>', '<platform>', '<service>', 'new', 'new', false)
   d. PATCH social_leads row: status='contacted', last_action_at=now()
4. If not actionable (sold, spam, wrong area):
   PATCH social_leads: status='ignored'
5. If HOT/WARM signal is > 24h old and status=new → watchdog will alert as "stuck backlog".
   Goal: clear new HOT/WARM rows within 24h (reviewed or contacted or ignored).
```

**Dashboard:** Supabase → Table Editor → `social_leads` → filter `status=eq.new` + `intent_type=in.(HOT,WARM)` → sort `created_at asc`.

---

## 5. Proof Contract — What "Done" Means

A channel is operationally proven when ALL of these are true:

| Check | How to verify |
|---|---|
| Signal captured | Row exists in `social_leads` (scanner) or `leads` (form/Messenger) |
| Owner alerted | `telegram_sends.ok=true` for the corresponding event |
| Proof row written | `telegram_sends` row with correct `source` and `extra` fields |
| No test contamination | `is_test=true` on any synthetic/test row |
| Idempotent | Sending duplicate signal does not create duplicate rows |

---

## 6. Reporting Contract

**Watchdog** (`scripts/autonomous_watchdog.py`) — runs every 30 min via scheduled task:
- GREEN = all checks pass, no Telegram sent
- RED = any check fails → single Telegram alert with bullet list
- Snapshot: `ops/reports/watchdog/<timestamp>.json`
- Checks: ads URLs, `/api/health`, Telegram webhook, stuck social leads, FB session→lead gap, ND staleness

**Daily Digest** (`scripts/daily_sales_pulse.py`) — runs once daily:
- Sends only when `has_signal=True` (non-zero leads, pre-leads, HOT signals, errors, or outbox failures)
- Zero-count runs are suppressed (no noise)
- Covers: real leads 24h/7d, FB pre-leads, HOT signals today, stuck backlog, dark channel reminders

**Anti-patterns:**
- NEVER report "done" without a proof row in `telegram_sends`
- NEVER count `hunter_posts` rows as lead evidence
- NEVER treat `ops_incidents.status='ALIVE'` as scanner yield evidence
- NEVER include test leads (`is_test=true`) in any report metric

---

## 7. Dell Sync Contract

OpenClaw (social scanner) runs on Dell Vostro at `100.125.80.43` from `C:\cloud cod\`.

**Risk:** Changes to `scripts/social_scanner.py` on the Mac repo do NOT automatically propagate to Dell. Dell runs its own copy. Git sync mechanism is not confirmed.

**Current gap:** `log_telegram_send_proof()` fix exists in Mac repo (`scripts/social_scanner.py`) but Dell may still be running the pre-fix version without proof row writes.

**Mitigation:** After any `social_scanner.py` change:
1. SSH to Dell: `ssh sergii@100.125.80.43`
2. `cd "C:\cloud cod\"`
3. `git pull origin main` (or manually copy the changed file)
4. Verify with: `python3 scripts/social_scanner.py --source craigslist --feed /tmp/test.json --dry-run`

**Verification query for proof rows from Dell runs:**
```
GET /rest/v1/telegram_sends?source=eq.social_scanner&ok=eq.true&order=created_at.desc&limit=5
```
If this returns 0 real rows (id=35 is synthetic test), Dell has not yet run with the new code.
