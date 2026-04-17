# ads_spend signal — enablement plan

**Status:** UNKNOWN risk in recovery-ledger Open Risks (blocks Task 0.2 replacement alert).
**Owner:** Sergii (decision), Agent A (implementation once credentials arrive).
**Last updated:** 2026-04-17 (Agent A session)

---

## Why this matters

Task 0.2 prescribed a replacement alert: *"real_leads = 0 AND ads_spend > 0 for 48h"* — that's the only way to auto-distinguish:

- (a) *no leads because no ads traffic* (expected, non-urgent)
- (b) *no leads despite ads traffic* (P0 — ad money burning without pipeline)

Without `ads_spend`, the system silently degrades from P0-detecting to
P0-blind, and the operator finds out when the monthly invoice arrives.

---

## Three concrete paths (pick one)

### Path A — Google Ads API (production-grade, ~2-4h setup)

**Prereq:** Google Ads developer token + OAuth refresh token on the
`2133611700c@gmail.com` MCC-linked account (637-606-8452).

**Steps:**
1. In Google Ads UI, Tools → API Center → request *Basic access* developer token. Auto-approved for managed accounts; otherwise 48h review.
2. Generate OAuth refresh token via `oauth2l` CLI or `google-ads-python` quickstart. One-time.
3. Add secrets to Vercel production env:
   ```
   GOOGLE_ADS_DEVELOPER_TOKEN
   GOOGLE_ADS_OAUTH_REFRESH_TOKEN
   GOOGLE_ADS_CUSTOMER_ID=6376068452   # no dashes
   ```
4. Add secrets to GitHub Actions repository secrets (same names).
5. New script `scripts/pull_ads_spend_daily.py` — query `customer` + `campaign_budget` resources via REST:
   ```
   POST https://googleads.googleapis.com/v14/customers/6376068452/googleAds:searchStream
   body: { "query": "SELECT metrics.cost_micros, segments.date
                     FROM campaign
                     WHERE segments.date DURING LAST_7_DAYS" }
   ```
6. Write results into new Supabase table `ads_spend_daily(date, spend_usd, source)` via PostgREST POST.
7. Schedule via new GH Actions workflow `daily-ads-spend.yml` — 13:00 UTC.
8. Flip Task 0.2 replacement alert from UNKNOWN → active in `api/process-outbox.js` daily_report handler.

**Cost:** $0 (Basic access free).
**Risk:** refresh token expires if inactivity > 6 months; mitigated by the daily cron.

### Path B — Chrome MCP scrape (fallback, ~1h setup)

When API access isn't available (e.g. token in review), scrape the
Google Ads UI:

1. Sergii grants Chrome MCP access to the Google Ads web UI.
2. New skill `skills/ads-spend-scraper/` (extends existing OpenClaw
   pattern):
   - Navigate to `ads.google.com` → campaigns → "Last 7 days" column.
   - Extract "Cost" column + "Day" segment via table-row reads.
   - Write same shape into `ads_spend_daily`.
3. Same downstream alert wiring as Path A.

**Cost:** Chrome MCP session time; LLM tokens minimal (structured extract).
**Risk:** HTML drift; mitigated by weekly skill-health check.

### Path C — Manual CSV upload (stopgap, 5min/week)

If neither API nor Chrome MCP is available this week:

1. Every Monday, Sergii downloads "Campaigns → Last 7 days → Cost" CSV.
2. Drops it in `ops/ads-spend/weekly-YYYY-MM-DD.csv`.
3. New script `scripts/import_ads_spend_csv.py` (trivial) watches that
   dir via GH Actions workflow_dispatch and inserts into
   `ads_spend_daily`.

**Cost:** 5 min/week of Sergii's time.
**Risk:** weekly granularity vs daily; replacement alert fires at
worst 7 days late instead of 48 hours.

---

## What I need from Sergii to proceed

One of:

- **"Path A"** + grant developer token + generate OAuth refresh token → I build the daily script + supabase table + alert wiring.
- **"Path B"** + grant Chrome MCP access to ads.google.com → I build the scraper skill.
- **"Path C"** + first CSV drop → I build the importer + switch the alert to weekly granularity.

Until one path is picked, the risk stays `UNKNOWN` and the recovery
ledger Open Risks row stays open.

---

## Skeleton scripts (ready, blocked on credentials)

```
scripts/
  pull_ads_spend_daily.py          # Path A — empty skeleton, wired to call shape
  import_ads_spend_csv.py          # Path C — empty skeleton, watches ops/ads-spend/

supabase/migrations/
  XX_ads_spend_daily.sql           # table DDL — unowned by Agent A,
                                   # Agent B gets a ledger-note to draft
```

Agent A cannot provision either the Google Ads API credentials or the
Chrome MCP grant — both require Sergii's action in third-party UIs.
The moment one lands, the rest is mechanical.

---

## Related ledger entries to flip

- **Open Risk row "2026-04-17 — ads_spend signal unavailable"** → close
  with evidence pointing at `ads_spend_daily` rows + daily alert test.
- **Task 0.2** (currently PASS — old alert disabled) → add a
  sub-task 0.2.b "replacement alert enabled" with its own PASS criteria.
