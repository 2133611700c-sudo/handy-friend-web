# SOP: Lead Reactivation

## Purpose
Recover revenue from leads that went cold (no response, no sale, stale pipeline).

## Segments

### Segment A: Stale New (stage=new, age > 48h)
Priority: CRITICAL — money left on the table.

### Segment B: Quoted, No Response (stage=quoted, no activity > 3 days)
Priority: HIGH — already invested time in quoting.

### Segment C: Past Customers (completed job > 30 days ago)
Priority: MEDIUM — repeat/upsell opportunity.

### Segment D: Lost Leads (outcome=lost, age > 30 days)
Priority: LOW — seasonal or re-offer.

---

## Scripts

### Segment A: Stale New Lead — First Touch SMS
```
Hi [NAME], this is Sergii from Handy & Friend. You reached out about [SERVICE] — are you still looking for help with that?

I have availability this week and can give you a quick free estimate. Just reply here or call/text me at (213) 361-1700.

— Sergii
```

### Segment A: Stale New Lead — WhatsApp
```
Hi [NAME]! Sergii from Handy & Friend here 👋

You asked about [SERVICE] recently — still need help with that? I have openings this week.

Happy to give a free estimate. Just let me know!
```

### Segment B: Quoted, No Response — Day 3 Follow-Up
```
Hi [NAME], just checking in on the estimate I sent for [SERVICE]. Any questions? Happy to adjust if needed.

I have a slot open [DAY] if you'd like to move forward.

— Sergii, Handy & Friend
```

### Segment B: Quoted, No Response — Day 7 Final
```
Hi [NAME], last follow-up on your [SERVICE] estimate. If timing isn't right, no worries at all — just let me know and I'll close this out.

If you'd like to reschedule for later, I'm happy to hold the same price.

— Sergii
```

### Segment C: Past Customer — Reactivation
```
Hi [NAME]! Sergii from Handy & Friend — hope everything is going well since your [PREVIOUS_SERVICE]!

Just wanted to let you know we also offer [CROSS_SELL_SERVICE]. If you have any projects coming up, I'd love to help again.

As a returning customer, I can offer priority scheduling. 😊

— Sergii
```

### Segment D: Lost Lead — Re-Offer (30+ days)
```
Hi [NAME], Sergii from Handy & Friend. You asked about [SERVICE] a while back — just wanted to check if that project is still on your list?

We have some availability and competitive pricing right now. Happy to give a fresh estimate if interested.

No pressure — just reaching out!
```

---

## Cadence

| Segment | Day 0 | Day 1 | Day 3 | Day 7 | Day 14 | After |
|---------|-------|-------|-------|-------|--------|-------|
| A: Stale New | SMS | Call attempt | WhatsApp | Final SMS | Close as lost (L4) | — |
| B: Quoted | — | — | Follow-up SMS | Final SMS | Close as lost (L4) | — |
| C: Past Customer | SMS/WhatsApp | — | — | — | — | Repeat quarterly |
| D: Lost | SMS | — | — | — | — | Repeat in 90 days |

## Stop Rules
- Customer replies "not interested" / "stop" → immediately stop, mark lost
- Customer doesn't respond after full cadence → close as lost (L4: No response)
- Never more than 4 total messages per lead across entire reactivation

## Attribution
- Source: `reactivation`
- Campaign: `reactivation_[segment]_[YYYY-MM]`
- Track: reopened lead → new quote → won/lost

## KPI
- Reactivation attempt rate: 100% of eligible leads
- Response rate target: 20%+
- Win rate from reactivated: 10%+
- Revenue recovered target: $500/month

---

## IMMEDIATE ACTION: Lead chat_1772464815694

**Lead details:**
- Phone: 310-663-5792
- Service: cabinet_painting
- Created: March 2, 2026 (9 days ago)
- Stage: new (NEVER contacted)
- Name: Unknown

**Send NOW:**
```
Hi there! This is Sergii from Handy & Friend. You reached out about cabinet painting — are you still looking for help with that?

I have availability this week. Cabinet painting starts at $75/door, paint included.

Just reply here or call/text (213) 361-1700 for a free estimate!

— Sergii
```

**If no response by Day 3 (March 14):**
```
Quick follow-up on cabinet painting — still interested? Happy to come by for a free estimate. No pressure!

— Sergii, (213) 361-1700
```

**If no response by Day 7 (March 18):**
Close as lost (L4: No response). Update stage → closed, outcome → lost, lost_reason → L4.
