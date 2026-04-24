# Handy & Friend — Optimization Playbook
**Version:** 1.0
**Date:** 2026-04-16
**Owner:** Claude Ops (reviewed by Sergii)
**Scope:** Google Ads + Landing Pages + Lead Pipeline

---

## RULE SET: Google Ads

### Trigger 1 — Zero impressions after 48h
**Condition:** Search Impression Share = 0%, no impressions in 48h
**Check sequence:**
1. Campaign status = Enabled?
2. Budget > $0/day? (daily cap: $6.40)
3. Keywords: any Exact/Phrase active with sufficient volume?
4. Quality Score: ads eligible?
5. Location: "Presence only" — not "Interest or presence"?
6. Ad schedule: current day/time covered?
**Fix:** Resolve first failing check. Do NOT add broad match. Do NOT raise budget above $6.40.

---

### Trigger 2 — Impressions but 0 clicks (CTR < 1%)
**Condition:** Impressions > 50 in 7 days, clicks = 0
**Check sequence:**
1. RSA quality = "Хорошее" or "Отлично" for each active AG?
2. Headlines include price anchor ($X), service name, geo (LA)?
3. Sitelinks present at campaign level (min 4)?
4. Callouts present (min 4)?
5. Ad position: Search top IS < 10%? → bid is too low
**Fix options (in order):**
- Add/replace 2 headlines in weakest RSA
- Verify sitelinks are active (not paused/disapproved)
- Check Lost IS (rank) — if > 70%, increase max CPC by $0.50 (cap: $4.00)
- Add structured snippet (Services header)

---

### Trigger 3 — Clicks but 0 leads (CVR < 5%)
**Condition:** Clicks > 10 in 14 days, form_submit + phone_click = 0
**Check sequence:**
1. Landing page loads in < 3s on mobile?
2. Price visible above fold?
3. Phone CTA in viewport on mobile?
4. WhatsApp CTA in viewport on mobile?
5. form_submit event firing in GA4 real-time?
6. Search terms: any irrelevant terms driving wasted clicks? → add negatives
**Fix options:**
- Add phone number to H1 or hero subtitle if not visible
- Verify GA4 is receiving form_submit (check real-time)
- Add 5+ negative keywords from search term report

---

### Trigger 4 — Leads but no bookings
**Condition:** Leads in Supabase > 3, booked_jobs = 0 in 14 days
**Check sequence:**
1. Response time: < 5 min for phone/WA leads?
2. Quote sent within 1h?
3. Follow-up Day 1 executed (followups_log has row)?
4. Lead status stuck at "new" > 24h?
**Fix:** Speed-to-lead audit. Activate Day 1 followup manually if scheduler missed it.

---

### Trigger 5 — Pacing risk (budget burn)
**Condition:** Daily spend > $5.80 for 3 consecutive days (= pacing toward $6.40 cap)
**Actions (in order):**
1. Review search terms — add negatives for non-converting terms
2. Tighten ad schedule: remove lowest-converting hours (check segments → hour of day)
3. Reduce max CPC by $0.25 (floor: $2.50)
4. Do NOT pause active AGs without owner approval
5. Do NOT raise daily budget above $6.40 without owner approval

---

### Trigger 6 — RSA quality drops to "Плохое"
**Condition:** Any active RSA quality = "Плохое" (Bad)
**Fix:**
1. Replace 2 most similar headlines with distinct variants
2. Ensure: 1 price headline, 1 geo headline, 1 urgency/timing headline, 1 feature headline
3. Check: descriptions include service name + phone + CTA?
4. Save and wait 24h for Google re-evaluation

---

## RULE SET: Landing Pages

### Trigger — Bounce rate > 80% on paid page
**Check:** Price visible? CTA visible? Mobile load < 3s?
**Fix:** A/B test hero CTA text. Move price higher on page. Add click-to-call button at top.

---

## RULE SET: Lead Pipeline

### Trigger — Supabase lead count flat > 7 days (0 new leads)
**Check sequence:**
1. Ads running and getting impressions? (Phase 1)
2. Form submitting without errors? (check /api/submit-lead logs in Vercel)
3. Social ingest running? (ops/fb-ingest.log + ops/cl-ingest.log fresh?)
4. Telegram alerts working? (check ops/telegram-sends.jsonl last entry)

---

## NEVER DO

| Action | Reason |
|--------|--------|
| Enable Performance Max | Burned $280 with 0 leads |
| Enable broad match | Too early (< 50 conv/month) |
| Enable Search Partners | Increases junk clicks |
| Enable Display Network | Off-target traffic |
| Switch to tCPA/tROAS | Need 50+ conv/month first |
| Enable auto-apply recommendations | Loss of control |
| Raise daily budget above $6.40 | Owner hard cap |
| Pause AG2/AG3/AG4 | Active paid entry points |

---

## WEEKLY REVIEW CHECKLIST

Every Monday morning:
- [ ] Check KPI_SCOREBOARD.csv — update Ads columns manually
- [ ] Check Search top IS — is it > 20%?
- [ ] Check CTR — improving week-over-week?
- [ ] Any new search terms to add as negatives?
- [ ] Any followup_log rows stuck at "pending" > 3 days?
- [ ] Any RSA quality regressions?
- [ ] Any new leads from social/organic?

---

## MEASUREMENT CADENCE

| Metric | Check Frequency | Source |
|--------|----------------|--------|
| Impressions / Clicks / Spend | Daily | Google Ads Overview |
| Search top IS | Weekly | Google Ads Campaigns table |
| Lead count | Daily | Supabase / daily report |
| Follow-up execution | Daily | followups_log table |
| Response time SLA | Weekly | v_response_sla view |
| Conversion events | Weekly | GA4 Key Events |
| Content posted | Weekly | ops/post-queue-4weeks.md |
