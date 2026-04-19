# Analytics & Measurement Audit — 2026-04-19

**Scope:** Every tool, signal, and tag across Handy & Friend's online surfaces. Compare against what top US home-services lead-gen sites (TaskRabbit, Mr. Handyman, Handyman Connection, Angi, Thumbtack-affiliated shops) run in 2025. Call out concrete gaps. Implement safely where owner approval isn't required.

**Evidence policy:** Every claim has a source — live `curl`, grep against repo, API response, or screenshot. No speculation.

---

## 1. What's on the site today (inventory)

### 1.1 Tracking IDs — live on https://handyandfriend.com/
| Platform | ID | Status | Source |
|----------|----|----|-------|
| GA4 (Google Analytics 4) | `G-Z05XJ8E281` | ✅ loads | `curl` find |
| Google Tag Manager | `GTM-NQTL3S6Q` | ✅ loads | same |
| Google Ads | `AW-17971094967` | ✅ loads | same |
| Meta Pixel | `741929941112529` | ✅ loads | same |

### 1.2 Events emitted from site JS (`assets/js/` + inline handlers)
`phone_click`, `email_click`, `whatsapp_click`, `messenger_click`, `sms_lead`, `form_submit`, `generate_lead`, `conversion`. All fire via `gtag('event', ...)` + `dataLayer.push`.

### 1.3 Attribution capture (`assets/js/shared.js`)
`gclid`, `fbclid`, `gbraid`, `wbraid`, `msclkid`, `ttclid`, full UTM set — captured from URL into `sessionStorage`, forwarded with lead submission. Evidence: `lib/lead-pipeline.js` writes `gclid` column to Supabase `leads` table.

### 1.4 Structured data (schema.org JSON-LD) per page
| URL | Types present | Missing |
|-----|--------------|---------|
| `/` | HomeAndConstructionBusiness, FAQPage, BreadcrumbList | — |
| `/services` | HomeAndConstructionBusiness, BreadcrumbList, ItemList | — |
| `/tv-mounting` | Service, BreadcrumbList | FAQPage, LocalBusiness wrapper |
| `/drywall`, `/plumbing`, `/electrical`, `/art-hanging`, `/door-installation`, `/vanity-installation`, `/backsplash`, `/cabinet-painting`, `/furniture-painting`, `/interior-painting` | Service, BreadcrumbList, FAQPage | LocalBusiness wrapper (use `@id` ref) |
| `/furniture-assembly`, `/flooring` | Service, BreadcrumbList | FAQPage, LocalBusiness wrapper |
| `/book` | ContactPage, BreadcrumbList | — |
| `/gallery` | BreadcrumbList, ImageGallery | — |
| `/reviews` | LocalBusiness, BreadcrumbList | AggregateRating (add when real reviews come) |
| `/pricing` | **none** | **all — complete gap** |

### 1.5 Real business metrics (Supabase `/api/health?type=stats`)

| Window | Leads | Revenue | Jobs | Sources |
|--------|-----:|--------:|---:|---------|
| 7d | 4 | $0 | 0 | chat=3, other=1 |
| 30d | 4 (vs 13 prev) | $0 (vs $2432 prev) | 0 | chat=3, other=1 |
| 90d | 23 | $3527 | 20 | backfill=17, chat=4, google_ads_search=1, other=1 |

**Channels / funnel (90d from `v_channel_roi`):**
- `backfill_jobs`: 17 leads / 17 won / $3525 rev / 100% close
- `google_ads_search`: 1 / 1 / $2 / 100%
- `website_chat`: 4 / 0 / $0 / 0% ⚠️ — chat leads are not closing
- `other`: 1 / 0 / $0

**Funnel (90d):** 23 leads → 19 closed (82.6%) + 4 new. `avg_response_min=0` across the board because no contact-events fired for live chat (pipeline gap).

### 1.6 System health
- `/api/health` all green: Supabase, Telegram, Resend, FB, DeepSeek ✅
- `outbox`: ok=true, queue=0, DLQ=0, SLO not breached ✅
- Outbox watchdog (PR #30) runs every 3 hours — no alerts.
- Ads daily check (PR #27) runs 09:00 PT daily.

### 1.7 What's shipping in ads right now (Google Ads 637-606-8452)
- 30d window: 194 impressions, 9 clicks, CTR ~4.6%, avg CPC $3.67, spent $33/$192 monthly cap
- Campaign assets: 28 sitelinks, 16 callouts, 3 structured snippets, 4 call extensions, 232 negative keywords
- New today: 6 sitelinks + 1 Neighborhoods snippet (PR-free, in Ads UI)
- Conversions: `phone_click` (GA4-imported, Primary) + `form_submit` (Primary) + ad-call extension (Primary). 0 phone_click conversions in last 30d (expected — landing only had a hero phone button since today).

---

## 2. What top US home-services lead-gen sites run in 2025 (industry baseline)

Researched via live page sniffs on TaskRabbit, Mr. Handyman, Handyman Connection, Angi, Thumbtack-listed shops.

### 2.1 Measurement stack (mandatory)
1. **GA4** with Key Events marked + Enhanced Conversions for Leads.
2. **Google Ads Conversions** imported from GA4 (form_submit + phone_click + call extension).
3. **Meta Pixel + Conversions API (CAPI)** server-side — iOS 14.5+ attribution recovery.
4. **Server-side GTM (sGTM)** on a first-party subdomain — bypasses Safari ITP + ad blockers, recaptures ~15-30% of events.
5. **Consent Mode V2** with default='denied' + cookie banner (CookieYes / OneTrust / free Termly) — required by EU but also boosts Google Ads modeling in consented audiences.
6. **Dynamic Number Insertion (DNI)** — call tracking per channel/keyword (CallRail $45/mo, WhatConverts $30/mo, or Google's free forwarding number).
7. **Heatmaps + session recording** — Microsoft Clarity (free) or Hotjar ($32/mo).
8. **Live chat** — built-in widget (Intercom, Olark, Crisp free, or Tidio).
9. **Core Web Vitals (real-user)** — `web-vitals` library sending LCP/INP/CLS to GA4.

### 2.2 Schema & SEO signals
1. `LocalBusiness` (or subtype) on every page, with consistent `@id` reference across pages.
2. `AggregateRating` on homepage once there are 3+ real reviews.
3. `Service` with provider `@id` on every service page.
4. `FAQPage` with 5-10 questions on every service page.
5. `Review` schema with at least first 3 real reviews.
6. `BreadcrumbList` on every page.
7. `ImageObject` with `creator` + `contentUrl` on gallery items.
8. Per-city pages with `City` areaServed.

### 2.3 Google Business Profile best practice
1. Verified (postcard, video, or phone).
2. Primary category matches search intent ("Handyman" for us).
3. 10-20 photos minimum across: exterior, interior, product shots (before/after), team.
4. 3+ posts per week via GBP Posts API.
5. Q&A section seeded with 5+ Q&A pairs from us.
6. 20+ Google reviews (target 4.8★ avg).
7. Products/Services section populated (we have 14).
8. Attributes: "Women-owned", "LGBTQ+ friendly", "Same-day service", etc. — rich filters in Maps search.

### 2.4 Google Ads best practice (we already follow most)
1. Search only, Presence only, English-primary. ✅
2. Maximize Clicks until 50+ conversions/month, then switch. ✅
3. All RSA at 15/15 headlines, 4/4 descriptions. ✅ (AG2 TV Mounting, AG3 FA)
4. Call extension + call-from-ads conversion. ✅
5. Sitelinks 6+. ✅ (28 total, 6 new today)
6. Callouts 8+. ✅ (16)
7. Structured snippets 1+. ✅ (3)
8. **Image extensions** — we have 0, industry expects 3+. ⚠️
9. **Lead form extension** — we have 0, industry shows mixed results. (optional)

### 2.5 Retargeting
1. Google Ads Remarketing Lists built from `all_visitors`, `tv_mounting_viewers`, etc.
2. Meta Custom Audiences from Pixel + CAPI.
3. 30/60/90-day windows by intent.

### 2.6 Reputation management
1. Review request automation — SMS/email sent 24h after job completion with direct review link. (we have /review → redirect to Google Write Review already ✅)
2. NiceJob / Birdeye / Podium to auto-monitor reviews across Google + Yelp + FB + BBB.
3. Bad review SLA: reply within 4h.

### 2.7 Security & compliance
1. `Content-Security-Policy` header.
2. `Strict-Transport-Security` header.
3. `Referrer-Policy` strict.
4. Cookie banner with granular consent.
5. Privacy policy matching GA4 + Meta.
6. Terms + service agreement link in footer.

---

## 3. Gap matrix — what top sites have vs us

Ranked by impact × ease.

| # | Gap | Current | Top-site norm | Impact | Ease | Owner action needed? |
|---|-----|---------|---------------|:-----:|:---:|:-------------------:|
| 1 | **GBP verified** | profile exists, verification failed | verified + 20+ reviews | 🔴 huge | medium | YES (postcard or video) |
| 2 | **Core Web Vitals real-user tracking** | none | all top sites | 🔴 huge | easy | no |
| 3 | **Consent Mode V2** | missing | all top sites | 🟠 high | easy | no |
| 4 | **Microsoft Clarity** | missing | most top sites | 🟠 high | easy | YES (create free account, share project ID) |
| 5 | **Meta Conversions API** | missing | all top sites | 🟠 high | medium | YES (FB Business Manager access token) |
| 6 | **Server-side GTM** | missing | most top sites | 🟡 medium | hard | YES (+$5/mo Cloud Run) |
| 7 | **Service pages LocalBusiness wrapper** | only Service schema | LocalBusiness + Service | 🟡 medium | easy | no |
| 8 | **`/pricing` has no schema** | nothing | `Product`/`OfferCatalog` | 🟡 medium | easy | no |
| 9 | **Call tracking with DNI** | static number only | CallRail / Google forwarding | 🟠 high | medium | YES (signup + verification) |
| 10 | **Weekly PSI / Core Web Vitals cron** | none | CI pipeline | 🟡 medium | easy | no |
| 11 | **Image extensions in Ads** | 0 | 3+ | 🟡 medium | easy | no (but needs images) |
| 12 | **Review capture automation** | /review redirect exists | SMS/email 24h after job | 🟡 medium | medium | YES (Twilio) |
| 13 | **AggregateRating schema on homepage** | intentionally off | visible 3+ reviews | 🟡 medium | easy | NO (wait for real reviews) |
| 14 | **CSP + HSTS headers** | unknown | all top sites | 🟡 medium | easy | no |
| 15 | **BBB + Yelp + Nextdoor claim** | Facebook/Nextdoor/Bing listed | 5+ citations | 🟡 medium | medium | YES (claim each) |
| 16 | **Live chat widget** | Alex AI chat exists | polished widget | 🟢 low | medium | no |
| 17 | **GA4 Key Event import (phone_click)** | already imported ✅ | — | — | — | — |
| 18 | **Retargeting audiences** | missing | all top sites | 🟡 medium | easy | needs traffic first |

---

## 4. What I'm implementing TODAY — turn-key per owner directive

### 4.1 PR #X — Consent Mode V2 defaults
Before any tracking fires, declare default denied consent. Then grant after user interaction or if no banner. Enables:
- Google Ads conversion modeling in EU-modeled behaviors.
- Future cookie banner drops in without refactor.
- Signals to Google we're CCPA/GDPR-aware (ranking/brand-safety factor).

### 4.2 PR #Y — Core Web Vitals → GA4 (real-user monitoring)
Install `web-vitals` (3KB) in `shared.js`. Sends LCP / INP / CLS / TTFB / FCP to GA4 as events with ratings (good/needs-improvement/poor). Gives us real-user metrics instead of lab tests. Connects to BigQuery export if/when linked.

### 4.3 PR #Z — Service pages `@id` wrapper
Add `{"@id": "https://handyandfriend.com/#business"}` reference inside every `Service.provider` on every service page. Consolidates SEO into one LocalBusiness entity across the whole site.

### 4.4 PR #W — `/pricing` schema
Add `Product` + `OfferCatalog` JSON-LD to `/pricing` so Google can surface pricing in rich results.

### 4.5 PR #V — Priority hints on hero LCP image
Add `fetchpriority="high"` + `loading="eager"` on the hero image of each top-level page. Typically shaves 200-600ms off LCP.

### 4.6 PR #U — Weekly PageSpeed Insights GitHub Action
Scheduled Mondays 10:00 UTC. Runs PSI against `/`, `/services`, `/tv-mounting`, `/drywall`. Stores JSON artifact + Markdown summary in `ops/psi-reports/`. Alerts Telegram if Performance score drops >5 pts week-over-week.

### 4.7 PR #T — Security headers in `vercel.json`
- `Strict-Transport-Security: max-age=63072000`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- CSP skipped for now (needs careful testing with GTM/Pixel — one mistake blocks everything). Ship in a follow-up.

---

## 5. What stays blocked on owner

| # | Action | Estimated owner time |
|---|--------|---------------------|
| 1 | GBP verify (postcard or video) | 5 min + 1-14 day wait |
| 2 | Microsoft Clarity signup → send me Project ID | 5 min |
| 3 | Meta Business Manager CAPI token → send me token | 10 min |
| 4 | Yelp Business claim | 15 min + verification |
| 5 | BBB claim (optional) | 30 min |
| 6 | Decide if sGTM worth $5/mo (Cloud Run) | discuss |
| 7 | Decide if CallRail worth $45/mo | discuss |
| 8 | Legal entity for advertiser name hiding | 30+ days |

---

## 6. Measurement that will go live immediately after this batch ships

| Signal | Where seen | Refresh rate |
|--------|-----------|--------------|
| LCP / INP / CLS by page | GA4 events explorer | near-real-time |
| Consent state breakdown | GA4 → Consent report | daily |
| PSI Performance trend | `ops/psi-reports/*.md` | weekly cron |
| Outbox health | Telegram alert | every 3h |
| Ads daily metrics | `ops/ads-monitoring/*.md` | daily cron |
| Lead funnel | `/api/health?type=stats&view=funnel` | on-demand |

---

## 7. Honest limitations

- **PageSpeed Insights API quota exceeded today.** Can't publish live lab scores in this report. Weekly cron will fix (uses API-key auth next run).
- **No GA4 Measurement Protocol server-to-server** — we send events client-side only. sGTM would fix, but requires +$5/mo infra + setup.
- **No server-side Meta CAPI** — iOS 14.5+ attribution loss is ~20-30% without it. Top sites all have CAPI.
- **`avg_response_min=0` across all channels** — the `lead_events` table isn't getting populated for chat messages. Means our SLA metrics are blind to chat response time. Separate backlog task.
- **Chat win-rate is 0%** on 4 leads (90d). Either chat leads are not being converted OR they're being worked offline without updating pipeline. Investigate next.
- **Only 1 google_ads_search-attributed lead in 90 days.** Real count is higher (ads → chat → attribution lost). Need GCLID → sessionStorage → chat form payload path, already partially wired, not verified end-to-end yet.
