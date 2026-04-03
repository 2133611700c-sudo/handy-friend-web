# 🎯 ДЕЙСТВИЯ НА СЕГОДНЯ — 2026-03-30

**Время на все:** 30 минут
**ROI:** $150 spend → $1650-4350 revenue/месяц (11x-29x)

---

## 🥇 ПРИОРИТЕТ #1: Google Ads (10 мин)

**Статус:** ⏳ Ждет выполнения
**Инструкции:** `/ops/GOOGLE-ADS-SETUP-NOW.md`

### Что делать:
1. Открыть: https://ads.google.com (account 637-606-8452)
2. Перейти: Campaign "LA Search - Core Services"
3. **ВКЛЮЧИТЬ 5 ad groups:**
   - Interior Painting
   - Cabinet Painting
   - Flooring (LVP)
   - Drywall Repair
   - TV Mounting
4. **ОТКЛЮЧИТЬ 7 ad groups:**
   - Vanity, Door, Backsplash, Lighting, Plumbing, Electrical, Handyman General
5. **Поднять бюджет:** с $1 → **$5/день**
6. **Проверить:** все ads имеют зелёный ✅ "Approved" статус

**Ожидаемый результат через 24h:**
- 50-100+ impressions
- 5-10 clicks ($3.41 CPC)
- 2-4 leads/месяц за $150 spend

---

## 🥈 ПРИОРИТЕТ #2: Nextdoor Manual Scanning (15 мин/день)

**Статус:** ✅ Готово к запуску
**Инструменты:** Nextdoor.com + `/daily-ops.sh morning`

### Ежедневный процесс (утром 8:00 AM):
```bash
bash daily-ops.sh morning  # Проверить статус системы
```

Потом:
1. Открыть Nextdoor.com (залогинен)
2. Искать посты с keywords: "handyman", "TV mount", "paint", "flooring", "fix"
3. Фильтр: **This Week** + Distance < 5 miles
4. Для каждого поста (GREEN/YELLOW scope):
   ```
   Hi [name]! I'm Sergii, your neighbor in [area].
   I do [service] professionally — free estimate.
   Call/text (213) 361-1700.
   handyandfriend.com
   ```
5. Post comment, log URL + timestamp

**Целевой объём:** 5-7 responses/день = 35-50 leads/неделю

---

## 🥉 ПРИОРИТЕТ #3: OpenClaw Automation (уже работает)

**Статус:** ⚙️ Активна (после crontab fix)

### Что это делает (автоматически):
- Каждый час 7am-9pm: сканирует Nextdoor на новые посты
- Классифицирует: GREEN / YELLOW / RED scope
- Генерирует черновики ответов
- Отправляет alerts в Telegram
- Ты approve → публикуется автоматически

### Что нужно делать:
```bash
# Проверить здоровье системы
bash exo.sh leads health

# Посмотреть последние leads
bash exo.sh leads list

# Посмотреть статистику
bash exo.sh leads stats
```

---

## 📋 СЕГОДНЯ — ФИНАЛЬНЫЙ ЧЕКЛИСТ

### 8:00 AM
- [ ] Запустить: `bash daily-ops.sh morning`
- [ ] Проверить: система ✅

### 9:00 AM
- [ ] Открыть Google Ads: https://ads.google.com
- [ ] Следовать: `/ops/GOOGLE-ADS-SETUP-NOW.md` (10 мин)
- [ ] Проверить: бюджет $5/день установлен ✅

### 9:15 AM - 5:00 PM
- [ ] Открыть Nextdoor
- [ ] Сканировать 4-5 раз в день (8am, 11am, 2pm, 5pm, 8pm)
- [ ] Отвечать на 3-5 постов каждый раз
- [ ] Логировать URLs + время ответа

### 1:00 PM
- [ ] Запустить: `bash daily-ops.sh afternoon`
- [ ] Проверить: сколько leads пришло

### 6:00 PM
- [ ] Запустить: `bash daily-ops.sh evening`
- [ ] Подготовить: 1-2 Craigslist поста на завтра

### 9:00 PM
- [ ] Проверить: Telegram alerts (были ли new leads?)
- [ ] Завтра повторить

---

## 🚀 EXPECTED RESULTS

### После 1 дня (31 Mar):
- Google Ads: 50+ impressions, 2-5 clicks
- Nextdoor: 20-25 ручных responses
- Leads: 5-10 новых

### После 1 недели (6 Apr):
- Google Ads: 350+ impressions, 20-30 clicks, 2-4 leads
- Nextdoor: 140-175 responses, 10-20 leads
- OpenClaw: 50+ scan suggestions, 5-10 leads
- **Total: 17-34 leads**

### После 1 месяца (30 Apr):
- Google Ads: 2-4 qualified leads → 1-2 jobs
- Nextdoor: 20-40 qualified leads → 5-10 jobs
- OpenClaw: 15-30 qualified leads → 3-6 jobs
- Facebook: 5-15 qualified leads → 1-3 jobs
- **Total: 6-11 jobs, $1650-4350 revenue**

---

## 📂 CRITICAL FILES (Reference)

```
~/handy-friend-landing-v6/
├── exo.sh                           # Main automation tool
├── daily-ops.sh                     # Daily routine helper
├── ops/
│   ├── EXECUTION-CHECKLIST-2026-03-30.md
│   ├── GOOGLE-ADS-SETUP-NOW.md     # ← READ THIS FIRST
│   ├── ACTION-PLAN-2026-03-30.md   # ← YOU ARE HERE
│   ├── leads.json                   # Lead database
│   └── hunter.log                   # Scan logs
├── openclaw-skills/
│   ├── nextdoor-hunter/SKILL.md    # Nextdoor automation
│   └── facebook-hunter/SKILL.md    # Facebook automation
└── api/
    └── health.js                    # Stats API
```

---

## 🔗 KEY LINKS

- **Google Ads:** https://ads.google.com (637-606-8452)
- **Nextdoor:** https://nextdoor.com
- **Facebook Groups:** https://facebook.com/groups (30 groups listed in ops/fb-groups-target.md)
- **Craigslist:** https://losangeles.craigslist.org
- **Stats Dashboard:** `curl https://handyandfriend.com/api/health?type=stats`

---

## ⚡ QUICK COMMANDS (Copy & Paste)

```bash
# Daily routine
bash daily-ops.sh morning     # 8am startup
bash daily-ops.sh afternoon   # 1pm check-in
bash daily-ops.sh evening     # 6pm summary

# Lead monitoring
bash exo.sh leads health      # System health
bash exo.sh leads list        # Recent leads
bash exo.sh leads stats       # Conversion stats

# Full status
bash exo.sh status            # All tools status

# Manual lead scan (if OpenClaw offline)
bash exo.sh leads scan        # Trigger manual scan
```

---

## 🎯 SUMMARY

**The Plan:**
- 20% paid (Google Ads): $150/month → 2-4 leads
- 80% free (Nextdoor + FB + OpenClaw): 14-25 leads
- **Total: 6-11 jobs/month, $1650-4350 revenue**

**Your Job:**
1. ✅ Configure Google Ads ($5/day budget) — 10 min
2. ✅ Scan Nextdoor 3-5x/day (5 min each) — 25 min/day
3. ✅ Monitor OpenClaw suggestions (automated)
4. ✅ Track leads + responses (logging)
5. ✅ Review metrics weekly

**Time Investment:**
- **Today:** 30 minutes (Google Ads setup + Nextdoor scan)
- **Daily:** 30-45 minutes (Nextdoor + Facebook + monitoring)
- **Weekly:** 1 hour (review metrics, optimize)

**ROI:**
- Investment: $150/month
- Returns: $1650-4350/month
- **Profit: $1500-4200/month**

---

**Status:** 🟢 Ready to Execute
**Next Step:** Do PRIORITY #1 (Google Ads) first — takes 10 min
