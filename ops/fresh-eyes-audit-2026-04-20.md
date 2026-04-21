# Fresh-Eyes Full Audit — 2026-04-20

**Brief:** Owner asked for a fresh-eyes audit of everything — Google Ads settings relative to the June 1 2026 budget-algorithm change, the auto-apply / personalized recommendations toggle, and phone/email/site visibility across every surface. Pretend prior work didn't exist; check what IS live on production.

**Procedure followed:** New Chrome-work rule — explicit `authuser=1` URL pin, screenshot avatar verification before any action, do not click banners that conflict with `CLAUDE.md` (auto-apply recommendations, PMax invitations, Smart campaigns).

**Account:** 2133611700c@gmail.com — Handy Friend (Google Ads 637-606-8452). All actions verified against this identity.

---

## 1. Google Ads — June 1 2026 budget rule impact

### 1.1 What changes on 1 June 2026

Google is replacing the old "daily × days-shown" pacing with "daily × 30.4 per month". Hard caps unchanged.

| Metric | Current rule (through 31 May 2026) | New rule (from 1 June 2026) |
|--------|------------------------------------|-----------------------------|
| Daily spend target | daily budget each active day | Monthly target / days-in-month |
| Monthly spend cap | daily × number of days ads showed | **daily × 30.4 = $194.56** |
| Daily hard cap | daily × 2 = $12.80 | daily × 2 = $12.80 (no change) |
| Monthly hard cap | daily × 30.4 | daily × 30.4 (no change) |

### 1.2 Our current configuration

- Daily budget: **$6.40** (confirmed in UI)
- Ad schedule: **Mon–Sat 08:00–21:00**, Sun off (verified via Ad Schedule UI today; 08-21 not 07-20 as the plan earlier assumed)
- Active hours per week: 13 × 6 = 78 h (out of 168 = 46% clock coverage)
- 30-day actuals (as of 19 Apr): 194 impressions, 9 clicks, CPC $3.67, **spent $33.00** — far below both daily target and monthly cap due to low impression share on most keywords

### 1.3 Math — what the 1 June change means for us

| | Now | After 1 June |
|---|---|---|
| Monthly target | daily × active_days = $6.40 × 26 ≈ $166 | $6.40 × 30.4 = **$194.56** |
| Daily hard cap | $12.80 | $12.80 |
| Monthly hard cap | $194.56 | $194.56 |

**Direction:** Google will try to spend **~17% more per month** at the same daily budget ($194.56 vs $166 effective target). Still within the $200/mo policy cap.

**Concentration risk:** We only show 6 of 7 days and 13 of 24 hours, so Google must pack the new higher monthly target into the same narrow window. Per-active-hour spend should rise ~17% unless the daily $12.80 ceiling clips it.

### 1.4 Recommendation — June 1

**Do nothing pre-emptively.**

- Keep daily budget at $6.40 (monthly cap matches our $200 policy ceiling exactly).
- Keep schedule at Mon–Sat 08:00–21:00. It matches peak handyman-search intent in LA and Saturday is our highest-CTR day (15.00% CTR on 20 imps this month).
- **Monitor** daily spend in the first 7 days after 1 June via the existing `scripts/ads_daily_check.sh` cron. If Google routinely hits $12.80 cap before 18:00 local and we still have impression share to buy, we can raise daily budget to $6.80 ($206.72 monthly cap — slightly above $200 policy, needs owner approval).
- **Do NOT** widen the schedule just to spread spend. Lower-intent hours would dilute CTR and QS.

### 1.5 Auto-apply recommendations — verified state

Navigated to `ads.google.com/aw/recommendations/autoapply?authuser=1`:

- **"Оптимизация объявлений — Выбрано: 0 из 7"** ✅
- **"Развитие бизнеса — Выбрано: 0 из 14"** ✅

All 21 auto-apply rule categories are unchecked. This is **compliant with CLAUDE.md**: "Авто-применение рекомендаций Google — всегда ВЫКЛ (кроме 'Удалить дубли ключевых слов')".

Top-of-page prompt "Улучшайте свои объявления, применяя рекомендации автоматически — Подтверждение" / "Включите персонализированные рекомендации для вашего бизнеса" **was NOT clicked.** This is Google's repeated invite to enable auto-apply; policy says to refuse indefinitely.

### 1.6 Settings still compliant with `CLAUDE.md` policy

| Policy | Required | Actual | Pass? |
|--------|----------|--------|:---:|
| Budget ≤ $200/mo | $200 | $194.56 effective after 1 June | ✅ |
| PMax | NO | No PMax campaigns exist | ✅ |
| AI Max / Smart | NO | None | ✅ |
| Broad match | NO (until 50+ conv/mo) | 0 broad keywords in LA Search | ✅ |
| Display / Partners | NO | Networks: Google Search only | ✅ |
| tCPA / tROAS / Max Conv | NO (until 50+ conv/mo) | Strategy: Maximize Clicks | ✅ |
| Auto-apply recs | OFF | 0 of 7 + 0 of 14 selected | ✅ |
| Location | Presence only | Los Angeles city, Presence only | ✅ |
| Campaigns | Active, not paused | 1 (LA Search - Core Services), Включено | ✅ |

Only warning on campaign status: "Допущено (с ограничениями) — Недостаточно релевантных ключевых слов". This is a QS hint, not a block. Our 232 negative keywords and tight phrase/exact targeting deliberately keep volume low; the warning is expected and OK.

---

## 2. Phone / email / site visibility across every surface

### 2.1 Sitewide phone link audit

Counted `tel:+12133611700` occurrences on every page (after PR #39 merged):

| Page | phone | email | sms | wa |
|------|------:|------:|----:|---:|
| / | 10 | 2 | 0 | 14 |
| /services | 3 | 2 | 1 | 1 |
| /tv-mounting | 3 | 1 | 0 | 1 |
| /drywall | 3 | **2** (was 0) | 0 | 1 |
| /furniture-assembly | 3 | 1 | 0 | 1 |
| /flooring | 3 | 1 | 0 | 1 |
| /interior-painting | 3 | 1 | 0 | 1 |
| /cabinet-painting | 3 | 1 | 0 | 1 |
| /electrical | 3 | **2** (was 0) | 0 | 1 |
| /plumbing | 3 | **2** (was 0) | 0 | 1 |
| /door-installation | 3 | **2** (was 0) | 0 | 1 |
| /vanity-installation | 3 | **2** (was 0) | 0 | 1 |
| /art-hanging | 3 | **2** (was 0) | 0 | 1 |
| /backsplash | 3 | **2** (was 0) | 0 | 1 |
| /furniture-painting | 3 | **2** (was 0) | 0 | 1 |
| /gallery | 2 | 1 | 0 | 1 |
| /reviews | 2 | 1 | 0 | 1 |
| /pricing | **2** (tel format fixed) | 0 (React CTA, no classic footer) | 0 | 1 |
| /book | 3 | 1 | 0 | 3 |

**Fixed in PR #39:**
1. `/pricing` had 2 × `tel:12133611700` (missing `+`). Normalized.
2. 8 service pages had email missing from footer. Added `mailto:hello@handyandfriend.com` right after WhatsApp line.

### 2.2 Schema markup — phone/address presence

`HomeAndConstructionBusiness` schema with `@id="https://handyandfriend.com/#business"` carries the canonical phone, address, email, opening hours. Referenced on:

- `/` — full LocalBusiness block (telephone +12133611700, address 1213 Gordon St)
- `/services` — full LocalBusiness block + 12 nested `@id` references from ItemList services
- `/tv-mounting`, `/drywall`, `/furniture-assembly` etc. — Service schema with `provider.@id` reference resolving back to the root business

Rich Results Test today shows 3 valid blocks on `/services` with 0 warnings (Breadcrumbs + LocalBusiness + Organization).

### 2.3 Meta description mentions phone

| Page | Description includes (213) 361-1700? |
|------|:-------------------------------------:|
| / | ✅ |
| /services | ✅ |
| /tv-mounting | ✅ |
| /pricing | ❌ — low priority |

### 2.4 Off-site presence (controlled)

- **GBP (Handy & Friend, owned by 2133611700c@gmail.com):** Profile exists, all contact fields correct (phone +12133611700, website handyandfriend.com, FB linked, hours Mon-Sat 08:00-19:00 after today's fix). **⚠ Verification failed** — profile invisible to search users until owner completes video or postcard verification.
- **Facebook page** (ID 61588215297678): linked, auto-connected via `FB_PAGE_ACCESS_TOKEN` for Messenger webhook. Contact info inherited from schema.
- **Nextdoor business page** (profile_id 176256543): claimed, linked in site `sameAs`.
- **Bing Places** (bizid 165279e3-e9da-4c09-b925-0c1f1b080031): filed, awaiting postcard PIN per MEMORY.

### 2.5 Google Ads extensions visibility

- 28 sitelinks (6 new from today)
- 16 callouts including "Clear pricing" (CTR 7.41% — best performer)
- 3+ structured snippets (service catalog + Neighborhoods added today)
- **4 call extensions** all on (213) 361-1700 — direct dial from ad surface
- Image extensions: 0 (industry expects 3+; gap)

---

## 3. What's live on prod today (turn-key verification)

Ran 8 live checks on production (evidence in `curl`):

| # | Check | Expected | Actual | Pass |
|---|-------|----------|--------|:---:|
| 1 | Consent Mode V2 + web-vitals in shared.js | ≥2 matches | 4 | ✅ |
| 2 | LocalBusiness schema on /services | ≥1 | 2 | ✅ |
| 3 | /services hero CTAs | ≥2 | 6 | ✅ |
| 4 | /pricing OfferCatalog | ≥2 | 2 | ✅ |
| 5 | Security headers on / | 5 | 5 | ✅ |
| 6 | Nested `@id` refs on /services | ≥10 | 12 | ✅ |
| 7 | Scheduled workflows (ads-daily-check, outbox-watchdog, weekly-psi) | 3 | 3 | ✅ |
| 8 | Health endpoints (outbox ok, queue=0, dlq=0) | all green | all green | ✅ |

---

## 4. Gaps that remain — owner action required

Ranked by impact:

| # | Gap | Impact | Owner time |
|---|-----|--------|-----------|
| 1 | **GBP verification** (video or postcard) | profile invisible in Maps / knowledge panel | 5 min + 1-14 d wait |
| 2 | **Microsoft Clarity** (signup → Project ID to me) | no heatmaps / session recordings | 5 min |
| 3 | **PSI_API_KEY** GitHub secret | weekly PSI cron hits anonymous 100/day quota | 5 min |
| 4 | **Meta Conversions API** token | iOS 14.5+ attribution loss | 10 min |
| 5 | **Yelp Business claim** | citation parity with TaskRabbit/Mr Handyman | 15 min |
| 6 | **Ads image extensions** — no images attached to campaign | industry expects 3+ | needs image assets |
| 7 | **Legal entity path** (SK Logistic DBA or LLC) | public advertiser name still "Sergii Kuropiatnyk" | 30+ d |

---

## 5. PRs merged this session (for audit trail)

| # | Title | Files |
|---|-------|-------|
| 25 | services hero Call/Text/Book CTA | services/index.html |
| 26 | 14-day ops plan + daily check cron | ops/, scripts/ |
| 27 | ads-daily-check scheduled workflow | .github/workflows/ |
| 28-29 | Call Conversion audit → correction | docs |
| 30 | outbox 3-hour watchdog cron | .github/workflows/ |
| 31 | /services LocalBusiness schema + marketing audit | services/, ops/ |
| 32 | @id reference refactor (0 schema warnings) | index.html, services/ |
| 33 | Google services session report | ops/ |
| 36 | Consent V2 + Web Vitals + /pricing schema + sec headers + PSI cron | shared.js, pricing/, vercel.json, workflows/, scripts/ |
| 37-38 | Merge sequence for analytics batch | — |
| **39** | **Contact parity — 8 email footers + pricing tel format** | **9 files** |

---

## 6. What changed vs the marketing-audit-2026-04-18 baseline

- `/services` now has full LocalBusiness schema (was: BreadcrumbList + ItemList only).
- All service pages now carry `@id` reference to the single root business entity.
- Real-user Core Web Vitals now flowing to GA4.
- Consent Mode V2 defaults in place.
- `/pricing` now has 16-offer JSON-LD (was: no schema at all).
- 5 security headers on every response.
- Weekly PSI cron scheduled.
- All 14 service pages show email in footer (was: 6 of 14).
- `/pricing` tel URL correct per RFC 3966.

---

## 7. Honest limitations

- The 1-June impact math assumes Google's new algorithm behaves exactly as described. Google's actual behaviour after rollout may differ; monitor via `scripts/ads_daily_check.sh` and adjust.
- Impression share in Google Ads for this campaign is very low — we don't yet know whether the extra monthly budget (+17% after June 1) will translate to more clicks or just higher CPC on the same hours.
- GBP verification is the single biggest visibility lever and remains blocked on owner (needs phone number or address to receive postcard / video).
- No way to audit Google Business Profile Posts cadence without owner completing verification first.
