# 14-Day Growth Sprint — Revenue Operating System

**Start:** 2026-03-11
**End:** 2026-03-25
**Goal:** $2,000 revenue in 14 days, 10 new leads, 5 reviews, $50 CPA

---

## Week 1: Foundation (Mar 11-17)

### Day 1 (Mar 11) — SLA + Pipeline ✅
- [x] Fix test data in analytics views (migration 025)
- [x] Create Sales Pipeline SOP
- [x] Create Review Request SOP
- [x] Create Lead Reactivation SOP
- [x] Deploy SLA escalation cron (5/15/30 min alerts)
- [x] Pull Google Ads 30-day data + diagnosis
- [x] Add 7 Google Ads sitelinks
- [ ] **HUMAN:** Send reactivation SMS to lost lead (310-663-5792)
- [ ] **HUMAN:** Send review requests to 3 most recent completed jobs
- [ ] **HUMAN:** Add backup payment method in Google Ads

### Day 2 (Mar 12) — Google Ads Optimization
- [ ] Add negative keywords to Google Ads:
  - Competitors: taskrabbit, ikea, angi, thumbtack, yelp, task rabbit
  - Junk: diy, free, cheap, jobs, hiring, salary, classes, training
- [ ] Set target CPA to $50 in Google Ads
- [ ] Complete Google Ads checklist (currently 50%)
- [ ] Verify SLA escalation cron fires correctly (create test lead)
- [ ] Review & send review requests to next 3 completed jobs
- [ ] **HUMAN:** Post 1 FB post (from ops/fb-sales-posts.md)

### Day 3 (Mar 13) — Content + Outbound
- [ ] Post 1 Nextdoor post
- [ ] Post 1 Craigslist ad (TV mounting or painting)
- [ ] Follow up on reactivation lead (Day 3 script if no response)
- [ ] Review morning report — any new leads? SLA OK?
- [ ] Send review requests to next 3 completed jobs

### Day 4 (Mar 14) — Google Ads Deep Dive
- [ ] Review search terms from last 3 days
- [ ] Add new negative keywords based on irrelevant terms
- [ ] Check if conversions are tracking (should see form_submit events)
- [ ] Verify location targeting is LA + 15 mile radius
- [ ] Post 1 FB post

### Day 5 (Mar 15) — Weekend Push
- [ ] Post 1 Nextdoor post (weekend project offer)
- [ ] Post 1 Craigslist ad
- [ ] Follow up on any open quotes
- [ ] Check: any reviews received? Follow up Day 3 script if not
- [ ] Review weekly stats (should see SLA data now)

### Day 6-7 (Mar 16-17) — Weekend
- [ ] Monitor leads (SLA cron running)
- [ ] Respond to any weekend leads within 5 min
- [ ] Prep content for Week 2

---

## Week 2: Scale (Mar 18-24)

### Day 8 (Mar 18) — Weekly Review
- [ ] Morning standup with full weekly metrics
- [ ] Google Ads weekly review: spend, CPC, CPA, search terms
- [ ] Channel ROI review: which source is winning?
- [ ] Pipeline review: any stuck leads?
- [ ] Review target progress: leads, revenue, reviews
- [ ] Post 1 FB + 1 Nextdoor

### Day 9 (Mar 19) — Google Ads Expansion
- [ ] Consider adding Search campaign (separate from PMax) for top 5 keywords:
  - "handyman los angeles"
  - "tv mounting los angeles"
  - "cabinet painting los angeles"
  - "furniture assembly los angeles"
  - "painters near me los angeles"
- [ ] Add call extension to Google Ads (if not set)
- [ ] Post 1 Craigslist ad

### Day 10 (Mar 20) — Reviews Push
- [ ] Check review count — target: 5 by end of sprint
- [ ] Send review requests to ALL remaining completed jobs not yet asked
- [ ] Follow up on non-responders (Day 3 template)
- [ ] Post 1 FB post (before/after gallery style)

### Day 11 (Mar 21) — Content Batch
- [ ] Prepare next week's content (3 FB + 3 ND + 2 CL)
- [ ] Create 2 new before/after images (from recent jobs)
- [ ] Post 1 Nextdoor post
- [ ] Follow up on any open quotes

### Day 12 (Mar 22) — Optimization
- [ ] Google Ads: review last 7 days, adjust bids/negative keywords
- [ ] Review CPA trend: is it going down from $127?
- [ ] A/B test idea: try different CTA on landing page
- [ ] Post 1 Craigslist + 1 FB

### Day 13-14 (Mar 23-24) — Sprint Close
- [ ] Full sprint metrics review
- [ ] Document what worked, what didn't
- [ ] Set targets for Sprint 2
- [ ] Morning report should show: leads, revenue, SLA, reviews progress

---

## Sprint KPI Targets

| Metric | Target | Measure |
|--------|--------|---------|
| Revenue | $2,000 | Supabase dashboard_stats(14) |
| New leads | 10 | Real leads (is_test=false) |
| Google reviews | 5 | Google Business Profile |
| First response SLA | < 5 min | avg_response_min from lead_events |
| Contact rate | > 85% | contacted / total leads |
| Quote rate | > 60% | quoted / contacted |
| Close rate | > 30% | won / quoted |
| Google Ads CPA | < $80 | Trending toward $50 |
| Content posts | 12 | 6 FB + 4 ND + 2 CL |

---

## Daily Checklist (every day)

1. [ ] Check morning report (08:00 PT)
2. [ ] Respond to any new leads within 5 min
3. [ ] Follow up on open quotes (Day 1 or Day 3)
4. [ ] Post at least 1 piece of content
5. [ ] Update lead stages in CRM (no stale leads)
6. [ ] Log any completed job → send review request same day
7. [ ] Check Google Ads spend and CPA

---

## Content Calendar

| Day | Platform | Topic |
|-----|----------|-------|
| Mon | FB | Before/after showcase |
| Tue | Nextdoor | Neighborhood special offer |
| Wed | FB | Customer testimonial/review |
| Thu | Craigslist | Service listing (rotate services) |
| Fri | FB + Nextdoor | Weekend availability post |
| Sat | Craigslist | Weekend project special |

---

## Risk Mitigation

| Risk | Trigger | Action |
|------|---------|--------|
| Zero leads in 3 days | Morning report | Increase Google Ads budget 20%, post 2x content |
| CPA > $100 after 7 days | Google Ads review | Switch to Search campaign, pause PMax |
| Zero reviews after 7 days | Weekly review | Personal call to 5 best customers |
| SLA > 15 min avg | Morning report | Set phone alarm, pre-write templates |
| Revenue < $500 at Day 7 | Morning report | Emergency outbound: call all past customers |
