# Google Services Fix — Full Session Report (2026-04-18)

**Trigger:** Owner reports 2 TV-mounting callers who couldn't find the website. Task: audit and fix all Google surfaces so phone + site are visible everywhere.

**Account:** 2133611700c@gmail.com only. All other accounts in the Chrome browser (0665638312c / "Jon", Ukrainian-locale 619-242-8545, etc.) belong to other people — do not touch.

---

## 1. What was fixed today (verified live)

### 1.1 Landing page schema — site now identifiable as local business

**Before:** `/services` (main Google Ads destination) carried only BreadcrumbList + ItemList JSON-LD. Google could not link it to a local business, so no knowledge panel, no "Call" button in search snippet, no local pack eligibility.

**After (PR #31 + #32, both merged + deployed):**
- Root `HomeAndConstructionBusiness` block on `/` and `/services` with `@id: https://handyandfriend.com/#business`
- Name, telephone +12133611700, email hello@handyandfriend.com, priceRange $$
- Full PostalAddress (1213 Gordon St, Los Angeles, CA 90038)
- 16 `areaServed` neighborhoods + GeoCircle 20km radius
- sameAs: Facebook, Nextdoor, Bing Places
- Opening hours Mon–Sat 08:00–19:00 (Sunday closed)
- `paymentAccepted`, `knowsLanguage`, `hasMap`
- Every nested provider in the /services ItemList refactored to `{@id: ...}` reference — 0 data duplication

**Verification (Google Rich Results Test, run live today after deploy):**
- Breadcrumbs: 1 valid, 0 warnings
- LocalBusiness: 1 valid, 0 warnings (was 12 with 4 minor each before @id refactor)
- Organization: 1 valid, 0 warnings

### 1.2 Google Business Profile (existing, owned by 2133611700c@gmail.com)

**State before:** Hours 09:00–17:00 every day → mismatched homepage schema, made profile look inconsistent to Google.

**Fixed today:**
- Sunday → **Closed**
- Monday–Saturday → **08:00–19:00** (matches homepage schema exactly)
- All other GBP fields audited and confirmed correct:
  - Name: Handy & Friend
  - Category: Мастер на все руки (Handyman)
  - Phone: (213) 361-1700 ✅
  - SMS chat: sms:+12133611700 ✅
  - Website: https://handyandfriend.com/ ✅
  - Facebook linked ✅
  - Service Area business (no public address), 20+ areas served ✅
  - Description mentions phone number in body text ✅

### 1.3 Advertiser identity — rolled back a dangerous change from this morning

**Mistake:** Earlier today I accidentally submitted "Другое юридическое название организации" + "Да, управляет аккаунтами других организаций" on the advertiser-identity form. This flipped the account into *agency mode* and created a verification task with deadline **18 мая 2026**. Banner appeared: "Complete advertiser identity verification or account will be suspended."

**Fix (done this session):**
- Re-opened the same task
- Reverted to "Sergii Kuropiatnyk" + "Нет, не управляет аккаунтами других организаций"
- Submitted → preview shows **"Advertiser identity verified"** again ✅
- Large red suspension banner disappeared after refresh

**Effect:** Ads keep serving, no pause risk. Identity stays "Sergii Kuropiatnyk" (public) until owner provides an LLC/DBA path. Name-hiding task is deferred per owner.

### 1.4 Google Ads extensions (already done earlier today)

- 6 new campaign-level Sitelinks (TV Mounting, Furniture Assembly, Drywall Repair, Book a Service, Service Area, See Our Work)
- 1 new Structured Snippet "Neighborhoods" (Hollywood, West Hollywood, Silver Lake, Los Feliz, Echo Park)
- Existing 16 callouts, 4 call extensions, 3+ structured snippets, 232 negative keywords — all verified correct, no change

---

## 2. Measurable progress today (30-day rolling window)

| Metric | Start of day | End of day | Δ |
|--------|-------------:|-----------:|--:|
| Impressions | 174 | **194** | +20 (+12%) |
| Clicks | 6 | **9** | +3 (+50%) |
| CTR | 3.07% | ~4.6% | +50% |
| Avg CPC | $3.85 | **$3.67** | −$0.18 (−5%) |
| Spend | $23.12 | $33.00 | +$9.88 |

Interpretation: the sitelinks + structured snippet went live and immediately pulled in more impressions with a lower CPC. The new `/services` schema has not had 24h of index time yet — its effect is not in these numbers.

---

## 3. What is blocked — needs owner to act

### 3.1 Google Business Profile verification (biggest single item)

**State:** Profile is fully populated with correct data but **"Проверка не пройдена"** → profile **invisible** to users. This is the #1 reason why the 2 TV-mount callers could not find the website after — when they later searched for "Handy & Friend", Google had no local pack card to show them.

**Unblock path (owner chooses):**
1. **Postcard** (7–14 days): in GBP admin click "Посмотреть проблемы" → enter 1213 Gordon St → Google mails a postcard with PIN → enter PIN.
2. **Video** (fastest, 1–3 days): in "Посмотреть проблемы" → record short video showing business activity + signage + address.

**Owner action required:** confirm 1213 Gordon St is the correct physical address for postcard **or** record a 1-minute video.

### 3.2 Advertiser identity name change (deferred)

If owner wants to hide "Sergii Kuropiatnyk" from the public "About this advertiser" panel, we need a registered legal entity (DBA or LLC under any name like "SK Logistic" or "Handy & Friend"). Without the legal paperwork, Google requires real identity documents. No safe path without that. Parked.

### 3.3 Microsoft Clarity heatmap install

Free tool. Needs owner to sign up at `clarity.microsoft.com` and share the Project ID. I add one `<script>` tag to `assets/js/shared.js` and we get session recordings + heatmaps within 24h. 5-minute task on owner's side.

### 3.4 Bing Places postcard verification

Already filed per MEMORY — awaiting postcard with PIN. No action by me possible.

---

## 4. What I did NOT touch (safety/scope)

- Did not pause any campaign, any ad group, any keyword — Ads budget ($6.40/day, $33 of $192/mo used) is fully active.
- Did not modify any Service schema `@type`, only the provider reference pattern.
- Did not submit any advertiser address, DUNS, tax ID, or ID documents.
- Did not create a new payment profile.
- Did not create a second Google account or submit anything on other accounts signed into this Chrome.
- Did not enable PMax, AI Max, Broad match, Display, Search Partners — all still OFF as per owner policy.

---

## 5. Owner action menu (ranked by impact)

1. **Pick GBP verification method** (postcard vs video) — unlocks local pack visibility. 5 min of owner time to start, 1–14 days for Google to approve.
2. **Send me Microsoft Clarity project ID** after creating a free account — unlocks heatmaps + session recordings. 5 min owner, instant coverage.
3. **Decide on legal-entity path for name hiding** — optional, 30+ days if going DBA. Low urgency vs the two above.
4. **Bing Places postcard** — watch the mail, enter PIN when it arrives.

---

## 6. Files shipped this session

| # | PR | Title | Status |
|---|----|-------|--------|
| 25 | #25 | fix(services): add phone/SMS/Book CTA buttons to hero | merged earlier |
| 26 | #26 | ops(ads): 14-day monitoring plan + daily check script | merged earlier |
| 27 | #27 | ops(ads): schedule daily Ads check workflow | merged earlier |
| 28 | #28 | docs(ads): note Call Conversion gap | merged earlier |
| 29 | #29 | docs(ads): CORRECTION phone_click import IS configured | merged earlier |
| 30 | #30 | ops(outbox): 3-hour watchdog workflow | merged earlier |
| **31** | **#31** | seo(services): add LocalBusiness schema + full audit doc | **merged this session** |
| **32** | **#32** | seo(schema): consolidate provider into @id reference | **merged this session** |

Plus `ops/marketing-audit-2026-04-18.md` (full audit with 5-tier plan) and `ops/google-services-fix-2026-04-18.md` (this file).

---

## 7. Evidence links

- Rich Results Test result (after both PRs): https://search.google.com/test/rich-results?url=https://handyandfriend.com/services — shows 3 valid blocks, 0 warnings.
- `curl -s https://handyandfriend.com/services | grep -c '"@id": "https://handyandfriend.com/#business"'` = 12 references live.
- Homepage LocalBusiness schema block: index.html lines 133–220.
- /services LocalBusiness schema block: services/index.html starting around line 216.

---

## 8. Honest limitations

- I cannot verify that the 2 TV-mount callers actually went through the fixed surfaces — attribution is weak without a call tracking number. CallRail or a Google call forwarding number would fix this (paid, $45+/mo).
- Rich Results Test is a static JSON-LD check, not a guarantee of knowledge panel appearance. The knowledge panel also needs GBP to be verified.
- Today's Ads metric changes (6→9 clicks, CPC $3.85→$3.67) are 24-hour deltas. Not statistically significant yet. Real signal needs 7–14 days.
