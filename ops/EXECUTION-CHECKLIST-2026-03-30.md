# 🚀 EXECUTION CHECKLIST — 2026-03-30
## Маркетинговая стратегия $150/мес бюджет

**План:** 80% бесплатные каналы + 20% точечная реклама (Google Ads)
**Цель:** 6-11 jobs/мес, $1650-4350 revenue
**Статус:** Live automation ready, лидов пока мало (1 за 3 дня)

---

## ⏰ СРОЧНО СЕГОДНЯ (30 мин)

### STEP 1: Google Ads Configuration (10 мин в браузере)
**Ссылка:** https://ads.google.com (account 637-606-8452)
**Кампания:** LA Search - Core Services

**ДЕЙСТВИЯ:**
1. ✅ Перейти в Campaign → LA Search - Core Services
2. ✅ **Включить 5 ad groups:**
   - Interior Painting ✅
   - Cabinet Painting ✅
   - Flooring (LVP Installation) ✅
   - Drywall Repair ✅
   - TV Mounting ✅

3. ✅ **Отключить 7 ad groups:**
   - Vanity ❌
   - Door Installation ❌
   - Backsplash ❌
   - Lighting ❌
   - Plumbing ❌
   - Electrical ❌
   - Handyman General ❌

4. ✅ **Бюджет:** Поднять с $1 → **$5/день**
   - Budget location: Campaign → Settings → Daily Budget
   - Verify: ALL 5 ad groups have "Enabled" status
   - Verify: Ads have "Approved" status (if not → check copy)

5. ✅ **Check:** Bid strategy остается "Maximize Clicks" (авто оптимально при $5/день)

**EXPECTED:** Через 24 часа: 50-100+ impressions, 5-10 clicks/день (CPC ~$3.41)

---

### STEP 2: Manual Nextdoor Scan NOW (15 мин)
**Инструмент:** Nextdoor.com (залогинен)
**Частота:** 3-5 ответов/день

**ДЕЙСТВИЯ:**
1. Open: https://nextdoor.com
2. Search keywords (rotate):
   - "handyman"
   - "TV mount" / "mount TV"
   - "cabinet painting"
   - "interior painting"
   - "flooring"
   - "fix" / "repair"

3. Filter: **This Week** + Distance (< 5 miles)
4. For each GREEN/YELLOW post:
   - Copy post URL
   - Generate response using template:
     ```
     Hi [name]! I'm Sergii, your neighbor in [area].
     I do [service] professionally — happy to come take a look
     and give you a free estimate.
     Call or text (213) 361-1700.
     More info at handyandfriend.com
     ```
   - Post comment
   - Log URL + response time in leads tracker

**EXPECTED:** 3-5 qualified responses/день = 21-35 leads/неделю

---

### STEP 3: Check OpenClaw Automation Status (5 мин)
**Команда:** `bash exo.sh leads health`

**CURRENT STATUS:**
```
OpenClaw:     ✅ RUNNING
Watchdog:     ✅ ACTIVE
Last scan:    2026-03-27T00:13:00-07:00
Nextdoor:     1/25 responses today
Facebook:     0/15 responses today
Total leads:  1
```

**ACTIONS:**
1. ✅ Verify cron jobs running:
   ```bash
   crontab -l | grep handy
   ```
   Expected: 2 lines (nextdoor-hunter every 2h, facebook-hunter every 3h)

2. ✅ Check Telegram alerts working:
   - Message `/api/hunter-lead` API
   - Verify Telegram notifications arrive

3. ✅ Monitor draft mode:
   - OpenClaw generates **suggestions only**, не публикует автоматически
   - Ты approve → публикуется

---

## 📅 DAILY ROUTINE (60 мин/день)

### Morning (8:00 AM)
- [ ] Run: `bash exo.sh morning` (status check)
- [ ] Check Telegram alerts (overnight leads)
- [ ] Nextdoor manual scan: 3-5 responses
- [ ] Facebook Groups: 2-3 responses (top 3 groups)

### Afternoon (1:00 PM)
- [ ] Facebook Groups: monitor for hot leads
- [ ] Respond to incoming Messenger inquiries
- [ ] Log all lead sources + response times

### Evening (6:00 PM)
- [ ] Nextdoor final sweep: 1-2 more responses
- [ ] Review day's lead stats: `bash exo.sh leads stats`
- [ ] Prepare Craigslist post for tomorrow (draft)

**MINIMUM DAILY OUTPUT:**
- 5-7 Nextdoor responses
- 2-3 Facebook responses
- 1-2 Craigslist posts per week
- All responses logged with timestamps

---

## 📊 KPI TRACKING

### Expected Monthly Results (if executed)

| Channel | Cost | Leads/мес | Jobs | Revenue |
|---------|------|-----------|------|---------|
| Google Ads | $150 | 2-4 | 1-2 | $300-750 |
| Nextdoor (ручной) | $0 | 5-10 | 2-3 | $600-1500 |
| FB Groups | $0 | 3-5 | 1-2 | $300-750 |
| OpenClaw auto | $0 | 3-5 | 1-2 | $300-750 |
| Craigslist | $0 | 2-3 | 1 | $150-300 |
| GBP organic | $0 | 1-2 | 0-1 | $0-300 |
| **TOTAL** | **$150** | **16-29** | **6-11** | **$1650-4350** |

**ROI: 11x-29x on $150 spend**

---

## 🔥 CRITICAL FILES

- `exo.sh` — main automation script
- `openclaw-skills/nextdoor-hunter/SKILL.md` — lead hunting logic
- `openclaw-skills/facebook-hunter/SKILL.md` — FB Groups hunter
- `ops/leads.json` — captured leads database
- `ops/hunter.log` — scan logs

---

## ⚠️ ANTI-PATTERNS (DO NOT DO)

❌ Publish same message twice in a thread (Nextdoor flags as spam)
❌ Respond to RED scope posts (roofing, HVAC, structural, etc.)
❌ Quote exact dollar amounts in public posts (say "from $X" or "free estimate")
❌ Respond to same person twice within 7 days
❌ Post more than 8 responses/scan or 25/день (Nextdoor rate limit)
❌ Disable OpenClaw if you want scale (automation critical for 50+ scans/week)

---

## 📋 VERIFICATION CHECKLIST

**Before launching:**
- [ ] Google Ads: 5 ad groups enabled, budget $5/day, ads approved
- [ ] Nextdoor: manual routine 5-7 responses/day started
- [ ] OpenClaw: cron jobs active, Telegram alerts working
- [ ] Leads: tracked in Supabase, funnel visible in `/api/health?type=stats`
- [ ] SLA: first responses logged with timestamps

**After 24 hours:**
- [ ] Google Ads: showing impressions > 0, clicks > 0
- [ ] Nextdoor: 5-7 responses posted, leads flowing in
- [ ] OpenClaw: 5+ automated scan suggestions generated
- [ ] Pipeline: Supabase `leads` table growing

**After 7 days:**
- [ ] Total leads: 20+ captured
- [ ] Google Ads ROI: cost/lead tracking active
- [ ] Nextdoor leads: conversion rate measurable
- [ ] Facebook: 10+ qualified responses posted

---

## 🎯 NEXT STEPS

**PRIORITY ORDER:**
1. ✅ Google Ads config (chrome needed — when available)
2. ✅ Nextdoor manual routine START NOW
3. ✅ Verify OpenClaw running
4. 📅 Continue daily routine indefinitely
5. 📊 Track metrics weekly, optimize top performers

**IF CHROME NOT AVAILABLE:**
- Start with Nextdoor + OpenClaw (100% manual/automated, no browser needed)
- Do Google Ads when Chrome is back (highest ROI, can wait 1 day)

---

**Обновлено:** 2026-03-30
**Статус:** Ready to Execute
