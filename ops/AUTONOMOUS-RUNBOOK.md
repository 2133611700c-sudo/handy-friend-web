# Handy & Friend — Autonomous Runbook
**Version:** 1.0
**Date:** 2026-04-17
**Owner:** Sergii
**Operator:** Claude (autonomous agent)

---

## WHAT RUNS WITHOUT YOU

### On Vercel (serverless crons)
| When | What | Endpoint | Purpose |
|---|---|---|---|
| Every day 04:00 UTC | Outbox drain | `/api/process-outbox` | Retry failed Telegram/email sends |
| Every day 05:00 UTC | Telegram watchdog | `/api/health?type=telegram_watchdog` | Alert if real leads missing Telegram proof |

### On my Mac (scheduled-tasks MCP — Claude-managed)
| When | Task ID | Purpose |
|---|---|---|
| Every 30 min | `handy-friend-watchdog` | URL audit + health + Telegram dashboard; alerts if any RED |
| Daily 08:57 local | `handy-friend-daily-digest` | Telegram digest: leads/revenue/conversion/fails |
| Mondays 07:13 local | `handy-friend-regression-weekly` | Full Alex business-rule regression (6 tests) |

### One-shot triggers you can push
```bash
cd /Users/sergiikuropiatnyk/handy-friend-landing-v6

# Full end-to-end chat → lead → Telegram proof
python3 scripts/e2e_alex_telegram.py

# Alex business rules
python3 scripts/regression_alex.py

# Google Ads landing-page routing
python3 scripts/audit_ads_urls.py

# Consolidated watchdog (same as cron)
python3 scripts/autonomous_watchdog.py
```

Each script exits 0 on PASS, 1 on FAIL, writes JSON evidence.

---

## WHAT I CAN DO AUTONOMOUSLY (TODAY)

### Code + infra
1. Edit any file in the repo
2. Push to GitHub → Vercel auto-deploys (2-15s build)
3. Run Supabase migrations (`supabase db push`)
4. Query/write Supabase directly via service_role REST
5. Send Telegram messages to owner chat via bot token
6. Read Vercel deployment logs, deployment state
7. Search Vercel docs

### Testing + verification
1. Run `scripts/e2e_alex_telegram.py` on demand
2. Run `scripts/regression_alex.py` on demand
3. Run `scripts/audit_ads_urls.py` on demand
4. Hit `/api/health?type=*` endpoints

### Scheduling
1. Add/modify/delete scheduled Claude tasks
2. Add/modify Vercel cron entries (via git push to vercel.json)

### SMM content
1. Draft Craigslist / Nextdoor / Facebook posts (content only — human publishes)
2. Draft review-request SMS/email in EN/RU/ES
3. Pull past-customer lists from Supabase (ready for messaging)

---

## WHAT I CAN'T DO YET (bootstrap required)

### 🔑 VERCEL_TOKEN — unlocks full Vercel control

**Blocks right now:**
- Setting `HF_NOTIFY_SECRET` env var (/api/notify currently 503)
- Adding/removing Vercel env vars programmatically
- Triggering redeploys without a git push

**Fix (30 seconds):**
1. https://vercel.com/account/tokens → Create → name "handy-friend-claude" → scope: Full Account → expires: 90 days
2. Paste value into `/Users/sergiikuropiatnyk/handy-friend-landing-v6/.env.local`:
   ```
   VERCEL_TOKEN=vcp_xxxx...
   ```
3. Reply to me in chat: "token added"

**After that:** I will autonomously `curl -X POST https://api.vercel.com/v10/projects/prj_cB1RFa7bfSuWpuhBZs76UiYvTLzg/env` to set `HF_NOTIFY_SECRET` + any future env vars, and trigger redeploys via REST API.

### Task 1.6 manual enable path (works without API token)

`/api/notify` is intentionally fail-closed while `HF_NOTIFY_SECRET` is missing.
Current expected response:

```bash
curl -sS -X POST https://handyandfriend.com/api/notify \
  -H 'Content-Type: application/json' \
  -d '{"type":"sms","phone":"2130000000"}'
# {"success":false,"error":"notify_disabled"}   (HTTP 503)
```

Manual enable sequence:
1. Vercel Dashboard -> Project `handy-friend-web` -> Settings -> Environment Variables
2. Add `HF_NOTIFY_SECRET` (32+ random chars) for `Production` and `Preview`
3. Redeploy (Deployments -> Redeploy latest)

Post-enable verification:

```bash
# no header must stay blocked
curl -sS -o /dev/null -w "%{http_code}\n" -X POST https://handyandfriend.com/api/notify \
  -H 'Content-Type: application/json' \
  -d '{"type":"telegram","leadId":"manual-test"}'
# expected: 401 or 403

# with header should succeed
curl -sS -X POST https://handyandfriend.com/api/notify \
  -H "X-HF-Notify-Secret: <HF_NOTIFY_SECRET>" \
  -H 'Content-Type: application/json' \
  -d '{"type":"telegram","leadId":"manual-test","phone":"2130000000"}'
# expected: {"success":true,...} (HTTP 200)
```

Until these checks pass, Task 1.6 status remains `PARTIAL/BLOCKED_EXTERNAL`.

### 🔑 Google Ads API credentials — unlocks ad-campaign automation

**Blocks:**
- Changing budgets, bids, keywords, RSA headlines without browser
- Pulling search terms reports into Supabase
- Auto-applying negative keywords

**Bootstrap (one-time OAuth):**
1. Google Cloud Console → create OAuth 2.0 client (desktop type)
2. Add to `.env.local`:
   ```
   GOOGLE_ADS_DEVELOPER_TOKEN=...
   GOOGLE_ADS_CLIENT_ID=...
   GOOGLE_ADS_CLIENT_SECRET=...
   GOOGLE_ADS_REFRESH_TOKEN=...
   GOOGLE_ADS_CUSTOMER_ID=6376068452
   ```
3. Reply "ads creds added"

**After that:** I run `google-ads-python` directly, pull reports, push optimizations following the CLAUDE.md guardrails (no PMax, no broad match, no Display, no auto-apply, Max CPC ≤$4, daily budget ≤$6.40).

### 🔑 Chrome MCP (optional) — unlocks UI-only services

**Unblocks:**
- Google Business Profile updates, photo uploads, post publishing
- Bing Places postcard PIN entry (when it arrives)
- Facebook Page posting (if Facebook Graph permissions too restricted)
- Nextdoor Business Page posting (no public API)
- Craigslist manual posting (still requires a live human session but I can prep everything)

**Bootstrap:** Install Claude in Chrome extension, log into each service once. Then I drive the UI with screenshots + clicks.

---

## AUTONOMOUS DAILY LOOP (after bootstrap complete)

```
08:57 local: daily-digest task → Telegram digest to owner
every 30min: watchdog task → alert if RED, else silent
every hour: watchdog runs full e2e → proof chain captured
Mondays 07:13: regression-weekly → Alex rules enforced

00:00 local: Vercel cron retry outbox
05:00 UTC: Vercel cron telegram watchdog
```

Every 24 hours you (Sergii) see exactly ONE proactive message from me:
- If GREEN: 1 digest with KPIs
- If RED: 1 digest + each alert moment

---

## ESCALATION MATRIX

| Severity | Trigger | Action |
|---|---|---|
| P0 | /api/health HTTP ≠ 200 for ≥ 2 cycles (1 hour) | Telegram alert + stop ads (manual for now) |
| P0 | Telegram failures_24h > 10 | Telegram alert |
| P1 | Leads without telegram_proof_7d > 0 | Telegram alert via watchdog |
| P1 | Alex regression any test FAILS | Weekly alert, flag deploy |
| P2 | URL audit fails | Include in daily digest |
| P3 | Low traffic / low CTR | Include in daily digest (not alert) |

---

## DEPLOY PATTERN (autonomous)

Trigger: I edit code → `git add` → `git commit` → `git push origin main` → Vercel builds 10-30s → automatic.

Verification after each deploy:
1. Poll `mcp__vercel__get_deployment` until `state=READY`
2. Curl `/api/health` — confirm `ok:true`
3. If change touches Alex/Telegram/leads → run `scripts/e2e_alex_telegram.py`
4. If all green → silent. Otherwise → Telegram alert + revert via `git revert`.

---

## REVERT / ROLLBACK

If a commit breaks prod, I execute:
```bash
cd /Users/sergiikuropiatnyk/handy-friend-landing-v6
git revert <sha> --no-edit
git push origin main
```
Vercel auto-deploys the reverted state. Takes ~30s. I verify and send Telegram confirmation.

For DB: keep Supabase migrations forward-only; each migration is idempotent (uses IF EXISTS / DO blocks). If a migration is wrong, I write a new forward migration to fix it — never a rollback.

---

## WHAT COUNTS AS A LEAD (business definition)

Real lead = row in `public.leads` with:
- `is_test = false`
- `source IN ('website_chat', 'form_submit', 'messenger_capture', 'craigslist_inbound', 'nextdoor_inbound', 'callback_request')`
- A non-empty phone or email

Attribution confidence is logged in `lead_events` (event_type='lead_created' with source_details jsonb).

---

## KPIs I WATCH (and alert on)

| Metric | Healthy | Alert |
|---|---|---|
| leads_total (24h) | ≥ 1 | 0 for 2 consecutive days |
| telegram fails_24h | 0 | > 3 |
| telegram fails_7d | ≤ 5 | > 10 |
| leads_without_telegram_proof | 0 | > 0 |
| URL audit | 24/24 PASS | any FAIL |
| Alex e2e | 10/10 PASS | any FAIL |
| Alex regression | 6/6 PASS | any FAIL |
| /api/health | 200 | ≠ 200 or `ok:false` |
| Vercel latest deploy | READY | ERROR |
| Supabase response time | < 1s | > 3s |

---

## EMERGENCY STOP

If owner wants to halt everything:

```bash
# Pause all scheduled tasks I registered
# (from Claude: just say "pause all scheduled tasks")

# Disable /api/ai-chat:
# Add to vercel.json rewrites:
# { "source": "/api/ai-chat", "destination": "/api/maintenance" }
# git push → 30s later /api/ai-chat returns maintenance page

# Kill Google Ads (requires your hand until Ads API bootstrap):
# https://ads.google.com/ → Pause Campaign
```

---

## CURRENT STATE SNAPSHOT (2026-04-17)

- ✅ Tracking live on 17 landing pages
- ✅ Supabase schema fixed (lead_events TEXT, telegram_sends table, watchdog view)
- ✅ Unified Telegram sender (durable message_id)
- ✅ E2E 10/10 PASS in production
- ✅ Regression 6/6 PASS in production
- ✅ Daily + weekly + 30-min tasks scheduled
- ⏸️ HF_NOTIFY_SECRET not yet set in Vercel (endpoint 503 fail-closed) — non-blocking; just means /api/notify is unused. Safe.
- ⏸️ Google Ads changes still require browser (until Ads API bootstrap)
- ⏸️ Bing Places: awaiting postcard PIN

---

**This runbook is maintained by me (Claude). Every material change gets committed here.**
