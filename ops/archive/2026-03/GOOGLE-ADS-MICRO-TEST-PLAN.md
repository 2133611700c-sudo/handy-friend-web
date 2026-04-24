# Google Ads Search Micro-Test — Full Deployment Plan
**Brand:** Handy & Friend
**Geo:** Los Angeles, California
**Budget:** $1/day
**Date:** 2026-03-12
**Account:** 637-606-8452 (AW-17971094967)
**Campaign type:** Search (replace existing Performance Max)

---

## 1. EXECUTIVE SUMMARY

**This campaign is NOT a lead generation engine.** At $1/day with historical CPC > $3.40, the campaign will receive 0–1 clicks per day. That is by design.

**Purpose:** Controlled search micro-test to:
- Collect search terms and validate buyer intent
- Filter job-seeker, DIY, and waste traffic via negatives
- Confirm ad-to-landing-page match quality
- Build clean conversion history for future scaling
- Not interfere with organic, GBP, referrals, and free channels

**What it CAN do:** Surface real buyer queries, build negative keyword list, validate which services have local search demand, train the account on clean signals.

**What it CANNOT do:** Generate consistent lead volume, test ad copy at statistical significance, compete with TaskRabbit/Thumbtack on paid search, drive revenue.

**Realistic KPIs at $1/day:**
| Metric | Target |
|--------|--------|
| Impressions/week | 50–200 |
| Clicks/week | 1–3 |
| CPC | $2.50–$5.00 |
| Conversions/month | 0–1 |
| Search terms collected | 20–50/month |
| Negative keywords added | 5–15/week |
| Clean buyer intent % | >80% of search terms |

---

## 2. CAMPAIGN ROLE AT $1/DAY

### What this campaign is
A **signal collection instrument** — not a revenue channel.

### How to use it correctly
1. **Search Term Mining** — Every week, review Search Terms report. Every irrelevant query → negative keyword.
2. **Buyer Intent Validation** — Confirm which service keywords trigger buyer queries in LA.
3. **Waste Reduction** — Systematically block job seekers, DIY, info-seekers, suppliers.
4. **Account Health** — Build clean conversion data. When ready to scale to $5–10/day, the account has quality history.
5. **No Conflict** — Does not cannibalize organic, GBP, or referral traffic at this spend level.

### What NOT to do
- Do not evaluate ROI on $1/day
- Do not expect leads or calls
- Do not panic if 0 conversions for weeks
- Do not scale until search terms are 80%+ buyer intent
- Do not use tCPA bidding (explained below)

---

## 3. RECOMMENDED CAMPAIGN SETUP

### Campaign Settings

| Setting | Value | Reason |
|---------|-------|--------|
| Campaign type | **Search** | Full keyword control. Performance Max has zero transparency for $1/day. |
| Campaign name | `LA Search – Core Services` | |
| Networks | **Search only** (uncheck Display, Search Partners) | Eliminate waste on partner sites |
| Geo targeting | Los Angeles + 20-mile radius from 90038 | Real service area |
| Geo method | **People IN or regularly IN** (not "interested in") | Prevents out-of-area impressions |
| Language | English | Add Spanish later if needed |
| Ad schedule | **7:00 AM – 9:00 PM PT** | Only when business can answer calls |
| Daily budget | $1.00 | Micro-test constraint |
| Bid strategy | **Manual CPC** (enhanced CPC OFF) | See below |
| Default max CPC | $2.50 | Allows ~1 click per 2–3 days |
| Ad rotation | Optimize | |
| Device | All devices, no adjustments | |

### Bid Strategy — Why Manual CPC

**Primary (RECOMMENDED): Manual CPC, Enhanced CPC OFF**
- Full control over max bid per click
- No algorithm chasing phantom conversion targets
- At $1/day, smart bidding has zero data to optimize
- Manual CPC = predictable, safe, no wasted budget

**Alternative (ONLY after 15+ conversions): Maximize Conversions (no target)**
- Only valid after accumulating 15+ real conversions over 30 days
- Let Google optimize for conversion probability
- Still no tCPA — just uncapped Maximize Conversions

### Why tCPA = $1 is WRONG

| Problem | Explanation |
|---------|-------------|
| Historical CPA > $95 | Google sees $1 target as impossible → suppresses all delivery |
| CPC > $3.40 avg | A single click costs more than the daily budget |
| Zero conversion volume | Smart bidding needs 15–30 conv/month minimum to learn |
| Result | Campaign shows 0 impressions → "Limited by bid strategy" → dead campaign |

**tCPA = $1 at this budget = campaign suicide.**

---

## 4. CONVERSION LOGIC

### PRIMARY Conversions (count as conversions in Google Ads)

| Action | Event | Value |
|--------|-------|-------|
| Lead form submission | `form_submit` | $100 |
| Qualified phone call | Call extension > 60s | $100 |

### SECONDARY (observation only, do NOT count as primary)

| Action | Event | Why not primary |
|--------|-------|-----------------|
| Page view | - | Not a lead signal |
| Scroll depth | - | Not a lead signal |
| Phone click | `phone_click` | Click ≠ call ≠ lead |
| Time on page | - | Not a lead signal |
| generate_lead | GA4 event | Already fired alongside form_submit — would double-count |

**Rule:** Only real, qualified lead actions should be primary conversions. Weak signals poison smart bidding.

---

## 5. AD GROUP ARCHITECTURE — 12 SERVICE GROUPS

### Overview

| # | Ad Group | Priority | Phase | Status at $1/day | Landing Page | Exists? |
|---|----------|----------|-------|-------------------|-------------|---------|
| 1 | Handyman General | HIGH | 1 | **ACTIVE** | / (homepage) | ✅ |
| 2 | TV Mounting | HIGH | 1 | **ACTIVE** | /tv-mounting | ✅ |
| 3 | Furniture Assembly | HIGH | 1 | **ACTIVE** | /furniture-assembly | ✅ |
| 4 | Drywall Repair | HIGH | 1 | **ACTIVE** | /book?service=drywall | ⚠️ No dedicated page |
| 5 | Cabinet Painting | MEDIUM | 2 | PAUSED | /cabinet-painting | ✅ |
| 6 | Interior Painting | MEDIUM | 2 | PAUSED | /book?service=interior_painting | ⚠️ No dedicated page |
| 7 | Flooring / LVP | MEDIUM | 3 | PAUSED | /flooring | ✅ |
| 8 | Plumbing Repair | LOW | 3 | PAUSED | /book?service=plumbing | ⚠️ No dedicated page |
| 9 | Lighting / Fixture | LOW | 3 | PAUSED | /book?service=electrical | ⚠️ No dedicated page |
| 10 | Door Install/Repair | LOW | 3 | PAUSED | /book?service=door | ⚠️ No dedicated page |
| 11 | Vanity Installation | LOW | 3 | PAUSED | /book?service=vanity | ⚠️ No dedicated page |
| 12 | Backsplash Install | LOW | 3 | PAUSED | /book?service=backsplash | ⚠️ No dedicated page |

---

### AG1: Handyman General

**Service intent:** Person searching for a local handyman to fix, install, or repair something at home.

**Exact match keywords:**
```
[handyman los angeles]
[handyman near me]
[hire a handyman]
[local handyman]
[handyman service los angeles]
```

**Phrase match keywords:**
```
"handyman los angeles"
"hire handyman"
"handyman service"
"home repair handyman"
"handyman near me"
```

**Max CPC:** $2.50
**Landing page:** Homepage `/` (lists all services + CTA)
**Buyer intent:** High — "handyman" + location = service seeker
**Group-specific negatives:** jobs, hiring, salary, become, license, insurance cost, business

---

### AG2: TV Mounting

**Service intent:** Person wants to mount a TV on a wall professionally.

**Exact match keywords:**
```
[tv mounting los angeles]
[tv mounting near me]
[tv mounting service]
[mount tv on wall]
[tv installation los angeles]
```

**Phrase match keywords:**
```
"tv mounting los angeles"
"tv wall mount service"
"tv installation"
"mount tv on wall"
"tv setup help"
```

**Max CPC:** $3.00
**Landing page:** `/tv-mounting` ✅
**Buyer intent:** Very high — service-specific + local
**Group-specific negatives:** bracket, parts, diy, how to, youtube, best tv mount

---

### AG3: Furniture Assembly

**Service intent:** Person needs furniture assembled (IKEA, Amazon, Wayfair).

**Exact match keywords:**
```
[furniture assembly los angeles]
[ikea assembly los angeles]
[furniture assembly near me]
[furniture assembly service]
[ikea assembly near me]
```

**Phrase match keywords:**
```
"furniture assembly los angeles"
"ikea assembly"
"furniture assembly service"
"bed assembly help"
"dresser assembly"
```

**Max CPC:** $2.50
**Landing page:** `/furniture-assembly` ✅
**Buyer intent:** Very high — "assembly service" = clear buyer
**Group-specific negatives:** warehouse, jobs, instructions, manual, pdf, diy

---

### AG4: Drywall Repair

**Service intent:** Person has holes, cracks, or damage in walls — wants repair.

**Exact match keywords:**
```
[drywall repair los angeles]
[drywall repair near me]
[wall repair los angeles]
[drywall patch service]
[wall hole repair]
```

**Phrase match keywords:**
```
"drywall repair los angeles"
"wall patch repair"
"drywall repair service"
"fix hole in wall"
"drywall damage repair"
```

**Max CPC:** $2.50
**Landing page:** `/book?service=drywall` (no dedicated page yet)
**Buyer intent:** High — repair intent is strong commercial signal
**Group-specific negatives:** diy, how to, mud, tape, supplies, tools, classes

---

### AG5: Cabinet Painting

**Service intent:** Person wants kitchen cabinets painted/refinished without full replacement.

**Exact match keywords:**
```
[cabinet painting los angeles]
[kitchen cabinet painter near me]
[cabinet refinishing los angeles]
[paint kitchen cabinets los angeles]
```

**Phrase match keywords:**
```
"cabinet painting los angeles"
"kitchen cabinet painter"
"cabinet refinishing"
"paint kitchen cabinets"
"cabinet color refresh"
```

**Max CPC:** $3.00
**Landing page:** `/cabinet-painting` ✅
**Buyer intent:** Very high — specific home improvement service
**Group-specific negatives:** diy, how to paint cabinets, paint supplies, wholesale, cabinet maker, cabinet jobs

---

### AG6: Interior Painting

**Service intent:** Person wants rooms, walls, or interior spaces painted.

**Exact match keywords:**
```
[interior painting los angeles]
[house painter los angeles]
[room painting service]
[wall painting los angeles]
[interior painter near me]
```

**Phrase match keywords:**
```
"interior painting los angeles"
"room painting service"
"house painter near me"
"wall painting service"
"paint room los angeles"
```

**Max CPC:** $3.00
**Landing page:** `/book?service=interior_painting` (no dedicated page yet)
**Buyer intent:** High — "painter" + "service" + location = buyer
**Group-specific negatives:** painter jobs, painting classes, art painting, paint supplies, diy

---

### AG7: Flooring / LVP

**Service intent:** Person wants flooring installed or replaced.

**Exact match keywords:**
```
[flooring installation los angeles]
[lvp installation los angeles]
[vinyl plank flooring installer]
[laminate flooring los angeles]
[flooring installer near me]
```

**Phrase match keywords:**
```
"flooring installation los angeles"
"lvp installation"
"vinyl plank flooring"
"laminate flooring installer"
"flooring service"
```

**Max CPC:** $3.00
**Landing page:** `/flooring` ✅
**Buyer intent:** High — installation intent is commercial
**Group-specific negatives:** flooring jobs, diy, how to install, wholesale, materials, underlayment only

---

### AG8: Plumbing Repair

**Service intent:** Person has minor plumbing issue — faucet, sink, toilet, caulking.

**Exact match keywords:**
```
[plumber los angeles]
[minor plumbing repair los angeles]
[faucet installation los angeles]
[toilet repair los angeles]
[plumbing service near me]
```

**Phrase match keywords:**
```
"plumber los angeles"
"faucet repair"
"minor plumbing repair"
"sink repair service"
"plumbing help near me"
```

**Max CPC:** $3.00
**Landing page:** `/book?service=plumbing`
**Buyer intent:** High — but "plumber" overlaps with job seekers
**Group-specific negatives:** plumber jobs, plumbing school, plumbing supplies, emergency (if not offered), licensed plumber (scope issue)

---

### AG9: Lighting / Fixture Installation

**Service intent:** Person wants light fixture installed, replaced, or upgraded.

**Exact match keywords:**
```
[light fixture installation los angeles]
[ceiling light installation near me]
[light fixture replacement los angeles]
[install ceiling light]
```

**Phrase match keywords:**
```
"light fixture installation"
"ceiling light install"
"fixture replacement"
"lighting upgrade los angeles"
"install light fixture"
```

**Max CPC:** $2.50
**Landing page:** `/book?service=electrical`
**Buyer intent:** Medium-high — specific installation intent
**Group-specific negatives:** electrician jobs, electrical training, lighting wholesale, diy, how to wire

---

### AG10: Door Installation / Door Repair

**Service intent:** Person wants interior door installed, replaced, or repaired.

**Exact match keywords:**
```
[door installation los angeles]
[interior door repair los angeles]
[door replacement los angeles]
[door repair near me]
```

**Phrase match keywords:**
```
"door installation los angeles"
"interior door repair"
"door replacement service"
"fix door los angeles"
"door repair service"
```

**Max CPC:** $2.50
**Landing page:** `/book?service=door`
**Buyer intent:** Medium — door queries can be broad
**Group-specific negatives:** garage door, commercial door, door parts, door installer jobs, diy, how to hang

---

### AG11: Vanity Installation

**Service intent:** Person wants bathroom vanity installed or replaced.

**Exact match keywords:**
```
[vanity installation los angeles]
[bathroom vanity install near me]
[replace bathroom vanity los angeles]
[vanity replacement service]
```

**Phrase match keywords:**
```
"vanity installation los angeles"
"bathroom vanity install"
"vanity replacement"
"install bathroom vanity"
"vanity upgrade los angeles"
```

**Max CPC:** $2.50
**Landing page:** `/book?service=vanity`
**Buyer intent:** High — vanity installation is specific home improvement
**Group-specific negatives:** vanity jobs, diy bathroom vanity, vanity suppliers, cabinet wholesalers

---

### AG12: Backsplash Installation

**Service intent:** Person wants kitchen backsplash tile installed.

**Exact match keywords:**
```
[backsplash installation los angeles]
[kitchen backsplash installer near me]
[tile backsplash install los angeles]
[backsplash service los angeles]
```

**Phrase match keywords:**
```
"backsplash installation"
"kitchen backsplash installer"
"tile backsplash service"
"backsplash upgrade"
"install backsplash"
```

**Max CPC:** $2.50
**Landing page:** `/book?service=backsplash`
**Buyer intent:** High — installation intent is commercial
**Group-specific negatives:** tile jobs, backsplash diy, how to tile, tile supplies, wholesale tile

---

## 6. STARTER KEYWORDS

### Minimum Viable Set — Day-One Launch (Phase 1 only)

Only these keywords go live on day 1:

```
Campaign: LA Search – Core Services
Budget: $1/day
Bid Strategy: Manual CPC

AG1 – Handyman General (ACTIVE, max CPC $2.50):
  [handyman los angeles]
  [handyman near me]
  [hire a handyman]
  "handyman los angeles"
  "hire handyman"

AG2 – TV Mounting (ACTIVE, max CPC $3.00):
  [tv mounting los angeles]
  [tv mounting near me]
  [tv mounting service]
  "tv mounting los angeles"
  "tv wall mount service"

AG3 – Furniture Assembly (ACTIVE, max CPC $2.50):
  [furniture assembly los angeles]
  [ikea assembly los angeles]
  [furniture assembly near me]
  "furniture assembly los angeles"
  "ikea assembly"

AG4 – Drywall Repair (ACTIVE, max CPC $2.50):
  [drywall repair los angeles]
  [drywall repair near me]
  "drywall repair los angeles"
  "wall patch repair"
```

**Total: 18 keywords across 4 ad groups.**

---

### Expanded Set — For Phase 2/3 Scaling

```
AG5 – Cabinet Painting:
  [cabinet painting los angeles]
  [kitchen cabinet painter near me]
  [cabinet refinishing los angeles]
  "cabinet painting los angeles"
  "paint kitchen cabinets"

AG6 – Interior Painting:
  [interior painting los angeles]
  [house painter los angeles]
  [room painting service]
  "interior painting los angeles"
  "room painting service"

AG7 – Flooring:
  [flooring installation los angeles]
  [lvp installation los angeles]
  "flooring installation los angeles"
  "lvp installation"

AG8 – Plumbing:
  [plumber los angeles]
  [faucet installation los angeles]
  "minor plumbing repair"

AG9 – Lighting:
  [light fixture installation los angeles]
  "ceiling light install"

AG10 – Door:
  [door installation los angeles]
  [door repair near me]

AG11 – Vanity:
  [vanity installation los angeles]
  "bathroom vanity install"

AG12 – Backsplash:
  [backsplash installation los angeles]
  "kitchen backsplash installer"
```

---

## 7. NEGATIVE KEYWORD FRAMEWORK

### 7.1 Job Seeker Negatives (CAMPAIGN-LEVEL — add immediately)

```
"handyman jobs"
"handyman job"
"handyman work"
"handyman hiring"
"handyman career"
"handyman employment"
"handyman vacancy"
"hiring handyman"
"work as handyman"
"become a handyman"
"handyman job near me"
"handyman jobs los angeles"
"handyman wanted"
"looking for handyman work"
"handyman contractor jobs"
"helper wanted"
"helper jobs"
"maintenance jobs"
"maintenance worker"
"repair jobs"
"home repair jobs"
"installer jobs"
"tv installer jobs"
"furniture assembly jobs"
"painter jobs"
"painting jobs"
"flooring jobs"
"flooring installer jobs"
"electrician jobs"
"plumber jobs"
"plumber job"
"subcontractor wanted"
"door installer jobs"
"tile jobs"
"drywall jobs"
"cabinet painter jobs"
"vanity jobs"
```
**Count: 37 | Level: Campaign | Reason: Direct job-seeker intent — zero buyer value**

### 7.2 Hiring / Career Negatives (CAMPAIGN-LEVEL)

```
"hiring"
"career"
"careers"
"employment"
"vacancy"
"vacancies"
"recruiter"
"recruiting"
"job opening"
"job description"
"work for us"
"join our team"
"we're hiring"
"now hiring"
```
**Count: 14 | Level: Campaign | Reason: Employer/career intent**

### 7.3 Apprentice / Training / Certification (CAMPAIGN-LEVEL)

```
"apprentice"
"apprenticeship"
"trainee"
"training"
"course"
"class"
"classes"
"certification"
"handyman certification"
"handyman license requirements"
"handyman resume"
"how to become"
"become a"
```
**Count: 13 | Level: Campaign | Reason: Education/career-path intent**

### 7.4 Salary / Pay / Hourly (CAMPAIGN-LEVEL)

```
"salary"
"salaries"
"handyman salary"
"wage"
"wages"
"hourly"
"pay"
"pay rate"
"handyman pay"
"how much do handymen make"
```
**Count: 10 | Level: Campaign | Reason: Compensation research = job seeker**

### 7.5 DIY / How-To (CAMPAIGN-LEVEL)

```
"how to"
"diy"
"tutorial"
"instructions"
"step by step"
"youtube"
"how to mount tv"
"how to paint cabinets"
"how to install flooring"
"how to assemble furniture"
"how to patch drywall"
"how to tile backsplash"
"how to install vanity"
"how to hang door"
"manual pdf"
```
**Count: 15 | Level: Campaign | Reason: DIY intent = never converts to service booking**

### 7.6 Cheap / Free / Low-Value (CAMPAIGN-LEVEL)

```
"free"
"cheap"
"cheapest"
"volunteer"
"donation"
"charity"
"budget"
```
**Count: 7 | Level: Campaign | Reason: Low/zero purchase intent**

### 7.7 Supplier / Wholesale / Materials / Parts (CAMPAIGN-LEVEL)

```
"supplies"
"wholesale"
"materials"
"parts"
"bracket"
"tools"
"paint supplies"
"tile supplies"
"flooring materials"
"plumbing supplies"
"electrical supplies"
"door parts"
"vanity suppliers"
"cabinet wholesalers"
```
**Count: 14 | Level: Campaign | Reason: Supplier/vendor intent — not buyer**

### 7.8 Competitor / Brand (CAMPAIGN-LEVEL)

```
"taskrabbit"
"handy app"
"thumbtack"
"angi"
"homeadvisor"
"angie's list"
"mr handyman"
"ace handyman"
"home depot installation"
"lowes installation"
```
**Count: 10 | Level: Campaign | Reason: Competitor brand queries — waste at $1/day**

### 7.9 Business / Franchise / Irrelevant (CAMPAIGN-LEVEL)

```
"franchise"
"handyman business"
"start a handyman business"
"handyman software"
"handyman insurance"
"handyman truck"
"reviews of"
"complaints about"
"lawsuit"
"scam"
```
**Count: 10 | Level: Campaign | Reason: Not service-seeking intent**

### 7.10 Spanish Job-Seeker (CAMPAIGN-LEVEL)

```
"trabajo de handyman"
"empleo de mantenimiento"
"trabajo de pintor"
"trabajo de plomero"
"trabajo de electricista"
"busco trabajo"
"oferta de empleo"
"vacante"
"sueldo"
"salario handyman"
"como ser handyman"
```
**Count: 11 | Level: Campaign | Reason: Spanish job-seeker queries in LA market**

### 7.11 Ambiguous — REVIEW BEFORE BLOCKING

These words appear in both buyer and job-seeker contexts. **Do NOT auto-block.** Review in Search Terms report first.

```
contractor          → Could be "hire contractor" (buyer) or "contractor jobs" (seeker)
plumber             → Could be "find plumber" (buyer) or "plumber career" (seeker)
electrician         → Same pattern
painter             → Same pattern
installer           → Same pattern
repairman           → Same pattern
handyman near me    → Usually buyer, but check context
```

**Action:** Check these in weekly Search Terms review. Block only if job-seeker context confirmed.

### TOTAL NEGATIVE KEYWORDS: ~141
**All should be Phrase Match at Campaign level.**

---

## 8. BUYER INTENT VS BAD INTENT SEPARATION

| Intent Type | Example Queries | Action | Impact at $1/day |
|-------------|----------------|--------|-------------------|
| **BUYER** | "tv mounting los angeles", "hire handyman", "furniture assembly near me", "cabinet painting quote" | TARGET | This is the only traffic we want |
| **JOB SEEKER** | "handyman jobs", "painter jobs la", "flooring installer wanted", "plumber salary" | BLOCK (negative) | Devastating — wastes entire daily budget on one click |
| **DIY** | "how to mount tv", "diy cabinet paint", "install flooring yourself" | BLOCK (negative) | Complete waste — will never convert |
| **INFO-ONLY** | "what does handyman do", "types of flooring", "best paint for cabinets" | BLOCK (negative) | Informational — not buying intent |
| **SUPPLIER/VENDOR** | "tv mount bracket wholesale", "flooring materials supplier", "paint supplies" | BLOCK (negative) | Wrong audience entirely |
| **COMPARISON** | "best handyman los angeles", "handyman reviews", "handyman prices" | TARGET with caution | May convert — monitor |
| **COMPETITOR** | "taskrabbit los angeles", "thumbtack handyman" | BLOCK (negative) | Brand queries — zero ROI at $1/day |

### Decision Framework
```
Contains "jobs/hiring/salary/career/apprentice/apply" → BLOCK
Contains "how to/diy/tutorial/youtube" → BLOCK
Contains "supplies/wholesale/materials/parts" → BLOCK
Contains "service/install/repair/mount/book/quote/hire" + location → TARGET
Contains service name + "los angeles/near me" → TARGET
Ambiguous → REVIEW weekly, then decide
```

---

## 9. PHASED ROLLOUT PLAN

### Phase 1 — Days 1–14: Signal Collection

**Active ad groups:** AG1 (Handyman), AG2 (TV Mounting), AG3 (Furniture Assembly), AG4 (Drywall Repair)
**All other groups:** PAUSED

**Why these 4:**
- Handyman General captures broad buyer queries
- TV Mounting is highest-volume service with dedicated landing page
- Furniture Assembly has strong IKEA/brand demand in LA
- Drywall Repair tests a repair-intent vertical

**Why only 4:**
- $1/day ÷ $3+ CPC = max 1 click every 2–3 days
- 4 groups already compete for the same $1 budget
- More groups = thinner distribution = slower signal collection
- Need 50+ search terms before expanding

**Phase 1 success criteria:**
- [ ] Impressions happening (campaign not "Limited by bid strategy")
- [ ] Search terms are 80%+ buyer intent
- [ ] Negative keyword list growing from real data
- [ ] No job-seeker clicks wasting budget

---

### Phase 2 — Days 15–28: Expand if clean

**Activate:** AG5 (Cabinet Painting), AG6 (Interior Painting)
**Only if:** Phase 1 search terms are clean AND impressions are flowing

**Why these 2 next:**
- Cabinet Painting has dedicated landing page ✅
- Interior Painting has strong LA demand
- Both are paint-cluster services (complementary)

**Phase 2 success criteria:**
- [ ] No increase in irrelevant search terms
- [ ] At least 1 click on new groups
- [ ] Landing page bounce rate not spiking

---

### Phase 3 — Day 29+: Only after proven signal

**Activate selectively:** AG7–AG12 (Flooring, Plumbing, Lighting, Door, Vanity, Backsplash)
**Only when:**
- Budget increases to $3–5/day, OR
- One Phase 1/2 group clearly dominates and others can be paused
- Dedicated landing pages created for remaining services

**Why wait:**
- These services have lower search volume in LA
- No dedicated landing pages yet (all go to /book?service=X)
- At $1/day, these would get 0 impressions behind 4–6 active groups

---

## 10. RSA AD COPY — ALL 12 SERVICES

### Universal Ad Rules
- 1 RSA per ad group (max 2 for testing at higher budget)
- Service-specific headlines ONLY — no mixing services
- No "we do everything" language
- No hiring/job wording
- No vague "quality service" fluff
- CTA only: Request Quote / Book Service / Call Now / Get Fast Help
- Every headline must pass: "Would a job seeker click this?" → If yes, rewrite

---

### RSA 1: Handyman General

**Headlines (10):**
1. Handyman Los Angeles
2. Local Handyman Help
3. Book LA Handyman
4. Small Home Repairs LA
5. Reliable Handyman LA
6. Handyman Near You
7. Get Help Today LA
8. Home Repair Help LA
9. Fast Handyman Service
10. Request Handyman Quote

**Descriptions (4):**
1. Local handyman for small home repairs, installs, and assembly in Los Angeles.
2. Book reliable handyman help for wall fixes, installs, mounting, and more.
3. Request a quote for fast, clean, professional handyman service in LA.
4. Need help with small repairs or installs? Book local service today.

**Final URL:** `https://handyandfriend.com/`

---

### RSA 2: TV Mounting

**Headlines (10):**
1. TV Mounting Los Angeles
2. TV Installation LA
3. Mount TV On Wall
4. Clean TV Mounting LA
5. Book TV Mounting
6. TV Wall Mount Service
7. Fast TV Install LA
8. Professional TV Mount
9. TV Setup Help LA
10. Request TV Mount Quote

**Descriptions (4):**
1. Professional TV mounting in Los Angeles with clean wall placement.
2. Book TV wall mounting service for a safer, cleaner living room setup.
3. Need your TV mounted right? Request a fast local quote today.
4. Local TV installation help for apartments, homes, and media rooms.

**Final URL:** `https://handyandfriend.com/tv-mounting`

---

### RSA 3: Furniture Assembly

**Headlines (10):**
1. Furniture Assembly LA
2. IKEA Assembly Los Angeles
3. Fast Furniture Assembly
4. Book Assembly Help
5. Assembly Service LA
6. Bed Desk Dresser Setup
7. Local Assembly Help
8. Furniture Setup Today
9. Assembly Help Near Me
10. Request Assembly Quote

**Descriptions (4):**
1. Fast furniture assembly for beds, desks, dressers, shelves, and more.
2. Book local assembly help in Los Angeles for home and apartment furniture.
3. Need IKEA or flat-pack assembly? Request a quote today.
4. Save time and avoid frustration with professional furniture assembly.

**Final URL:** `https://handyandfriend.com/furniture-assembly`

---

### RSA 4: Drywall Repair

**Headlines (10):**
1. Drywall Repair LA
2. Wall Patch Repair LA
3. Fix Holes In Wall
4. Drywall Patch Service
5. Wall Damage Repair
6. Book Drywall Repair
7. Los Angeles Wall Repair
8. Small Drywall Fixes
9. Fast Drywall Help
10. Request Repair Quote

**Descriptions (4):**
1. Drywall patch repair for holes, dents, cracks, and wall damage in LA.
2. Book local drywall repair for a smooth, clean finished wall.
3. Need wall patch work done right? Request a quote today.
4. Fast help for drywall damage in homes, apartments, and rentals.

**Final URL:** `https://handyandfriend.com/book?service=drywall`

---

### RSA 5: Cabinet Painting

**Headlines (10):**
1. Cabinet Painting LA
2. Kitchen Cabinet Painting
3. Refresh Old Cabinets
4. Cabinet Repainting LA
5. Cabinet Refinishing LA
6. Update Kitchen Cabinets
7. Book Cabinet Painting
8. Painted Cabinets Quote
9. Cabinet Color Refresh
10. LA Cabinet Painting

**Descriptions (4):**
1. Refresh old kitchen cabinets with a clean painted finish in Los Angeles.
2. Cabinet painting service for a brighter, updated kitchen look.
3. Request a cabinet painting quote for your kitchen renovation refresh.
4. Upgrade your cabinets without a full replacement project.

**Final URL:** `https://handyandfriend.com/cabinet-painting`

---

### RSA 6: Interior Painting

**Headlines (10):**
1. Interior Painting LA
2. Room Painting Service
3. Wall Painting Los Angeles
4. Book Interior Painter
5. Paint Room In LA
6. Home Painting Help
7. Clean Painting Service
8. Fast Painting Quote
9. Interior Painter LA
10. Refresh Your Walls

**Descriptions (4):**
1. Interior painting for rooms, walls, and small home refresh projects in LA.
2. Book clean, professional painting service for your home interior.
3. Request a quote for room painting and wall color refresh in Los Angeles.
4. Local painting help for apartments, homes, and move-in refresh jobs.

**Final URL:** `https://handyandfriend.com/book?service=interior_painting`

---

### RSA 7: Flooring / LVP

**Headlines (10):**
1. Flooring Installation LA
2. LVP Flooring Service
3. Vinyl Plank Flooring
4. Floor Refresh Los Angeles
5. Book Flooring Quote
6. Replace Old Flooring
7. Flooring Help In LA
8. Install New Floors LA
9. Minor Flooring Service
10. Local Flooring Estimate

**Descriptions (4):**
1. Flooring installation and refresh service for cleaner, updated interiors.
2. Book LVP or vinyl plank flooring help in Los Angeles.
3. Request a flooring estimate for small to medium home projects.
4. Refresh worn floors with local installation service in LA.

**Final URL:** `https://handyandfriend.com/flooring`

---

### RSA 8: Plumbing Repair

**Headlines (10):**
1. Minor Plumbing Repair
2. Faucet Repair LA
3. Sink Repair Los Angeles
4. Fast Plumbing Help LA
5. Plumbing Service Quote
6. Local Plumbing Fixes
7. Fix Faucet Or Sink
8. Book Plumbing Help
9. Small Plumbing Repair
10. Plumbing Repair LA

**Descriptions (4):**
1. Minor plumbing repair for faucets, sinks, and simple home plumbing issues.
2. Book fast local help for small plumbing fixes in Los Angeles.
3. Request plumbing service for leaks, faucet issues, and sink problems.
4. Need a minor plumbing repair? Get a quote from a local service pro.

**Final URL:** `https://handyandfriend.com/book?service=plumbing`

---

### RSA 9: Lighting / Fixture Installation

**Headlines (10):**
1. Light Fixture Install
2. Ceiling Light Install LA
3. Fixture Replacement LA
4. Lighting Upgrade LA
5. Book Fixture Install
6. Replace Old Lighting
7. Install Ceiling Light
8. Lighting Help Los Angeles
9. Local Fixture Service
10. Light Install Quote

**Descriptions (4):**
1. Light fixture installation and replacement for homes in Los Angeles.
2. Upgrade old lighting with clean local fixture installation service.
3. Book ceiling light or fixture replacement help today.
4. Request a quote for lighting upgrades and fixture installs in LA.

**Final URL:** `https://handyandfriend.com/book?service=electrical`

---

### RSA 10: Door Installation / Door Repair

**Headlines (10):**
1. Door Installation LA
2. Door Repair Los Angeles
3. Replace Interior Door
4. Book Door Service
5. Door Help In LA
6. Interior Door Repair
7. New Door Installation
8. Fix Old Doors LA
9. Local Door Service
10. Request Door Quote

**Descriptions (4):**
1. Door installation and repair service for interior home doors in Los Angeles.
2. Book help to replace, repair, or adjust old doors in your home.
3. Request a quote for local door installation or repair service.
4. Get clean, professional help for common interior door problems.

**Final URL:** `https://handyandfriend.com/book?service=door`

---

### RSA 11: Vanity Installation

**Headlines (10):**
1. Vanity Installation LA
2. Bathroom Vanity Install
3. Replace Bathroom Vanity
4. Book Vanity Service
5. Vanity Upgrade Los Angeles
6. New Vanity Installation
7. Bathroom Vanity Quote
8. Local Vanity Install
9. Vanity Replacement LA
10. Install Vanity Today

**Descriptions (4):**
1. Bathroom vanity installation and replacement service in Los Angeles.
2. Upgrade your bathroom with local vanity install help and clean finish.
3. Request a quote to replace an old vanity with a new one.
4. Book vanity installation service for a better bathroom setup.

**Final URL:** `https://handyandfriend.com/book?service=vanity`

---

### RSA 12: Backsplash Installation

**Headlines (10):**
1. Backsplash Install LA
2. Kitchen Backsplash LA
3. Tile Backsplash Install
4. Book Backsplash Quote
5. Backsplash Upgrade LA
6. Kitchen Tile Installation
7. New Backsplash Install
8. Local Backsplash Help
9. Backsplash Service LA
10. Upgrade Your Kitchen

**Descriptions (4):**
1. Kitchen backsplash installation for a clean, updated look in Los Angeles.
2. Book local backsplash service for kitchen tile upgrades and refresh.
3. Request a quote for backsplash installation in your kitchen.
4. Upgrade your kitchen with a professional backsplash install.

**Final URL:** `https://handyandfriend.com/book?service=backsplash`

---

## 11. LANDING PAGE RULES

### Requirements for Every Service Landing Page

| Element | Requirement |
|---------|-------------|
| H1 | Exact service name + "in Los Angeles" |
| Title tag | Service + price + "Handy & Friend" |
| Above the fold | CTA (Call or Book) visible without scrolling |
| Pricing | From $X clearly visible |
| Before/after | Service-specific photos |
| Trust block | "Licensed & insured", "5-star rated", "Same-day available" |
| Service area | "Hollywood, Beverly Hills, West Hollywood..." |
| Phone | `(213) 361-1700` clickable tel: link |
| Form | Lead capture with service pre-selected |
| Zero job language | No "join", "apply", "work with us", "we're hiring" |

### Landing Page Status

| Ad Group | Required Page | Status | Workaround |
|----------|---------------|--------|------------|
| Handyman | `/` | ✅ Exists | Homepage OK — lists all services |
| TV Mounting | `/tv-mounting` | ✅ Exists | Perfect match |
| Furniture Assembly | `/furniture-assembly` | ✅ Exists | Perfect match |
| Cabinet Painting | `/cabinet-painting` | ✅ Exists | Perfect match |
| Flooring | `/flooring` | ✅ Exists | Perfect match |
| Drywall Repair | `/drywall-repair` | ❌ Missing | Use `/book?service=drywall` |
| Interior Painting | `/interior-painting` | ❌ Missing | Use `/book?service=interior_painting` |
| Plumbing | `/plumbing` | ❌ Missing | Use `/book?service=plumbing` |
| Lighting | `/lighting` | ❌ Missing | Use `/book?service=electrical` |
| Door | `/door-installation` | ❌ Missing | Use `/book?service=door` |
| Vanity | `/vanity-installation` | ❌ Missing | Use `/book?service=vanity` |
| Backsplash | `/backsplash` | ❌ Missing | Use `/book?service=backsplash` |

**Priority:** Create dedicated landing pages for Phase 2/3 services BEFORE activating those ad groups.

### When Homepage is OK
- Handyman General ad group → homepage is acceptable (broad service listing)
- BUT: never use homepage for service-specific ad groups (TV, Painting, etc.)

### When Dedicated Page is MANDATORY
- Any ad group targeting a specific service MUST land on that service's page
- Generic routing to homepage kills Quality Score and conversion rate
- At $1/day, every click matters — bad landing page = wasted day

---

## 12. WEEKLY REVIEW SOP

**When:** Every Monday morning
**Time:** 15 minutes
**Tool:** Google Ads > Search Terms report

### Step-by-Step Weekly Review

| Step | Check | Action |
|------|-------|--------|
| 1 | Open Search Terms report for last 7 days | Navigate to Keywords > Search terms |
| 2 | Count total search terms | Target: 5–15/week at $1/day |
| 3 | Tag each term: BUYER / JOB SEEKER / DIY / IRRELEVANT | Mark in spreadsheet |
| 4 | Calculate buyer intent % | Target: >80% |
| 5 | Add irrelevant terms as negative keywords | Add as phrase match, campaign-level |
| 6 | Check impressions per ad group | All 4 active groups getting impressions? |
| 7 | Check "Limited by budget" warning | Expected — confirm it's showing |
| 8 | Check CPC | Target: $2.50–$5.00. If >$5, lower max CPC bid |
| 9 | Check CTR | Target: >3%. If <1%, review ad copy relevance |
| 10 | Check if any conversions | If yes — verify it's a real lead, not a bot/test |
| 11 | Check landing page match | Ads pointing to correct service pages? |
| 12 | Decide: add/pause keywords | Add negatives from bad terms, pause low-performing keywords |

### Decision Rules

| Situation | Action |
|-----------|--------|
| Job-seeker term found | Add as negative keyword immediately |
| DIY term found | Add as negative keyword immediately |
| Good buyer term not covered | Consider adding as new keyword |
| CPC > $5 | Lower max CPC to $3.00 |
| One ad group gets 0 impressions for 2 weeks | Check if keywords too restrictive |
| Buyer intent % < 60% | Add more negatives, tighten keywords |
| Buyer intent % > 90% for 3 weeks | Consider enabling Phase 2 groups |
| Real conversion happens | Verify quality → if good, consider budget increase |

### Weekly Log Template

```
Week of: [DATE]
Impressions: [#]
Clicks: [#]
CPC avg: $[#]
Search terms reviewed: [#]
  - Buyer intent: [#] ([%])
  - Job seeker: [#] → added as negatives
  - DIY: [#] → added as negatives
  - Irrelevant: [#] → added as negatives
Conversions: [#]
New negatives added: [list]
Changes made: [list]
Next week action: [describe]
```

---

## 13. 30-DAY OPERATING PLAN

### First 24 Hours

| # | Action | Detail |
|---|--------|--------|
| 1 | Pause/remove Performance Max campaign | PMax has zero transparency at $1/day |
| 2 | Create Search campaign "LA Search – Core Services" | Manual CPC, $1/day, geo=LA 20mi |
| 3 | Create AG1–AG4 (Handyman, TV, Assembly, Drywall) | Status: Active |
| 4 | Create AG5–AG12 (Paint, Floor, Plumb, etc.) | Status: Paused |
| 5 | Add 18 starter keywords to AG1–AG4 | Exact + phrase match |
| 6 | Add all 141 negative keywords | Campaign-level, phrase match |
| 7 | Upload RSA 1–4 | One RSA per active ad group |
| 8 | Set ad schedule: 7 AM – 9 PM PT | |
| 9 | Set geo: LA + 20-mile radius, "people in" only | |
| 10 | Set max CPC: $2.50 (AG1,3,4), $3.00 (AG2) | |
| 11 | Verify conversion actions: form_submit = primary | |
| 12 | Take screenshot of final setup for records | |

**Success:** Campaign is live, settings correct, negatives loaded, ads approved.

---

### Days 2–7

| # | Action | Detail |
|---|--------|--------|
| 1 | Check daily: is campaign serving impressions? | Should see 5–30 impressions/day |
| 2 | If "Limited by bid strategy" → confirm Manual CPC is set | Should NOT happen with Manual CPC |
| 3 | If "Limited by budget" → this is expected and OK | |
| 4 | Day 3: First Search Terms review | Even if only 5 terms — review all |
| 5 | Add any new negatives from real data | |
| 6 | Day 7: Full weekly review (SOP above) | |
| 7 | Log Week 1 results in weekly template | |

**Success:** Impressions flowing, search terms visible, first negatives from real data added.
**Warning:** 0 impressions for 5+ days → check bid, check geo, check ad approval status.

---

### Days 8–14

| # | Action | Detail |
|---|--------|--------|
| 1 | Weekly review (Week 2) | Focus on search term quality |
| 2 | Calculate buyer intent % | Target >80% |
| 3 | Review CPC vs max bid | Adjust if needed |
| 4 | If AG4 (Drywall) gets 0 impressions → consider swapping for AG5 (Cabinets) | Cabinets has dedicated page |
| 5 | If buyer intent >80% and clean for 2 weeks → prepare Phase 2 | Don't activate yet — just prepare |
| 6 | Log Week 2 results | |

**Success:** 80%+ buyer intent, growing negative list, no wasted clicks on job seekers.
**Warning:** Buyer intent <60% → add more negatives, tighten keywords.

---

### Days 15–30

| # | Action | Detail |
|---|--------|--------|
| 1 | Activate Phase 2: AG5 (Cabinet Painting), AG6 (Interior Painting) | Only if Phase 1 is clean |
| 2 | Upload RSA 5–6 | |
| 3 | Week 3 review | Now 6 active groups |
| 4 | Week 4 review | Full month data |
| 5 | Month-end analysis: | |
|   | - Total impressions | Target: 200+ |
|   | - Total clicks | Target: 5–10 |
|   | - Buyer intent % | Target: >80% |
|   | - Total negatives added | Target: 20+ from real data |
|   | - Conversions | 0–1 expected, any is bonus |
| 6 | Scale decision: | See below |

**Scale signal (increase to $3–5/day):**
- Buyer intent consistently >85%
- Search terms are clean
- At least 1 real conversion
- Landing pages match ads
- CPC is manageable ($2–4)

**Keep as micro-test signal:**
- Buyer intent 60–80%
- Still finding new negative keywords weekly
- No conversions but search terms are reasonable
- Landing pages need improvement

**Pause signal:**
- Buyer intent <50% despite negatives
- Mostly job-seeker or DIY traffic
- CPC >$6 with zero conversions
- Budget is needed elsewhere

---

## 14. GOOGLE ADS EDITOR IMPORT TABLES

### Campaign

| Campaign | Type | Budget | Bid Strategy | Max CPC | Geo | Language | Schedule |
|----------|------|--------|-------------|---------|-----|----------|----------|
| LA Search – Core Services | Search | $1.00/day | Manual CPC | $2.50 | Los Angeles +20mi | English | 7AM–9PM PT |

### Ad Groups

| Campaign | Ad Group | Status | Max CPC |
|----------|----------|--------|---------|
| LA Search – Core Services | AG1 – Handyman General | Active | $2.50 |
| LA Search – Core Services | AG2 – TV Mounting | Active | $3.00 |
| LA Search – Core Services | AG3 – Furniture Assembly | Active | $2.50 |
| LA Search – Core Services | AG4 – Drywall Repair | Active | $2.50 |
| LA Search – Core Services | AG5 – Cabinet Painting | Paused | $3.00 |
| LA Search – Core Services | AG6 – Interior Painting | Paused | $3.00 |
| LA Search – Core Services | AG7 – Flooring LVP | Paused | $3.00 |
| LA Search – Core Services | AG8 – Plumbing Repair | Paused | $3.00 |
| LA Search – Core Services | AG9 – Lighting Fixture | Paused | $2.50 |
| LA Search – Core Services | AG10 – Door Install | Paused | $2.50 |
| LA Search – Core Services | AG11 – Vanity Install | Paused | $2.50 |
| LA Search – Core Services | AG12 – Backsplash Install | Paused | $2.50 |

### Keywords — Phase 1 (Day One)

| Ad Group | Keyword | Match Type |
|----------|---------|------------|
| AG1 – Handyman General | [handyman los angeles] | Exact |
| AG1 – Handyman General | [handyman near me] | Exact |
| AG1 – Handyman General | [hire a handyman] | Exact |
| AG1 – Handyman General | "handyman los angeles" | Phrase |
| AG1 – Handyman General | "hire handyman" | Phrase |
| AG2 – TV Mounting | [tv mounting los angeles] | Exact |
| AG2 – TV Mounting | [tv mounting near me] | Exact |
| AG2 – TV Mounting | [tv mounting service] | Exact |
| AG2 – TV Mounting | "tv mounting los angeles" | Phrase |
| AG2 – TV Mounting | "tv wall mount service" | Phrase |
| AG3 – Furniture Assembly | [furniture assembly los angeles] | Exact |
| AG3 – Furniture Assembly | [ikea assembly los angeles] | Exact |
| AG3 – Furniture Assembly | [furniture assembly near me] | Exact |
| AG3 – Furniture Assembly | "furniture assembly los angeles" | Phrase |
| AG3 – Furniture Assembly | "ikea assembly" | Phrase |
| AG4 – Drywall Repair | [drywall repair los angeles] | Exact |
| AG4 – Drywall Repair | [drywall repair near me] | Exact |
| AG4 – Drywall Repair | "drywall repair los angeles" | Phrase |
| AG4 – Drywall Repair | "wall patch repair" | Phrase |

---

## 15. FINAL HONEST VERDICT

### What this $1/day setup CAN do
- Surface real buyer search queries in Los Angeles
- Build a clean negative keyword list from real data
- Validate which services have active search demand
- Train the Google Ads account on quality signals
- Provide a foundation for controlled scaling

### What this $1/day setup CANNOT do
- Generate consistent leads (expect 0–1/month)
- Compete with TaskRabbit, Thumbtack, or Angi in paid search
- A/B test ad copy with statistical significance
- Drive meaningful revenue directly
- Replace organic, GBP, referrals, or free channels as lead sources

### What the owner should expect
- Weeks with 0 clicks and 0 conversions — this is normal
- The main value is the Search Terms report, not the conversions
- This is an intelligence-gathering operation, not a sales machine
- Monthly ad spend: ~$30 — treat as a research expense

### "Ready to scale" signals
- 3 consecutive weeks of >85% buyer intent in search terms
- At least 1 real qualified lead from ads
- Landing pages match all active ad groups
- Negative keyword list stabilized (fewer than 3 new negatives per week)
- CPC manageable at $2–4
→ **Scale to $5/day, then $10/day with weekly monitoring**

### "Keep as micro-test" signals
- Buyer intent 60–80% — still finding waste
- No conversions but search terms are directionally correct
- Landing pages need improvement (6 missing pages)
- Still adding 5+ negatives per week
→ **Stay at $1/day, keep cleaning**

---

## 16. RISKS AND CONTROL

| # | Risk | Probability | Impact | Control |
|---|------|-------------|--------|---------|
| 1 | **Budget too small to learn** | HIGH | MEDIUM | Accept this — campaign is intelligence tool, not lead engine. Don't evaluate ROI. |
| 2 | **Smart bidding choked by unrealistic target** | HIGH if tCPA used | CRITICAL | Use Manual CPC only. Never set tCPA = $1. |
| 3 | **Job-seeker / DIY waste traffic** | MEDIUM | HIGH | 141 negative keywords pre-loaded + weekly review SOP adds more |
| 4 | **Poor ad-to-page match** | MEDIUM | HIGH | 5 service pages exist ✅. 7 missing pages use /book?service=X as workaround. Create pages before Phase 3. |
| 5 | **Too many services live at once** | HIGH if all 12 activated | CRITICAL | Phased rollout: 4 → 6 → 12. Never all at once on $1/day. |
| 6 | **False confidence from impressions/clicks** | MEDIUM | MEDIUM | Judge by search term quality, not click volume. 10 irrelevant clicks = worse than 0 clicks. |
| 7 | **Weak conversion setup poisoning optimization** | LOW (Manual CPC) | HIGH if smart bidding | Primary conversion = form_submit only. No micro-conversions as primary. |
| 8 | **Performance Max consuming budget with no control** | HIGH if PMax stays | CRITICAL | Pause PMax on day 1. Search campaign only. |
| 9 | **Competitor keyword overlap** | LOW | LOW | 10 competitor brand negatives pre-loaded |
| 10 | **Spanish job-seeker queries in LA market** | MEDIUM | MEDIUM | 11 Spanish job-seeker negatives pre-loaded |
| 11 | **Generic ad copy → low Quality Score** | MEDIUM | MEDIUM | Service-specific RSAs per ad group. No mixed messaging. |
| 12 | **Homepage used for service-specific ads** | LOW (controlled) | HIGH | Only AG1 (Handyman General) uses homepage. All others use service pages. |

---

## APPENDIX A: FULL NEGATIVE KEYWORD LIST (Copy-Paste Ready)

All phrase match, campaign-level:

```
"handyman jobs"
"handyman job"
"handyman work"
"handyman hiring"
"handyman career"
"handyman employment"
"handyman vacancy"
"hiring handyman"
"work as handyman"
"become a handyman"
"handyman job near me"
"handyman jobs los angeles"
"handyman wanted"
"looking for handyman work"
"handyman contractor jobs"
"helper wanted"
"helper jobs"
"maintenance jobs"
"maintenance worker"
"repair jobs"
"home repair jobs"
"installer jobs"
"tv installer jobs"
"furniture assembly jobs"
"painter jobs"
"painting jobs"
"flooring jobs"
"flooring installer jobs"
"electrician jobs"
"plumber jobs"
"plumber job"
"subcontractor wanted"
"door installer jobs"
"tile jobs"
"drywall jobs"
"cabinet painter jobs"
"vanity jobs"
"hiring"
"career"
"careers"
"employment"
"vacancy"
"vacancies"
"recruiter"
"recruiting"
"job opening"
"job description"
"work for us"
"join our team"
"we're hiring"
"now hiring"
"apprentice"
"apprenticeship"
"trainee"
"training"
"course"
"class"
"classes"
"certification"
"handyman certification"
"handyman license requirements"
"handyman resume"
"how to become"
"become a"
"salary"
"salaries"
"handyman salary"
"wage"
"wages"
"hourly"
"pay"
"pay rate"
"handyman pay"
"how much do handymen make"
"how to"
"diy"
"tutorial"
"instructions"
"step by step"
"youtube"
"how to mount tv"
"how to paint cabinets"
"how to install flooring"
"how to assemble furniture"
"how to patch drywall"
"how to tile backsplash"
"how to install vanity"
"how to hang door"
"manual pdf"
"free"
"cheap"
"cheapest"
"volunteer"
"donation"
"charity"
"budget"
"supplies"
"wholesale"
"materials"
"parts"
"bracket"
"tools"
"paint supplies"
"tile supplies"
"flooring materials"
"plumbing supplies"
"electrical supplies"
"door parts"
"vanity suppliers"
"cabinet wholesalers"
"taskrabbit"
"handy app"
"thumbtack"
"angi"
"homeadvisor"
"angie's list"
"mr handyman"
"ace handyman"
"home depot installation"
"lowes installation"
"franchise"
"handyman business"
"start a handyman business"
"handyman software"
"handyman insurance"
"handyman truck"
"reviews of"
"complaints about"
"lawsuit"
"scam"
"trabajo de handyman"
"empleo de mantenimiento"
"trabajo de pintor"
"trabajo de plomero"
"trabajo de electricista"
"busco trabajo"
"oferta de empleo"
"vacante"
"sueldo"
"salario handyman"
"como ser handyman"
```

---

## APPENDIX B: EXISTING PAGES AUDIT

| Page | URL | Status | Used By |
|------|-----|--------|---------|
| Homepage | `/` | ✅ Live | AG1 Handyman General |
| TV Mounting | `/tv-mounting` | ✅ Live | AG2 TV Mounting |
| Cabinet Painting | `/cabinet-painting` | ✅ Live | AG5 Cabinet Painting |
| Furniture Assembly | `/furniture-assembly` | ✅ Live | AG3 Furniture Assembly |
| Flooring | `/flooring` | ✅ Live | AG7 Flooring |
| Services Hub | `/services` | ✅ Live | Not used for ads |
| Gallery | `/gallery` | ✅ Live | Sitelink extension |
| Reviews | `/reviews` | ✅ Live | Sitelink extension |
| Book | `/book` | ✅ Live | Fallback for missing pages |
| Pricing | `/pricing` | ✅ Live | Sitelink extension |
| Drywall Repair | — | ❌ Missing | AG4 needs it |
| Interior Painting | — | ❌ Missing | AG6 needs it |
| Plumbing | — | ❌ Missing | AG8 needs it |
| Lighting / Electrical | — | ❌ Missing | AG9 needs it |
| Door Install | — | ❌ Missing | AG10 needs it |
| Vanity Install | — | ❌ Missing | AG11 needs it |
| Backsplash Install | — | ❌ Missing | AG12 needs it |

**Action:** Create 7 missing service pages before activating Phase 2/3 ad groups.

---

*Generated 2026-03-12 by Claude Opus. Account: 637-606-8452. Campaign: LA Search – Core Services.*
