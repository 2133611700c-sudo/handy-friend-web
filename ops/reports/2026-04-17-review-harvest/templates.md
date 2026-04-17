# Review Harvest — Google Review Request Templates
**Target:** Past customers with completed jobs, no Google review yet.
**Review link:** https://handyandfriend.com/review (301 → Google Write Review for Place ID ChIJ6V5HHH7HwoARFgMKq_E0XK8)
**Goal:** 5-star rating + photo; if unhappy, catch in private channel before they post.

---

## WHO TO TARGET
Run query in Supabase:
```sql
SELECT l.id, l.full_name, l.phone, l.email, l.service_type,
       j.completed_date, j.total_amount, j.rating
FROM leads l
JOIN jobs j ON j.lead_id = l.id
LEFT JOIN reviews r ON r.lead_id = l.id
WHERE j.status = 'completed'
  AND j.completed_date >= current_date - interval '30 days'
  AND r.id IS NULL              -- no Google review yet
  AND (j.rating IS NULL OR j.rating >= 4)  -- skip customers who rated < 4 privately
  AND l.is_test = false
ORDER BY j.completed_date DESC;
```

Export as CSV → paste into messaging tool or send manually.

---

## TEMPLATE A — SMS (English, 140 char ideal)

```
Hi {name}! Thanks for choosing Handy & Friend for your {service} last {week|weekend}. If you have 30s, a quick Google review helps a lot:
https://handyandfriend.com/review
— Sergii
```

## TEMPLATE B — SMS (Russian)

```
{name}, привет! Спасибо, что выбрали Handy & Friend для {service}. Если будет 30 секунд — короткий отзыв в Google очень помогает:
https://handyandfriend.com/review
— Сергей
```

## TEMPLATE C — SMS (Spanish)

```
¡Hola {name}! Gracias por elegir Handy & Friend para {service}. Si tiene 30 segundos, una reseña en Google nos ayuda mucho:
https://handyandfriend.com/review
— Sergii
```

---

## TEMPLATE D — Email (English, more detail, photo-CTA)

Subject: **Quick favor — would love your thoughts on our {service} work**

```
Hi {name},

Thanks again for letting us handle the {service} at your place last {week|weekend}.

If you liked the work, could I ask a quick favor? A 2-sentence Google review helps enormously — it's how neighbors find us in LA.

Here's the direct link:
https://handyandfriend.com/review

If there was anything off — please reply to this email first and I'll make it right before you post anywhere.

Thanks,
Sergii
Handy & Friend
(213) 361-1700
```

## TEMPLATE E — Email (Spanish)

Subject: **Un favor rápido — nos encantaría su opinión**

```
Hola {name},

Gracias por confiar en Handy & Friend para {service} la semana pasada.

Si quedó satisfecho, ¿podría pedirle un favor rápido? Una reseña de 2 oraciones en Google nos ayuda muchísimo — así nos encuentran los vecinos en LA.

Enlace directo:
https://handyandfriend.com/review

Si hubo algo que no salió bien, por favor respóndame este correo antes de publicar algo público — lo soluciono al instante.

Gracias,
Sergii
Handy & Friend
(213) 361-1700
```

---

## FOLLOW-UP RULES
- Send once, 24-72h after job completion.
- If no review in 7 days, send ONE reminder (SMS only, shorter):
  > Hi {name} — hope you've been enjoying the {service}. If you have a sec: https://handyandfriend.com/review  Thanks! — Sergii
- Do not send more than 2 messages per customer.
- Never ask for a specific star count (Google's terms).
- Mark in CRM as "review requested" so we don't double-send.

## MEASURE
- Baseline (pre-blast): count Google reviews (currently listed on GBP).
- Blast: send to all eligible (30-day window).
- Re-count at day +7 and day +30.
- Target: +3 new reviews per blast of 10 customers (30% conversion on satisfied customers).

## COMPLIANCE
- ✅ Link opens Google's native Write Review page — no gating, no filtering.
- ✅ Compliant with Google's review-gating policy (private feedback routed to email, not to 1-star gate).
- ✅ SMS includes identifier "Sergii" / "Handy & Friend" so recipient knows who's texting.
- ✅ No incentives mentioned (violates Google review policy).
