# 📅 MARKETING SCHEDULE — Handy & Friend (2026-03-30)

**Goal:** Generate 6-11 jobs/month, $1650-4350 revenue
**Budget:** $150/month (Google Ads)
**Effort:** 30-45 min/day + automated systems

---

## 🌅 MORNING ROUTINE (8:00 AM - 9:00 AM)

```bash
# Step 1: Check system status
bash daily-ops.sh morning

# Expected output:
# ✅ Repo OK
# ✅ Site 200 OK
# ✅ OpenClaw RUNNING
# ✅ Lead hunter health check
```

**What to do:**
- [ ] Review overnight leads (if any in Telegram)
- [ ] Check Google Ads impressions (if auto-config completed)
- [ ] Plan 5-7 Nextdoor responses for the day
- [ ] Check Messenger for new inquiries

**Time:** 5 minutes

---

## 🔍 NEXTDOOR SCANNING (3-5 times/day)

**Schedule:**
- **8:30 AM** — Morning scan
- **11:00 AM** — Mid-morning scan
- **2:00 PM** — Afternoon scan
- **5:00 PM** — Evening scan
- **8:00 PM** — Late evening scan (if capacity)

**Each scan (5 minutes):**
1. Open: https://nextdoor.com
2. Search keywords (rotate daily):
   - Day 1: "handyman", "TV mount", "paint"
   - Day 2: "flooring", "fix my", "repair"
   - Day 3: "furniture assembly", "cabinet", "drywall"
3. Filter: **This Week** + **Distance < 5 miles**
4. For each GREEN/YELLOW post:
   ```
   Hi [name]! I'm Sergii, local handyman in [area].
   I do [service] professionally — free estimate.
   (213) 361-1700 or handyandfriend.com
   ```
5. Log URL + timestamp in `/ops/leads-log.txt`

**Target:** 1-2 responses per scan × 5 scans = 5-7/day

**AUTO:** OpenClaw also scans hourly 7am-9pm (suggestions in Telegram)

---

## 📱 FACEBOOK GROUPS (2 times/day)

**Schedule:**
- **10:00 AM** — Morning scan (top 3 groups)
- **3:00 PM** — Afternoon scan (top 3 groups)

**Each scan (5 minutes):**
1. Open top 3 Facebook groups (from `/ops/fb-groups-target.md`):
   - HANDYMAN SERVICES NEEDED (82K)
   - Contractors & Referrals LA (9.3K)
   - Contractors & Home Improvement (41.7K)
2. Sort by **Recent**
3. Look for service requests (GREEN/YELLOW scope)
4. Post as **Handy & Friend Page** (not personal):
   ```
   Hi [name]! We handle [service] in LA.
   Professional, insured, free estimates.
   (213) 361-1700 or handyandfriend.com
   ```
5. Max **2-3 responses/scan**

**Target:** 2-3 responses × 2 scans = 4-6/day

**AUTO:** OpenClaw also scans every 3 hours (suggestions in Telegram)

---

## 💼 CRAIGSLIST (2-4 times/week)

**Schedule:**
- **Monday 6:00 AM** — Post 1 ad
- **Wednesday 6:00 AM** — Post 1 ad
- **Friday 6:00 AM** — Post 1 ad
- **Sunday 7:00 AM** — Post 1 ad

**Process (5 minutes):**
1. Open: https://losangeles.craigslist.org/post/create
2. Use templates from `/ops/craigslist-post-*.md`:
   - Post 1: **TV Mounting** (highest demand)
   - Post 2: **Cabinet Painting** (high ROI)
   - Post 3: **General Handyman** (catch-all)
3. Add phone: **(213) 361-1700**
4. Submit
5. Verify email link CL sends
6. Tag: `CL-YYYYMMDD-01`

**Target:** 2-4 posts/week

**Note:** Craigslist blocks automation → manual posting only

---

## 📊 AFTERNOON CHECK (1:00 PM - 1:15 PM)

```bash
bash daily-ops.sh afternoon
```

**What to check:**
- [ ] How many leads so far today?
- [ ] Any hot leads in Telegram (< 1 hour old)?
- [ ] Respond immediately to hot leads
- [ ] Check Google Ads dashboard (impressions/clicks)

**Time:** 5 minutes

---

## ⚙️ AUTOMATED SYSTEMS (Run 24/7)

### OpenClaw Hunter
**What it does:**
- Scans Nextdoor every hour (7am-9pm, Mon-Sat)
- Scans Facebook every 3 hours (8am-8pm)
- Generates response drafts
- Sends alerts to Telegram
- You approve → publishes automatically

**Your job:** Just approve good suggestions in Telegram

### Google Ads (After auto-config)
**What it does:**
- Runs ads on 5 high-ROI ad groups
- $5/day budget
- Targets LA service area
- Auto-optimizes bids

**Your job:** Monitor ROI weekly

### Telegram Alerts
**What you get:**
- Every Nextdoor/FB post we find → `[FOUND] post title`
- Every response we post → `[POSTED] response` + link
- Hot leads (< 1 hour) → `[HOT LEAD] immediate alert`
- Daily stats → 9:00 PM summary

**Your job:** Check Telegram every 2-4 hours, approve good matches

---

## 🌆 EVENING WRAP-UP (6:00 PM - 6:15 PM)

```bash
bash daily-ops.sh evening
```

**What to do:**
- [ ] Review day's results
- [ ] Log all responses with timestamps
- [ ] Plan tomorrow's Craigslist post (if applicable)
- [ ] Check for any errors in logs

**Time:** 5 minutes

---

## 📋 DAILY TIME BREAKDOWN

| Task | Time | Frequency |
|------|------|-----------|
| Morning routine | 5 min | 1x/day (8am) |
| Nextdoor scans | 5 min × 5 | 5x/day |
| Facebook scans | 5 min × 2 | 2x/day |
| Afternoon check | 5 min | 1x/day (1pm) |
| Evening wrap-up | 5 min | 1x/day (6pm) |
| Telegram approvals | 3 min × 8 | 8x/day (as alerts come) |
| **TOTAL** | **~45 min** | **per day** |

**Automated (no action needed):** OpenClaw scans, Google Ads, email notifications

---

## 📊 WEEKLY TASKS

### Monday Morning (9:00 AM)
- Review last week's stats
- Check: leads captured, jobs booked, revenue
- Identify top-performing ad groups (Google Ads)
- Plan next week's Craigslist posts

### Friday Afternoon (4:00 PM)
- Prepare content for next week
- Review Nextdoor/FB Groups performance
- Update pricing if needed

### Sunday Evening (6:00 PM)
- Compile weekly report
- Send to Telegram/email
- Plan optimizations

---

## 🎯 MONTHLY TARGETS

| Metric | Target | Source |
|--------|--------|--------|
| Leads captured | 16-29 | Google Ads (2-4) + Nextdoor (5-10) + FB (3-5) + OpenClaw (3-5) + CL (2-3) |
| Qualified leads | 12-20 | After filtering RED scope |
| Jobs booked | 6-11 | Avg 50-70% conversion |
| Revenue | $1650-4350 | Avg job value $275-395 |
| **ROI** | **11x-29x** | On $150 spend |

---

## 🚨 CRITICAL RULES

❌ **DO NOT:**
- Post same message twice in same thread (spam flag)
- Respond to RED scope posts (roofing, HVAC, structural)
- Quote exact prices in comments ("free estimate" instead of "$X")
- Exceed rate limits (8/day Nextdoor, 5/day Facebook, 4/week CL)
- Contact same person twice in 7 days

✅ **DO:**
- Use templates (in SKILL.md)
- Log every response (URL + timestamp)
- Monitor Telegram for alerts
- Approve OpenClaw suggestions (or skip)
- Track conversions weekly

---

## 🔧 QUICK COMMANDS

```bash
# Daily routine
bash daily-ops.sh morning       # 8:00 AM
bash daily-ops.sh afternoon     # 1:00 PM
bash daily-ops.sh evening       # 6:00 PM

# Monitor leads in real-time
bash scripts/monitor-leads.sh   # Refresh every 30 sec

# Check automation status
bash exo.sh leads health        # System health
bash exo.sh leads list          # Recent leads
bash exo.sh leads stats         # Conversion stats

# Manual scans (if OpenClaw down)
bash exo.sh leads scan          # Trigger all hunters
```

---

## 📈 SUCCESS METRICS

**After 1 week:**
- Impressions from Google Ads: 350+
- Nextdoor responses: 140+
- Facebook responses: 30+
- OpenClaw suggestions: 50+
- Leads captured: 17-34

**After 1 month:**
- Revenue: $1650-4350
- Jobs: 6-11
- ROI: 11x-29x

---

## ⏰ YOUR SCHEDULE (TL;DR)

```
8:00 AM    — Run: bash daily-ops.sh morning
8:30 AM    — Nextdoor scan #1 (5 min)
10:00 AM   — Facebook scan #1 (5 min)
11:00 AM   — Nextdoor scan #2 (5 min)
1:00 PM    — Run: bash daily-ops.sh afternoon
2:00 PM    — Nextdoor scan #3 (5 min)
3:00 PM    — Facebook scan #2 (5 min)
5:00 PM    — Nextdoor scan #4 (5 min)
6:00 PM    — Run: bash daily-ops.sh evening
8:00 PM    — Nextdoor scan #5 (5 min, optional)

Throughout day:
- Check Telegram every 2-4 hours
- Approve OpenClaw suggestions
- Respond to Messenger inquiries
```

---

**Status:** ✅ Ready to Execute
**Start:** Now! (while Google Ads auto-config runs)
