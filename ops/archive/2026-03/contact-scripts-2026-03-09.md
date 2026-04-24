# Contact Scripts — 2026-03-09

## LEAD 1: Sandra Kirby
- **Phone**: 575-805-0706
- **Email**: kirbysandra62@yahoo.com
- **Service**: Art & Mirror Hanging ($95 up to 5 pieces)
- **Source**: Google Ads (gclid present)
- **When**: Today, 2026-03-09 02:51 UTC
- **Note**: 4 duplicate submissions — she clicked submit multiple times

### SMS (English)
```
Hi Sandra! This is Handy & Friend — we got your request for mirror/art hanging. We can usually do this same week. Price is $95 for up to 5 pieces. Want to set up a time? — Handy & Friend (213) 361-1700
```

### Call Script (English)
```
Hi Sandra, this is [Name] from Handy & Friend. You submitted a request on our website for art and mirror hanging. Just wanted to reach out — we typically handle that same week. It's $95 for up to 5 pieces, and we're insured.

Would you like to tell me a bit more about what you need hung up? How many pieces are we talking about?

[IF she says yes → get details, schedule]
[IF voicemail → leave message:]
Hi Sandra, this is [Name] from Handy & Friend, calling about your mirror and art hanging request. We can do this same week for $95 up to 5 pieces. Give us a call back at 213-361-1700 or just reply to our text. Thanks!
```

---

## LEAD 2: Unknown (Cabinet Painting)
- **Phone**: 310-663-5792
- **Service**: Cabinet Painting (from $75/door full package)
- **Source**: Website Chat (Alex captured phone)
- **When**: 2026-03-02 (7 days ago)
- **Note**: No name captured. Older lead but still worth trying.

### SMS (English)
```
Hi! This is Handy & Friend. You asked about cabinet painting last week on our site. Still interested? We do spray finish from $75/door, paint included. Happy to give you a quick quote — just tell us how many doors. (213) 361-1700
```

### SMS (Russian — in case they spoke Russian to Alex)
```
Привет! Это Handy & Friend. На прошлой неделе вы спрашивали о покраске кухонных фасадов. Всё ещё актуально? Делаем профессиональную покраску от $75/дверь, краска включена. Скажите сколько дверей и мы дадим точную цену. (213) 361-1700
```

### Call Script (English)
```
Hi, this is [Name] from Handy & Friend. I'm following up on a cabinet painting inquiry from last week. You chatted with us on our website. I wanted to check if you're still looking to get your cabinets painted.

We do professional spray finish — looks factory-new. Pricing starts at $75 per door, paint and primer included.

Would you like to tell me about your project? How many cabinet doors are we looking at?

[IF interested → get: number of doors, kitchen island?, timeline]
[IF not interested → thank them, offer to keep their info for future]
```

---

## FOLLOW-UP RULES

1. **Day 0 (today)**: Send SMS to both leads. Wait 2 hours. If no reply, call.
2. **Day 1**: If no answer, send second SMS: "Just checking in — still available this week for [service]. Let us know!"
3. **Day 3**: Final attempt. Call once more. If no answer, mark as `lost_reason: no_response` in pipeline.
4. **Never**: Call more than 3 times total. No more than 1 SMS per day.

## TRACKING
- Log all contact attempts in Supabase: `lead_events` with `event_type: manual_contact`
- Update lead `stage` as you go: `new → contacted → quoted → closed/lost`
