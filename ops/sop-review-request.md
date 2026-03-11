# SOP: Review Request After Completed Job

## Trigger
Every job with status=completed AND rating >= 4 (internal).

## Owner
Operator (you) — within 2 hours of job completion.

## Process

### Step 1: Same-Day SMS (within 2 hours of job done)
```
Hi [NAME]! This is Sergii from Handy & Friend. Thank you for choosing us for your [SERVICE] today! 🙏

If you were happy with the work, a quick Google review would mean the world to us — it really helps a small local business like ours.

Here's the link (takes 30 seconds):
https://g.page/r/CYiheFUF0JkQEB0/review

Thank you so much!
— Sergii, Handy & Friend
```

### Step 2: Follow-Up (Day 3, only if no review received)
```
Hi [NAME], just a quick follow-up — if you have a moment, we'd really appreciate a Google review about your [SERVICE] experience.

https://g.page/r/CYiheFUF0JkQEB0/review

No worries if you're busy — thanks again for your business!
```

### Step 3: Stop
- Max 2 messages total (initial + 1 follow-up)
- Never send a 3rd request
- Mark `review_requested_at` in CRM on first send
- Mark `review_received_flag` when review appears

## WhatsApp Variant (if customer used WhatsApp)
Same text as SMS. Send via WhatsApp instead.

## Email Variant (if customer provided email)
Subject: **Quick favor? 30-second Google review**
Body: Same as SMS text above, with HTML link button.

## Spanish Variant
```
¡Hola [NAME]! Soy Sergii de Handy & Friend. ¡Gracias por elegirnos para su [SERVICE]! 🙏

Si quedó satisfecho con el trabajo, una reseña rápida en Google nos ayudaría mucho — significa mucho para un negocio local como el nuestro.

Aquí está el enlace (toma 30 segundos):
https://g.page/r/CYiheFUF0JkQEB0/review

¡Muchas gracias!
— Sergii, Handy & Friend
```

## KPI
- Target: 1 review request per completed job
- Target response: 30%+ of requests result in review
- Weekly review count target: 2+ new reviews
- Monthly target: 8+ reviews

## Tracking
- `review_requested_at` — timestamp of first request sent
- `review_received_flag` — boolean, set when Google review appears
- Weekly audit: count(review_requested) vs count(review_received)

## Risks
- Over-requesting → annoys customer → max 2 messages
- Fake review suspicion → only request from REAL completed jobs
- Google link broken → test link monthly
- Low response → add review request card to physical job checklist

## Google Review Link
Production: `https://g.page/r/CYiheFUF0JkQEB0/review`
(Verify this link opens the Google review form for "Handy & Friend")
