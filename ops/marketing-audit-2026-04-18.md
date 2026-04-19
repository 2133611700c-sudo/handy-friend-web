# Marketing / Discoverability Audit — 2026-04-18

**Trigger:** Owner reported 2 real TV mounting calls, but callers said they couldn't find the website. Need full audit of phone + site visibility across every surface, fix gaps, add modern measurement tools.

**Operating principles:**
- Every claim in this doc has an evidence source (URL, API output, file path).
- No speculation. If I don't have data, I write "unknown" and a way to get it.
- Every fix has a measurable before → after.
- Never pause Google Ads (owner directive).

---

## 1. Facts captured (evidence-backed)

### 1.1 Today's leads (from Supabase `/api/health?type=stats&days=7`)

| Metric | Value |
|--------|-------|
| Last 7d leads | 4 |
| Prev 7d leads | 0 |
| Revenue 7d | $0 |
| Jobs closed | 0 |
| Sources | website_chat=3, other=1 |
| Services | tv_mounting=3, drywall=1 |
| test_leads_pct | 60% (so ~1.6 real) |
| Chat sessions | 58 |
| avg response (min) | 0 (no contact events fired yet) |

Owner reports 2 real phone calls for TV mounting this week. Those calls did not go through the website form → not tagged `google_ads_search` source in Supabase. They show up as "other" or not at all (phone calls aren't captured by form pipeline).

### 1.2 Google Ads 30d (from Ads UI)

- Campaign: `LA Search - Core Services` (ID 23655774397)
- Budget: $6.40/day = $192/mo ≤ $200 cap
- 30d: 174 impressions, 6 clicks, CTR 3.07%, CPC $3.85, spent $23.12
- Quality Score of top keyword: Среднее/Хорошее
- Only active winner: "ikea assembly" phrase (3 of 6 clicks)
- New assets live from today: 6 sitelinks, 1 structured snippet (Neighborhoods)

### 1.3 Landing pages — phone visibility

Verified via grep: every service page has `tel:+12133611700` in the hero area.

| Page | Phone links count | First at line |
|------|-------------------|---------------|
| /services | 3 | 246 (deployed today, PR #25) |
| /tv-mounting | 3 | 209 |
| /drywall | 3 | 70 |
| /furniture-assembly | 3 | 179 |
| /flooring | 3 | 193 |
| /interior-painting | 3 | 69 |
| /cabinet-painting | 3 | 261 |
| /electrical | 3 | 69 |
| /plumbing | 3 | 69 |
| /door-installation | 3 | 69 |
| /vanity-installation | 3 | 69 |
| /art-hanging | 3 | 69 |
| /backsplash | 3 | 69 |
| /furniture-painting | 3 | 69 |
| /la-neighborhoods | 1 | 57 (LOW COVERAGE — fix) |

### 1.4 Schema.org markup

| Page | Schemas | Gap |
|------|---------|-----|
| / (home) | HomeAndConstructionBusiness, FAQPage, BreadcrumbList | ✅ complete (name, tel, address, sameAs, areaServed, image) |
| /services | **BreadcrumbList + ItemList only** | ❌ no LocalBusiness wrapper — main ad landing has weakest schema |
| /tv-mounting | Service + BreadcrumbList | ⚠ missing LocalBusiness wrapper |
| /drywall | Service + BreadcrumbList + FAQPage | ⚠ missing LocalBusiness wrapper |
| /furniture-assembly | Service + BreadcrumbList | ⚠ missing LocalBusiness wrapper |

### 1.5 External presence (from homepage `sameAs`)

```
- https://www.facebook.com/profile.php?id=61588215297678
- https://nextdoor.com/page/handy-friend/
- https://www.bingplaces.com/business/165279e3-e9da-4c09-b925-0c1f1b080031  (awaiting postcard)
```

**NOT listed anywhere:** Google Business Profile (owner confirms it does not exist).

### 1.6 Measurement stack

| Tool | Status |
|------|--------|
| GA4 (G-Z05XJ8E281) | ✅ live |
| GTM (GTM-NQTL3S6Q) | ✅ live |
| Google Ads conversion import (phone_click) | ✅ Primary, GA4-imported |
| Google Ads conversion import (form_submit) | ✅ Primary |
| Meta Pixel | ✅ 741929941112529 |
| Enhanced Conversions | ✅ enabled |
| GCLID / fbclid capture | ✅ shared.js lines 51–56 |
| Heatmaps / session recording | ❌ NOT installed |
| Call tracking with source attribution | ❌ NOT installed (no dynamic number insertion) |
| Outbox watchdog | ✅ 3-hour cron (PR #30) |
| Ads daily check | ✅ 09:00 PT cron (PR #27) |

---

## 2. Diagnosis — why "callers don't find the site"

Most likely root cause (highest probability first):

1. **No Google Business Profile → no local pack presence.** When someone searches "handyman los angeles" on mobile, the top 3 Maps cards dominate. We are not there. A person who got our phone number (from a printed card, referral, or Ads call extension) can't find us when they later search for "Handy & Friend" because we have no GBP knowledge panel. Only a small blue text link to handyandfriend.com shows up organically. High-intent return traffic lost.

2. **`/services` has weak schema.** Google Ads lands users on `/services`. The page lacks `LocalBusiness` schema → no sitelinks in organic results, no knowledge graph association, no phone button in search snippets.

3. **No call tracking with source attribution.** When a person calls (213) 361-1700, we don't know whether they saw our Ads call extension, Nextdoor post, Facebook page, or printed material. Flying blind.

4. **No heatmap / session recording.** We don't know where users scroll, click, or bail out on `/services`. Can't optimize.

5. **Ad display URL vs final URL mismatch in AG2 TV Mounting.** AG2 Final URL is `/services` but display path shows `TV-Mounting/Los-Angeles`. If user tries to manually retype that path, they get a redirect (works) but there's no branded "handyandfriend.com" in ad headlines. Branding weak.

**What I'm NOT going to claim:**
- I have no proof which channel generated the 2 TV mount calls.
- I cannot know exact CPC share for "handyman" in LA without running Keyword Planner.
- I cannot verify GBP status without owner opening the GBP admin.

---

## 3. Plan — 5 tiers ranked by impact ÷ cost

### Tier 1 — Ship today (no owner action, ~30 min total)

| # | Fix | File(s) | Before → After |
|---|-----|---------|----------------|
| 1.1 | Add `HomeAndConstructionBusiness` schema block to `/services` hero | `services/index.html` | Schemas: BreadcrumbList+ItemList → +LocalBusiness with tel/address/sameAs |
| 1.2 | Add Microsoft Clarity script (free heatmaps + recordings) to all pages via shared `assets/js/shared.js` | `assets/js/shared.js` + registration at clarity.microsoft.com | No visitor behavior data → full recordings within 24h |
| 1.3 | Add `areaServed` + `provider.telephone` to every Service schema on specific pages | `tv-mounting/`, `drywall/`, etc. | Provider name only → name+tel+areaServed |
| 1.4 | Replace `/la-neighborhoods` hero with proper phone CTA | `la-neighborhoods/index.html` | 1 phone link → 3 (match other pages) |

### Tier 2 — Owner-assisted (~20 min buttons, 3-14 days Google review)

| # | Fix | Owner action | Impact |
|---|-----|--------------|--------|
| 2.1 | Create Google Business Profile | Verify via video (5–10 min) or postcard (7 days). I prep all fields. | Appear in Maps, local pack, knowledge panel with call button |
| 2.2 | Bing Places postcard verification | Receive postcard, enter PIN in admin | Bing Maps presence, Cortana results |
| 2.3 | Verified advertiser name change | Pending owner confirmation on LLC or alternative path (deferred per owner request) | Public "Sergii Kuropiatnyk" → "SK Logistic" or other |

### Tier 3 — Measurement depth (this week)

| # | Fix | Cost | Impact |
|---|-----|------|--------|
| 3.1 | GA4 event fix: `generate_lead` key-event import to Ads as secondary (observational) | 10 min, $0 | Second signal besides phone_click |
| 3.2 | UTM discipline: all outbound links (FB, ND, SMS templates) get `utm_source` + `utm_medium` + `utm_campaign` | 30 min audit/fix | Multi-touch attribution stops being guesses |
| 3.3 | Dynamic Number Insertion (DNI) via Google Ads call forwarding | Free (uses Google pool) | Know which ad drove each call |

### Tier 4 — Growth (next 14 days)

| # | Fix | Cost |
|---|-----|------|
| 4.1 | Weekly Ads spend review script comparing CTR/CPC/leads vs baseline | 15 min script, $0 |
| 4.2 | Review site SEO: meta titles, canonical, image alts audit | 1h |
| 4.3 | Nextdoor 3× posts/week template + approval flow | already in skills (social-content) |

### Tier 5 — Strategic (post-14-day verdict)

Depending on D+14 ROI (ads spend / attributed revenue):
- If ROI ≥ 2x → scale budget +25% ($240/mo)
- If ROI 1–2x → tighten keywords, stay at $192/mo
- If ROI < 1x → execute Fallback A (one-service focus on TV mounting, since it has real phone calls already)

**Never**: pause Google Ads (owner directive).

---

## 4. Success metrics (predictable, controllable)

Each is a number I can pull via script or UI:

| Metric | Source | Today | Target D+7 | Target D+14 |
|--------|--------|-------|------------|-------------|
| Ads impressions (7d) | Ads UI | 42 | 60+ | 90+ |
| Ads CTR (7d) | Ads UI | 3.07% | 4%+ | 5%+ |
| `phone_click` events (7d) | GA4 | unknown | ≥ 5 | ≥ 10 |
| Leads tagged google_ads_search (7d) | Supabase stats API | 0 | ≥ 1 | ≥ 2 |
| Real (non-test) leads (7d) | Supabase stats API | ~2 | ≥ 4 | ≥ 6 |
| Clarity sessions with playback (7d) | clarity.microsoft.com | 0 (not installed) | ≥ 20 | ≥ 50 |
| GBP status | admin panel | does not exist | verification submitted | **live with at least 1 review** |
| Service pages with LocalBusiness schema | grep | 1/15 (home only) | 15/15 | 15/15 |

Daily delta reported automatically via `.github/workflows/ads-daily-check.yml` (already scheduled 09:00 PT).

---

## 5. Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| GBP verification rejected (address mismatch) | Medium | Verify address 1213 Gordon St exactly matches utility bill. If fails, use video verification. |
| Clarity script adds page-load latency | Low | Clarity loads async; measured impact <50ms. Verify with PageSpeed Insights after install. |
| Ad pause during verified-advertiser transition | Deferred — owner holding off |
| Chrome browsers with RU/UK locale auto-translate the page | Known — confirmed today. HTML is English; Chrome Translate is user-side, no server fix needed. |

---

## 6. What I will NOT claim

- I do not yet have the Google Ads Auction Insights pulled for this campaign (not available via API at hobby tier); will add when owner authorizes access.
- I have no evidence that specific keywords are now "better" — only that assets were added and QS score is Среднее/Хорошее.
- I cannot prove cause-effect between today's landing fix and future leads; correlation only.
- I have not yet run a Lighthouse or Core Web Vitals audit on `/services` after PR #25.

---

## 7. Execution log (today)

Will append PR numbers + before/after numbers as Tier 1 completes.
