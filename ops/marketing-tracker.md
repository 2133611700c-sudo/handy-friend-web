# Handy & Friend — Master Marketing Tracker

**Business:** Handy & Friend — LA Handyman (solo + helper)
**Capacity:** ~22 billable days/month
**Goal:** Fill calendar from free/low-cost channels before scaling paid ads

---

## 1. WEEKLY POSTING SCHEDULE

| Day       | Nextdoor          | Facebook Groups       | Craigslist            | GBP Post    | Thumbtack       |
|-----------|-------------------|-----------------------|-----------------------|-------------|-----------------|
| Monday    | Post (service A)  | Post (2x — A + B)     | Refresh + new post    | —           | Check & quote   |
| Tuesday   | —                 | Post (1x — local tip) | —                     | Weekly post | Check & quote   |
| Wednesday | Post (service B)  | Post (2x — B + C)     | Refresh existing      | —           | Check & quote   |
| Thursday  | —                 | Post (1x — review/social proof) | —          | —           | Check & quote   |
| Friday    | Post (offer/CTA)  | Post (2x — offer + weekend hook) | Refresh + new post | — | Check & quote   |
| Saturday  | —                 | —                     | —                     | —           | Check & quote   |
| Sunday    | —                 | —                     | —                     | —           | Check & quote   |

**Notes:**
- Nextdoor: 3 posts/week max — more triggers spam flags. Use neighborhood-specific targeting.
- Facebook: target local groups (e.g., "LA Home Improvement", neighborhood buy/sell groups). 3 posts minimum, 5 maximum per week.
- Craigslist: Mon/Wed/Fri cadence. Each session = refresh 1 existing listing (repost to push to top) + publish 1 new listing in a different category or city section.
- GBP: 1 post every Tuesday. Rotate between: offer, before/after, service spotlight, seasonal tip.
- Thumbtack: check daily 7 days/week. Quote within 1 hour of new lead appearing — early response wins the job.

**Content rotation (3-week cycle):**
- Week A: TV mounting / hanging / assembly
- Week B: Cabinet painting / interior painting
- Week C: Flooring / renovation / baseboards

---

## 2. KPI TRACKING TABLE

Copy this block at the start of each week. Fill in Friday or Sunday.

```
=========================================
WEEK OF: [DATE e.g. 2026-03-09]
=========================================

NEXTDOOR
  Posts published:       ___
  Total views:           ___
  Comments received:     ___
  Direct messages:       ___
  Leads generated:       ___

FACEBOOK GROUPS
  Posts published:       ___
  Total reach:           ___
  Comments received:     ___
  Direct messages:       ___
  Leads generated:       ___

CRAIGSLIST
  Listings refreshed:    ___
  New listings posted:   ___
  Email/text responses:  ___
  Leads generated:       ___

GOOGLE BUSINESS PROFILE
  Post published (Y/N):  ___
  Profile views:         ___
  Calls from GBP:        ___
  Direction requests:    ___
  Review count (total):  ___

THUMBTACK
  Quotes sent:           ___
  Customer responses:    ___
  Jobs booked:           ___
  Credits spent ($):     ___

WEBSITE (Vercel / Alex AI)
  Sessions:              ___
  Alex chat sessions:    ___
  Form submits:          ___
  FB Messenger leads:    ___

-----------------------------------------
WEEKLY TOTALS
  Total new leads:       ___
  Total booked jobs:     ___
  Estimated revenue ($): ___
  Lead-to-book rate (%): ___  [booked / leads x 100]
  Best channel:          ___
  Worst channel:         ___
-----------------------------------------
NOTES / OBSERVATIONS:


=========================================
```

**How to calculate lead-to-book rate:**
`(booked jobs / total leads) x 100 = %`
Target: 30%+ by week 4.

---

## 3. CONTENT TAG SYSTEM

Every post and every lead gets a tag. When a customer contacts you, ask:
**"How did you find us?"** — then log the tag.

### Tag Format

```
[CHANNEL]-[YYYYMMDD]-[XX]
```

Where XX = sequence number for that day (01, 02, 03...).

### Channel Prefixes

| Prefix  | Channel               | Example            |
|---------|-----------------------|--------------------|
| ND      | Nextdoor              | ND-20260310-01     |
| FB      | Facebook Groups       | FB-20260310-01     |
| CL      | Craigslist            | CL-20260310-01     |
| GBP     | Google Business Post  | GBP-20260311-01    |
| TT      | Thumbtack             | TT-20260312-01     |
| GA-LSA  | **Google LSA** (NEW)  | GA-LSA-20260314-01 |
| GA-SA   | **Google Search Ads** (NEW) | GA-SA-20260314-01  |
| WEB     | Website / Alex AI     | WEB-20260312-01    |
| REF     | Referral / word-of-mouth | REF-20260312-01 |

### How to apply tags

1. **When posting:** write the tag in your personal notes or in the post caption (optional — CL/GBP do not require it in the text).
2. **When a lead comes in:** ask "How did you find us?" and note the tag in your lead log.
3. **In Supabase leads table:** store the tag in the `channel` column (e.g., `FB-20260310-01`).
4. **Weekly review:** count leads per prefix → tells you which channel is working.

### Example lead log entry

```
Date:       2026-03-10
Name:       Maria G.
Phone:      +1-310-xxx-xxxx
Service:    Cabinet painting (kitchen, 12 doors)
Tag:        FB-20260310-02
Status:     Quoted $1,380 | Follow-up Wed
```

### "How did you find us?" scripts

- **English:** "Just curious — how did you find us today?"
- **Russian:** "Как вы нас нашли?"
- **Spanish:** "¿Cómo nos encontró?"

Log even vague answers ("Facebook", "online", "Google") — they still map to a channel.

---

## 4. 30-DAY MILESTONE TARGETS

### Week 1 (Days 1-7) — Foundation
- [ ] Nextdoor profile complete (photo, bio, service area set)
- [ ] Facebook: joined 5+ local home improvement / neighborhood groups
- [ ] Craigslist: 2 listings live (TV mounting + painting)
- [ ] GBP: profile 100% complete (hours, photos, services, description)
- [ ] Thumbtack: profile live, intro message written, first quote sent
- [ ] First post published on each channel
- [ ] Tag system active — first tag logged

**Target:** 0-2 inbound leads (it's setup week)

---

### Week 2 (Days 8-14) — Momentum
- [ ] 10+ posts total published across all channels
- [ ] Craigslist: 2 listings refreshed (pushed to top)
- [ ] GBP: 1 post live, asked 2+ past customers for reviews
- [ ] Thumbtack: 5+ quotes sent
- [ ] Facebook: active in 3+ groups (commented on others' posts too)
- [ ] First review received (Google or Facebook)

**Target:** 3-5 inbound leads

---

### Week 3 (Days 15-21) — Pipeline Active
- [ ] 3+ leads in active pipeline (quoted, not yet closed)
- [ ] At least 1 follow-up done per open lead
- [ ] GBP: 2nd post live, 1+ new review
- [ ] Craigslist: tested a second category or subregion
- [ ] Identified best-performing post (highest engagement or DMs)
- [ ] Content tag log updated — know which channel is generating leads

**Target:** 5-8 inbound leads, 1-2 jobs booked

---

### Week 4 (Days 22-30) — First Win from Free Channels
- [ ] 1+ job booked from Nextdoor, Facebook, or Craigslist (not Thumbtack)
- [ ] Revenue from free channels: $300+
- [ ] Thumbtack: at least 1 job booked
- [ ] 3+ Google reviews live
- [ ] Weekly KPI table filled out for all 4 weeks
- [ ] Stop/Go decision made on each channel (see section 5)

**Target:** 8-12 leads total, 2-3 jobs booked, $500-$1,500 revenue from free channels

---

## 5. STOP/GO RULES

These rules tell you when to double down on a channel and when to pause it. Check at the end of each 2-week period.

---

### NEXTDOOR

| Signal | Action |
|--------|--------|
| 2+ DMs per week | DOUBLE DOWN — post 4x/week, try different neighborhoods |
| Views going up but 0 DMs after 2 weeks | ADJUST — change CTA, try offer post instead of service post |
| Account flagged or posts removed | PAUSE — wait 1 week, resume with softer tone (no price in post) |
| 0 engagement after 3 weeks | PAUSE — neighborhood may not be active; try adjacent areas |

**Double-down tactics:** Post before/after photos. Mention the specific neighborhood by name. Ask neighbors to tag friends who might need help.

---

### FACEBOOK GROUPS

| Signal | Action |
|--------|--------|
| 3+ DMs per week | DOUBLE DOWN — post in more groups, add 3-5 new groups |
| Comments but no DMs | ADJUST — reply to every comment publicly, invite to DM |
| Post removed by admin | STOP posting in that group — move to next group |
| 0 traction after 2 weeks | AUDIT — check group rules; may need to comment/engage for 1 week before posting |

**Double-down tactics:** Post before/after photos (highest engagement). Pin a comment with your contact info. Ask satisfied customers to comment on your post.

---

### CRAIGSLIST

| Signal | Action |
|--------|--------|
| 2+ responses per refresh | DOUBLE DOWN — add more categories, refresh daily instead of 3x/week |
| Responses but no jobs | ADJUST — response script may need work; respond faster (under 30 min) |
| 0 responses after 2 weeks | ROTATE — try new listing title, different category, different section (e.g., skilled trades vs services) |
| Listing flagged/removed | PAUSE that listing 48h, repost with different title and slightly different text |

**Double-down tactics:** Add more photos (3-5 minimum). Include price range to pre-qualify leads. Post separate listings for each service (TV, painting, flooring) rather than one general listing.

---

### GOOGLE BUSINESS PROFILE

| Signal | Action |
|--------|--------|
| 5+ calls/week from GBP | DOUBLE DOWN — post 2x/week, add more photos, add Q&A |
| Views growing, 0 calls | ADJUST — add click-to-call button, check phone number is correct, add "Call now" in post CTA |
| Under 10 reviews after 30 days | ACTION REQUIRED — ask every completed job customer for a review via text (see google-review-template.md) |
| Review count stalls | Run a 1-week review push: ask all past customers in one message blast |

**Double-down tactics:** GBP compounds over time — never pause it. More reviews = more calls. Every job = 1 review request.

---

### THUMBTACK

| Signal | Action |
|--------|--------|
| Quote-to-book rate above 20% | DOUBLE DOWN — buy more credits, quote in more categories |
| Spending credits but 0 bookings after 10 quotes | PAUSE — audit profile photos and intro; may need more reviews or better pricing |
| Cost per booked job under $30 | SCALE — increase weekly credit budget |
| Cost per booked job over $80 | PAUSE — recalibrate; only quote highest-value jobs (painting, flooring) |

**Double-down tactics:** Respond within 5 minutes — Thumbtack's algorithm rewards speed. Keep intro message personal (use customer's name). Photo of your completed work in profile = higher close rate.

---

### SUMMARY: Channel Priority Matrix

| Channel | Time to first lead | Cost | Scale potential | Priority |
|---------|--------------------|------|-----------------|----------|
| Thumbtack | 1-3 days | Medium ($5-15/lead) | High | Start immediately |
| Craigslist | 3-7 days | Free | Medium | Start week 1 |
| Facebook Groups | 5-14 days | Free | High | Start week 1 |
| Nextdoor | 7-21 days | Free | Medium | Start week 1 |
| GBP | 2-8 weeks | Free | Very High (long-term) | Start week 1, compounds over months |

**Rule of thumb:** If you have 30 minutes, spend it quoting on Thumbtack. If you have 15 minutes, refresh Craigslist. If you have 5 minutes, reply to Facebook comments.

---

---

## 6. LIVE CRAIGSLIST LISTINGS — Batch 2 (2026-03-04)

| Tag | Title | PostingID | Category | Status | Expires |
|-----|-------|-----------|----------|--------|---------|
| CL-20260304-01 | 📺 TV MOUNTING — SAME-DAY TODAY $165 | *(see account)* | central LA 213/323 > skilled trade services | ✅ LIVE | ~2026-04-03 |
| CL-20260304-02 | 🎨 CABINET PAINTING LA — SPRAY FINISH $95-$155/DOOR | 7919133637 | central LA 213/323 > skilled trade services | ✅ LIVE | ~2026-04-03 |
| CL-20260304-03 | 🔧 HANDYMAN LOS ANGELES — TV MOUNT \| PAINTING \| FLOORING | 7919136119 | central LA 213/323 > skilled trade services | ✅ LIVE | ~2026-04-03 |

**Notes:**
- All 3 ads posted from account: 2133611700c@gmail.com
- Each ad has a custom AI-generated image (ChatGPT)
- Images saved to: `/ops/screenshots/cl-ad2-cabinet-painting.png`, `/ops/screenshots/cl-ad3-general-handyman.png`
- Ads expire in 30 days — set reminder to refresh on 2026-04-03
- To refresh: go to account > active listings > renew (free to renew, just re-lists at top)

---

## 7. LIVE NEXTDOOR POSTS — Batch 1 (2026-03-04)

| Tag | Title | Service Type | Status | Posted |
|-----|-------|--------------|--------|--------|
| ND-20260303-01 | TV mounted in West Hollywood — before/after | TV Mounting | ✅ LIVE | 2026-03-03 |
| ND-20260304-02 | Book 2 home services — save 20% | Combo Offer | ✅ LIVE | 2026-03-04 |
| ND-20260304-03 | Kitchen cabinet refresh in Hancock Park | Cabinet Painting | ✅ LIVE | 2026-03-04 |
| ND-20260304-04 | Quick tip: Is your kitchen looking dated? | Painting Tip | ✅ LIVE | 2026-03-04 |

**Notes:**
- All posts published from: Handy & Friend business profile (nextdoor.com/page/handy-friend/)
- ND-20260303-01: Generated 3+ page views on first day
- Professional images for ND-20260304-02 (Combo), ND-20260304-03 (Cabinet Painting) generated via ChatGPT
- Images downloaded to Downloads folder (ChatGPT Image Mar 4, 2026, 04_20_49 PM.png, etc.)
- Posting schedule: 3-4 posts per week per marketing-tracker guidelines
- Next posts planned: Interior Painting (ND-20260305-01), General Handyman Proof (ND-20260305-02), Helpful Tip (ND-20260305-03)

---

*Last updated: 2026-03-04*
*Owner: Sergii / Handy & Friend*
