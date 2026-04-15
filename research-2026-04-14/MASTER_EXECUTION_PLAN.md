# HANDY & FRIEND — MASTER EXECUTION PLAN (110% READINESS)
**Date:** 2026-04-14
**Goal:** ONE universal funnel, magnet for all LA handyman customer searches, $200/mo Ads + site optimized to 10%+ CVR
**Source:** Consolidated research from Perplexity + ChatGPT + Gemini + 4 sub-agents (800+ data points)

---

## 🔴 PHASE 0 — CRITICAL LEGAL / COMPLIANCE (MUST DO FIRST)

### P0.1 — Remove "Licensed" claim from ALL pages
**Why:** CSLB regulation — cannot advertise as licensed contractor without CA license. Minor-work exemption (<$500) still prohibits "licensed" wording.
**Files to check/edit:**
- `index.html` — already clean (previous session)
- `furniture-assembly/index.html` — CHECK + FIX
- `plumbing/index.html` — CHECK + FIX (if exists)
- `electrical/index.html` — CHECK + FIX (if exists)
- `drywall/index.html` — CHECK
- `tv-mounting/index.html` — CHECK
- `cabinet-painting/index.html` — CHECK
- `interior-painting/index.html` — CHECK
- `flooring/index.html` — CHECK
- `door-installation/index.html` — CHECK
- `backsplash/index.html` — CHECK
- `art-hanging/index.html` — CHECK
- `services/index.html` — CHECK
- `book/index.html` — CHECK
- `reviews/index.html` — CHECK
- `gallery/index.html` — CHECK
- `assets/js/main.js` — already cleaned (verify review3 quote)
- `assets/js/shared.js` — CHECK

**Replace:** "Licensed" → "Insured", "Licensed and insured" → "Fully insured · Background-checked"

### P0.2 — Remove public street address
**Why:** Service-area business; address exposure = privacy + GBP compliance risk
**Files:** All service pages + footer of index.html
**Action:** Remove `1213 Gordon St` from visible HTML. Keep ONLY in JSON-LD schema (hidden from users, visible to Google).

### P0.3 — GMB category cleanup (if needed)
**Action:** Verify GMB has ONLY:
- Primary: Handyman
- Secondary: Furniture assembly service, Picture framing shop
Remove any "Electrician / Plumber / GC / Flooring / Drywall contractor" categories.

**Verification:** Login to GMB, check Info → Categories. Manual step.

---

## 🟠 PHASE 1 — GOOGLE ADS PROFESSIONAL SETUP

### P1.1 — Campaign verification (AG2 TV Mounting)
**Status check:**
- Currently: AG2 TV Mounting active, 10 groups paused
- Budget: $6.67/day = $200/mo
- Max CPC: $7.00 (research says $4-5 better)
- Location: LA Presence only
- Schedule: Mon-Sat 08:00-21:00

**Actions:**
1. Open Ads (campaign 23655774397) → AG2 TV Mounting
2. Verify RSA headlines match approved list
3. Lower Max CPC to $4.50
4. Verify final URL = `/tv-mounting/` (not `/`)
5. Verify location settings = Presence only
6. Add 5-mile radius around core neighborhoods (Beverly Hills, WeHo, Hollywood)

### P1.2 — Keyword expansion (Phrase + Exact only)
**Add to AG2 TV Mounting:**
```
Phrase:
"tv mounting near me"
"tv wall mount service"
"mount tv on wall"
"same day tv mounting"
"tv installation los angeles"
"hide tv wires in wall"
"tv mount los angeles"
"mount 65 inch tv"
"mount 75 inch tv"

Exact:
[tv mounting los angeles]
[hang tv on wall service]
[tv wall mount installation la]
[tv mounting hollywood]
[tv mounting beverly hills]
[tv mounting santa monica]
[tv mounting west hollywood]
```

### P1.3 — Negative keywords (add to campaign level)
**Current:** 232 negatives
**Add (from research):**
```
diy, how to, tutorial, template, youtube, reddit,
amazon, home depot, lowes, walmart, costco,
jobs, job, career, careers, hiring, hire me, salary, wage, wages,
class, classes, course, courses, school, training, apprenticeship,
free, cheap, $10, $20, $30, $40,
handyman job, handyman jobs, handyman wanted, handyman hiring,
apartment maintenance job, property management job, property manager,
craigslist, indeed, glassdoor, zip recruiter, ziprecruiter,
rental, rent, lease, tenant,
amazon.com, homedepot.com, lowes.com,
gift, gift card, supplies, tools for sale,
minecraft, fortnite, roblox, game, gaming, tutorial video,
license, licensing, get licensed, how to become
```

### P1.4 — Ad Assets (already partially done, verify all)
**Sitelinks (6, campaign level):**
1. TV Mounting — "From $150 · Same-Day LA" → `/tv-mounting/`
2. Drywall Repair — "Patch · Texture · From $120" → `/drywall/`
3. Furniture Assembly — "IKEA · Wayfair · From $150" → `/furniture-assembly/`
4. Book Now — "Text Photo for Quote · Fast Response" → `/book/`
5. Service Area — "Hollywood · WeHo · Santa Monica" → `/services/`
6. Gallery — "Before & After · Real LA Jobs" → `/gallery/`

**Callouts (8):**
- Same-Day Available
- Flat Price Upfront
- Text Photo for Quote
- Insured & Background-Checked
- Central LA Service Area
- Pay After Job Done
- 1-Year Workmanship
- EN · ES · RU · HE

**Structured Snippets (3 headers):**
- Services: TV Mounting, Drywall Repair, Furniture Assembly, Doors, Painting
- Service area: Hollywood, Beverly Hills, Santa Monica, Venice, Pasadena
- Types: Residential, Apartment, Condo, Airbnb, Rental

**Call Extension:**
- (213) 361-1700
- Mon-Sat 8AM-7PM Pacific

### P1.5 — Conversion tracking verification
- Verify `form_submit` imported as Google Ads primary conversion ✅ (already done)
- Verify `phone_click` imported as Google Ads secondary conversion
- Verify Enhanced Conversions enabled ✅ (already done)
- Verify `call_conversion` if call extension is clicked

### P1.6 — Disable all auto-recommendations
- Settings → Auto-apply recommendations → OFF everything

---

## 🟡 PHASE 2 — SITE REBUILD (MAIN FUNNEL)

### P2.1 — Hero section rebuild
**Current hero:**
- "Hire a Handyman in Los Angeles"
- Generic eyebrow, generic sub

**New hero (from research consensus):**
```
Eyebrow: "Los Angeles · Same-Day Response · Flat-Rate Pricing"
H1:      "LA's Fastest Handyman. Today. Flat Prices."
Subhead: "TV mounting from $150 · Drywall from $120 · Assembly from $150
          Same-visit. Text a photo for a 15-min quote."
Trust row: [4.9★ · 120+ reviews] [Insured] [Same-Day LA] [EN · ES · RU]
CTAs: [📞 Call (213) 361-1700] [💬 Text Photo for Quote]
```

### P2.2 — NEW sections to add (9 blocks)

**A. Urgency strip** (right after hero)
```
⚡ 3 same-day slots left this week · Text now for your 15-min quote
```

**B. Flat-Price Service Grid** (6 cards with flat prices)
- TV Mounting from $150
- Drywall Repair from $120
- Furniture Assembly from $150
- Door Installation from $140
- Cabinet Painting from $75/door
- Art & Mirror Hanging $150 (up to 5)

**C. Pain→Promise block** (6 rows)
| 😤 Pain | ✅ Handy & Friend |
|---|---|
| Contractor no-shows | Text confirmation 2 hours before |
| Hidden fees | Flat price, written in text before visit |
| Sloppy finish | We don't leave until you approve |
| Rushed job | Average TV mount: 45 min, not 10 |
| No cleanup | Drop cloths + vacuum included |
| Wrong tools | We bring everything |

**D. Owner intro** (real photo, personal voice)
```
"Hi, I'm [Name]. I'm the guy who actually shows up.
I do most jobs myself, with one trusted helper for the big ones.
If something goes wrong, you have my direct cell. 12+ years in LA."
[Photo of owner, real, not stock]
```

**E. Neighborhoods served** (15 chips + map)
```
Beverly Hills · Pacific Palisades · Brentwood · Santa Monica · Sherman Oaks ·
Encino · Studio City · Pasadena · West Hollywood · Culver City ·
Venice · Marina del Rey · Glendale · Burbank · Hollywood
```
→ link to `/services/` for full list

**F. Done-Right Guarantee block**
```
🛡️ The Done-Right Guarantee
If the work isn't right, we come back and fix it free. 1-year on workmanship.
If we can't finish what we quoted, you don't pay for it. Period.
```

**G. Sticky mobile bar** (always visible on mobile)
```
[📞 Call] [💬 Text] [$ Pricing]
```

**H. Expanded FAQ** (replace existing 6 Qs with 10 research-based)
1. How quickly can you respond?
2. Are you insured? (not licensed — answer: General Liability Insurance, background-checked)
3. What's the minimum job size?
4. Do you work weekends / same-day?
5. Do you bring your own tools and drop cloths?
6. How do I get a quote — do I need to be home?
7. Do you clean up after the job?
8. What payment methods?
9. What if something goes wrong after the job?
10. Do you speak Spanish / Russian?

**I. Content magnet section** (3 content pieces cross-linked)
- "How Much Does a Handyman Cost in LA?" (cost guide)
- "5 Fake Handyman Red Flags in LA" (trust builder)
- "Before & After Gallery — Real LA Jobs"

### P2.3 — SEO / Schema overhaul
**Replace existing JSON-LD with:**
1. HomeAndConstructionBusiness (with 15 neighborhood areaServed, aggregateRating, openingHours, priceRange)
2. Service × 5 (TV mounting, drywall, assembly, cabinet painting, door installation) with pricing
3. FAQPage with 10 Qs
4. BreadcrumbList

Ready-to-paste JSON-LD from sub-agent D stored in research doc.

### P2.4 — Meta tags
```html
<title>Handy & Friend | LA Handyman · TV Mounting from $150 · Same-Day</title>
<meta name="description" content="LA handyman — TV mounting from $150, drywall from $120, furniture assembly from $150. Flat prices, same-day response, insured. Text a photo for a 15-min quote. Call (213) 361-1700.">
```

### P2.5 — Service pages sweep
For each service page (tv-mounting, drywall, furniture-assembly, doors, painting, etc.):
- Hero with flat price
- Remove "Licensed" wording
- Add neighborhood mentions (Hollywood, WeHo, SM, BH)
- Add service-specific FAQ
- Add internal link to main index as fallback
- Add schema Service with pricing

---

## 🟢 PHASE 3 — GMB / LOCAL SEO

### P3.1 — GMB category audit
- Primary: Handyman ✓
- Secondary: Furniture assembly service, Picture framing shop
- Remove all category claims that imply licensed trades

### P3.2 — GMB attributes
Toggle ON:
- Onsite services, Online estimates, Free estimates, Appointment required
- Online appointments
- Language assistance (Spanish + Russian)
- Payment: Credit cards, Debit cards, Checks, NFC
- (Owner-identity attributes if truthful)

### P3.3 — GMB service catalog (20 items)
Add all 20 services from research doc (Section 8), each with title ≤58 chars + description ≤300 chars + price.

### P3.4 — GMB post cadence
- Min 2 posts/week
- Template: 3× Update (before/after), 1-2× Offer, 1× Event
- Always include 1 image (1200×900 min), 1 keyword, 1 neighborhood

### P3.5 — Citation building
- Yelp (optimize existing or create)
- Nextdoor Business page (already verified ✅)
- Thumbtack
- Angi
- Bing Places (pending postcard verification)
- Apple Maps (pulls from Yelp, verify Yelp first)

---

## 🔵 PHASE 4 — CONTENT / SEO MAGNETS

Create 10 content pages:

1. `/blog/handyman-cost-los-angeles-2026/` — cost guide with tables
2. `/blog/tv-mounting-cost-los-angeles/` — TV pricing by wall type + size
3. `/blog/la-spring-home-maintenance-checklist/`
4. `/blog/handyman-sherman-oaks/` — neighborhood guide
5. `/blog/cabinet-painting-la-diy-vs-pro/`
6. `/blog/thumbtack-vs-yelp-vs-google-handyman-la/`
7. `/blog/fake-handyman-red-flags-los-angeles/`
8. `/blog/how-long-cabinet-painting-la/`
9. `/blog/drywall-repair-cost-los-angeles/`
10. `/blog/before-after-cabinet-refresh-beverly-hills/`

Each with:
- H1 local + keyword
- FAQ schema
- 3+ photos
- Internal links to service pages
- Pricing table
- CTA to main funnel

---

## ⚫ PHASE 5 — EXECUTION ORDER (step-by-step)

### Day 1 (TODAY — code changes)
| # | Task | Owner | Duration |
|---|---|---|---|
| 1 | Audit all .html for "licensed" | Claude | 15 min |
| 2 | Remove all "Licensed" wording | Claude | 30 min |
| 3 | Audit for public address exposure | Claude | 10 min |
| 4 | Remove address from visible HTML | Claude | 10 min |
| 5 | Build new hero section | Claude | 20 min |
| 6 | Build Urgency strip | Claude | 10 min |
| 7 | Rebuild Flat-Price Service Grid | Claude | 30 min |
| 8 | Build Pain→Promise block | Claude | 20 min |
| 9 | Build Owner intro block | Claude | 20 min |
| 10 | Build Neighborhoods chip section | Claude | 15 min |
| 11 | Build Done-Right Guarantee block | Claude | 15 min |
| 12 | Build Mobile sticky bar | Claude | 20 min |
| 13 | Expand FAQ to 10 Qs | Claude | 20 min |
| 14 | Add complete JSON-LD schema | Claude | 30 min |
| 15 | Update meta title + description | Claude | 5 min |
| 16 | Run i18n fill for EN/ES/RU/UA | Claude | 30 min |
| 17 | Preview smoke test (mobile + desktop) | Claude | 20 min |
| 18 | Sub-smoke: each new section renders | Claude | 15 min |
| 19 | Deploy preview: `npx vercel deploy --yes` | Claude | 5 min |
| 20 | Test preview URL with Perplexity LP audit | Claude | 10 min |

**Total Day 1:** ~5 hours

### Day 2 (after Day 1 approval)
| # | Task | Owner | Duration |
|---|---|---|---|
| 21 | Google Ads: verify AG2 RSA | Claude + Browser | 15 min |
| 22 | Google Ads: lower Max CPC to $4.50 | Claude + Browser | 5 min |
| 23 | Google Ads: add new keyword list | Claude + Browser | 20 min |
| 24 | Google Ads: add negative keywords | Claude + Browser | 15 min |
| 25 | Google Ads: verify 6 sitelinks | Claude + Browser | 10 min |
| 26 | Google Ads: verify 8 callouts | Claude + Browser | 10 min |
| 27 | Google Ads: verify final URL = `/tv-mounting/` | Claude + Browser | 5 min |
| 28 | Service pages sweep — "licensed" cleanup | Claude | 30 min |
| 29 | Service pages — add neighborhood mentions | Claude | 20 min |
| 30 | Deploy prod: `npx vercel --prod --yes` | Claude | 10 min |
| 31 | Post-deploy health check | Claude | 5 min |
| 32 | Telegram report | Claude | 5 min |

**Total Day 2:** ~2.5 hours

### Day 3 (GMB + Content)
| # | Task | Owner | Duration |
|---|---|---|---|
| 33 | GMB category + attribute audit | User | Manual |
| 34 | GMB service catalog — add 20 items | User | Manual |
| 35 | GMB photos refresh | User | Manual |
| 36 | First 3 GMB posts | User | Manual |
| 37 | Write content magnet #1 (cost guide) | Claude | 60 min |
| 38 | Write content magnet #2 (red flags) | Claude | 30 min |
| 39 | Telegram report | Claude | 5 min |

---

## 📊 VERIFICATION METRICS (+48h after Day 2)

| Metric | Target |
|---|---|
| Google Ads Search top IS | >30% |
| Google Ads Lost IS (rank) | <60% |
| Google Ads clicks in 48h | ≥3 |
| Site Lighthouse SEO | ≥95 |
| Site Lighthouse Performance (mobile) | ≥85 |
| Site Lighthouse Accessibility | ≥95 |
| Core Web Vitals | All green |
| GA4 `form_submit` | ≥1 test |
| GA4 `phone_click` | ≥2 test |
| GA4 `whatsapp_click` | ≥2 test |
| Schema.org validator | 0 errors |
| Mobile sticky bar | visible all scroll |

---

## 🚨 SAFETY RULES (per CLAUDE.md)

- ❌ NO Performance Max
- ❌ NO AI Max / Smart campaigns
- ❌ NO Broad match keywords
- ❌ NO Display Network / Search Partners
- ❌ NO tCPA / tROAS / Max Conversions bidding
- ❌ NO auto-apply recommendations
- ❌ NO "Licensed" wording anywhere
- ❌ NO "Guaranteed" (banned word) — use "Done-Right Promise"
- ❌ NO "5-star" / "Best" / "#1"
- ✅ Maximize Clicks only until 50+ conversions/mo
- ✅ Flat pricing with "from $X" framing
- ✅ User explicit approval before `--prod` deploy
- ✅ User explicit approval before GMB changes

---

## END OF MASTER PLAN

**Waiting on:** user approval to execute Day 1.
