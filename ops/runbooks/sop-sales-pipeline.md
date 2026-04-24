# SOP: Sales Pipeline & SLA Operations

**Owner:** Sergii
**Effective:** 2026-03-11
**Review:** Weekly (every Monday morning report)

---

## Pipeline Stages (MANDATORY — no skips)

```
new → contacted → qualified → quoted → closed (won/lost)
```

| Stage | Definition | SLA | Owner Action |
|-------|-----------|-----|-------------|
| **new** | Lead captured (form/chat/FB/phone) | ≤ 5 min first response | Call/text within 5 min |
| **contacted** | First response sent (call/SMS/WhatsApp) | ≤ 2 hours qualify | Ask: service, address, timeline, budget |
| **qualified** | Service + scope confirmed | ≤ 24 hours send quote | Build quote, send via SMS/email |
| **quoted** | Quote delivered to customer | ≤ 3 days follow-up | Day 1: check-in, Day 3: final follow-up |
| **closed:won** | Customer accepted + job scheduled | Same day | Schedule, confirm, update CRM |
| **closed:lost** | Customer declined or no response | Immediate | Log lost_reason (L1-L6) |

---

## Lost Reasons (REQUIRED on every lost lead)

| Code | Reason | Action |
|------|--------|--------|
| L1 | Price too high | Review pricing, add to re-offer queue |
| L2 | Chose competitor | Note competitor, review positioning |
| L3 | Project cancelled/postponed | Add to reactivation queue (30 days) |
| L4 | No response (full cadence complete) | Close, quarterly re-offer |
| L5 | Out of service area | Close permanently |
| L6 | Spam/test/invalid | Mark is_test=true |

---

## SLA Escalation Chain

| Time Since Lead Created | Alert Level | Action |
|------------------------|-------------|--------|
| 0 min | Telegram instant alert | Owner sees lead immediately |
| 5 min (no contact) | Telegram escalation #1 | "⚠️ Lead 5 MIN — call NOW" |
| 15 min (no contact) | Telegram escalation #2 | "🔴 Lead 15 MIN — CRITICAL" |
| 30 min (no contact) | Telegram escalation #3 | "🚨 Lead 30 MIN — revenue at risk" |
| 60 min (no contact) | Daily report flag | "stale_leads" count in morning report |
| 24 hours | Auto-close candidate | Review in morning standup |

**Escalation endpoint:** `/api/cron/sla-escalation` (runs every 5 minutes via Vercel Cron)

---

## First Contact Scripts

### Script 1: Phone Call (preferred)
```
Hi [NAME], this is Sergii from Handy & Friend.
You just submitted a request about [SERVICE] — I wanted to reach out right away.

Can you tell me a bit more about what you need?
- What's the scope? (e.g., how many doors for cabinet painting)
- What's your address?
- When would you like it done?

I can give you an exact price right now / I'll send you a quote within the hour.
```

### Script 2: SMS (if no answer)
```
Hi [NAME]! Sergii from Handy & Friend here. Got your request about [SERVICE]. I just tried calling — when's a good time to connect? Or I can text you a quote right here. (213) 361-1700
```

### Script 3: WhatsApp (if phone is mobile)
```
Hi [NAME]! Sergii from Handy & Friend 👋
Got your request about [SERVICE]. Happy to give you a quick quote right here.
Can you share a few details:
1. Address (or general area)
2. Scope (e.g. how many items/rooms)
3. When you'd like it done
```

---

## Quote Follow-Up Scripts

### Day 1: Check-In
```
Hi [NAME], just sent you the estimate for [SERVICE] — did you get a chance to look at it? Happy to answer any questions!
```

### Day 3: Final Push
```
Hi [NAME], last follow-up on your [SERVICE] estimate. If timing isn't right, no worries — just let me know and I can hold the price for you. — Sergii
```

### Day 7: Close
If no response after Day 3, close as L4 (no response). Add to reactivation queue.

---

## Daily Standup (08:00 PT, 15 min max)

**Trigger:** Morning report arrives in Telegram + Email.

**Checklist:**
1. [ ] Check stale leads count — any > 0 = immediate action
2. [ ] Check 7d revenue vs target ($1,000/week)
3. [ ] Check 7d lead count vs target (5/week)
4. [ ] Review any alerts (SLA, lead drop, overdue jobs)
5. [ ] Plan today's outbound: who to call, who to follow up
6. [ ] Update: any quotes pending? Any jobs to close?

---

## CRM Rules (NON-NEGOTIABLE)

1. **Every lead gets a `lead_id`** — no manual jobs without CRM entry
2. **Every contact gets logged** — call, SMS, WhatsApp = `lead_event`
3. **Every quote gets a `quoted_amount`** — before marking "quoted"
4. **Every close gets `outcome` + `reason`** — won needs `won_amount`, lost needs `lost_reason`
5. **No stage skipping** — new→contacted→qualified→quoted→closed, period
6. **Test leads marked immediately** — `is_test=true`, never in reports

---

## Weekly Review (Monday 08:30 PT)

1. Pipeline health: leads by stage, velocity, bottlenecks
2. Channel ROI: spend vs revenue by source
3. Lost analysis: top lost_reasons, actionable patterns
4. Google Ads: search terms audit, negative keyword cleanup
5. Reviews: count this week, total, target progress
6. Content: posts published, engagement, leads attributed
7. Action items for the week (max 3 priorities)
