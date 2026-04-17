# CTA Truth Table — Handy & Friend
**Date:** 2026-04-17
**Task:** 3.3 per recovery plan v2
**Owner:** Agent B
**Goal:** Map every customer entry route. Any route that doesn't log to Supabase is a "black hole" — invisible lead loss.

---

## 1. Inventory — every CTA on the site

All HTML files in the repo root (excluding `.claude/worktrees/`).

### A. Phone (tel:) — 13 placements, 1 unique target `+12133611700`

| Page | Line | Location | `data-event` attr |
|---|---|---|---|
| index.html | 297 | Hero primary CTA | `click_call` |
| index.html | 308 | Urgency strip | — |
| index.html | 575 | Sticky bottom bar | `click_call` |
| index.html | 1032 | Mid-page CTA | `click_call` |
| index.html | 1141 | Mobile CTA block | — |
| index.html | 1229 | Final CTA section | `final_cta_call` |
| index.html | 1668 | Map / Area CTA | `map_call_cta` |
| book/index.html (footer) | — | — | — |
| tv-mounting/index.html | 209, 335, 381 | hero + cta-strip + footer | — |
| drywall/index.html | 70, 76, 117 | hero + cta-strip + footer | — |
| furniture-assembly/index.html | 179, 318, 364 | hero + cta-strip + footer | — |
| cabinet-painting/index.html | 261, 469, 505 | hero + cta-strip + footer | — |
| electrical/index.html | 69, 75, 104 | hero + cta-strip + footer | — |

**Total:** 13 tel: occurrences across 7 HTML files.

### B. WhatsApp — 10 placements

| Page | Line | Target | `data-event` |
|---|---|---|---|
| index.html | 296 | `wa.me/12133611700?text=Hi…` | `click_whatsapp` |
| index.html | 581 | Sticky bar | `data-track="whatsapp"` |
| index.html | 1033 | Mid-page | `click_whatsapp` |
| index.html | 1223 | Final CTA | `final_cta_whatsapp` |
| drywall/index.html | 118 | Footer | — |
| cabinet-painting/index.html | 507 | Footer | — |
| electrical/index.html | 105 | Footer | — |
| tv-mounting/index.html | 383 | Footer | — |
| furniture-assembly/index.html | 366 | Footer | — |

### C. Email (mailto:) — 5 placements

| Page | Target | `data-event` |
|---|---|---|
| index.html (sticky) | `hello@handyandfriend.com` | — |
| gallery/index.html | — | — |
| cabinet-painting/index.html | — | — |
| tv-mounting/index.html | — | — |
| furniture-assembly/index.html | — | — |

### D. Messenger (m.me via /messenger redirect) — 3 placements

| Page | `data-event` |
|---|---|
| index.html:1226 Final CTA | `final_cta_messenger` |
| index.html:1672 Map block | `map_messenger_cta` |
| footer links on service pages | — |

### E. Google Review redirect (/review → Google Write Review) — 3 placements

| Page | `data-event` |
|---|---|
| index.html:778 Header review CTA | `review_click_header` |
| index.html:1145 Post-submit success | `review_click_form_success` |
| (via /review rewrite in vercel.json) | — (server-side 301) |

### F. Facebook recommendation (/fb → Facebook page)

| Page | `data-event` |
|---|---|
| index.html:779 Header FB CTA | `review_fb_click_header` |
| index.html:1146 Post-submit success | `review_fb_click_form_success` |

### G. Forms → /api/submit-lead

| Page | Form ID | Target | Tracked? |
|---|---|---|---|
| index.html main lead form | — | `fetch('/api/submit-lead')` at line 1402 | `data-event=lead_submit` on submit button + Meta Pixel Lead event in shared.js |
| book/index.html | `sp-lead-form` | (shared handler) | — |

### H. Chat widget → /api/ai-chat

| Page | Handler | Tracked? |
|---|---|---|
| index.html:2052 | `fetch('/api/ai-chat')` | session stored in ai_conversations; lead created via createOrMergeLead |

### I. Photo upload → /api/upload-lead-photos

| Page | Handler |
|---|---|
| index.html:1539 | `fetch('/api/upload-lead-photos')` — uploads after lead create |

### J. Calculator SMS → /api/notify

| Page | Handler | Current state |
|---|---|---|
| assets/js/main.js:2229 | `fetch('/api/notify', {type:'sms', phone, estimate, …})` | **BROKEN** — returns HTTP 503 `notify_disabled` since Task 0.3-era hardening (Task 1.6 A/B/C decision pending) |

---

## 2. Truth Table — tracking coverage per CTA class

Columns:
- **GA4** = client-side gtag event fires? (via `data-event` attr or shared.js handler)
- **Ads** = Google Ads conversion attributes? (via shared.js enhanced_conversions)
- **Pixel** = Meta Pixel custom/standard event fires?
- **Supabase** = does an action get logged to Supabase on use?

| CTA class | GA4 event | Google Ads | Meta Pixel | Supabase row | Usage last 30d (real) |
|---|---|---|---|---|---|
| tel: click | ✅ `click_call` (inline `data-event` + shared.js delegated click) | ❌ — no conversion action tied | ✅ `phone_click` trackCustom (shared.js:80) | ❌ — no server log; browser dials directly | **UNKNOWN — not queryable** |
| WhatsApp click | ✅ `click_whatsapp` / `final_cta_whatsapp` | ❌ | ✅ `whatsapp_click` trackCustom (shared.js:85) | ❌ — leaves site to wa.me | **UNKNOWN — not queryable** |
| Email (mailto:) | ❌ (no `data-event`) | ❌ | ❌ | ❌ | **UNKNOWN — not queryable** |
| Messenger CTA | ✅ `final_cta_messenger` / `map_messenger_cta` | ❌ | ❌ | ✅ INDIRECT — reply triggers FB webhook → ai_conversations row (prefix `fb_`) | 6 messages / 30d (FB webhook) |
| Review link click | ✅ `review_click_header` / `review_click_form_success` | ❌ | ❌ | ❌ — /review 301 to Google Reviews, no server callback | **UNKNOWN** |
| Facebook link click | ✅ `review_fb_click_header` / `review_fb_click_form_success` | ❌ | ❌ | ❌ — /fb 307 to facebook.com | **UNKNOWN** |
| Lead form submit | ✅ `lead_submit` | ✅ conversion via enhanced_conversions in shared.js (user_data + form_submit event) | ✅ `Lead` event | ✅ row in `leads` + lead_events | **3 real leads 30d** (all source=website_chat via Alex — NOT via form) |
| Alex chat message | ✅ session captured; event emitted on capture | ✅ conversion on lead capture inside ai-chat.js | ✅ `Lead` on capture | ✅ `ai_conversations` + `leads` + (after Task 1.1) `telegram_sends` | **3 real leads; 234 messages (mostly audit probes)** |
| Photo upload | ❌ no direct event | ❌ | ❌ | ✅ `lead_photos` row | Bundled with lead; no standalone count |
| Calculator SMS | ❌ (broken) | ❌ | ❌ | ❌ (endpoint 503) | **0 — broken by notify hardening (Task 1.6 pending)** |

---

## 3. Black Holes — invisible lead loss

A "black hole" CTA fires an attribution event but never writes a durable record a reviewer can see.

### 3.1 Phone clicks (biggest category)
- 13 placements × ~every visitor who has the page open on mobile = likely highest-volume CTA.
- GA4 + Meta Pixel see the click. Supabase does NOT.
- **Result:** if a user taps and calls, lead attribution depends entirely on:
  - The phone rep asking "how did you find us?", and
  - That answer being written into `leads` manually (currently no UI for that).
- **Today's 19 real lifetime leads include 17 `backfill_jobs` — these were manually entered AFTER a call. Real "web→phone call→lead" attribution is 0.**

### 3.2 WhatsApp / Messenger / Review / Facebook redirects
- Same pattern: exit CTAs. No server-side confirmation that the action completed.
- `/messenger` and `/fb` are 307/302 redirects. Vercel logs the redirect hit. Nothing else.
- Review-click: `/review` 301 to Google. We never know if the user wrote a review unless we poll GBP API (not integrated).

### 3.3 Email mailto:
- Even GA4 doesn't know these clicks fire (no `data-event`).
- Pure black hole — uncounted, uncorrelated.

### 3.4 Calculator SMS
- /api/notify type=sms path returns 503 since Task 0.3 hardening. Any user clicking "Send SMS" on the calculator gets silently rejected. No lead. No log.
- Tracked in Open Risks pending Sergii decision A/B/C.

---

## 4. Recommended follow-ups (NOT this task's scope — for future tasks)

1. **Add a server-side redirect counter** for `/review`, `/fb`, `/messenger`. A single-row `outbound_click_events` insert inside `api/review-redirect.js` (already exists) and similar endpoints for /fb/messenger. Would capture "click to leave" intent into Supabase.
2. **Mirror GA4 events to Supabase** for `click_call`, `click_whatsapp`, `click_email` via a thin `/api/track-click` endpoint posted from the client after/alongside the gtag event. Would close the phone-call attribution gap.
3. **Instrument mailto: with `data-event`** so at least GA4 captures it.
4. **Answer Task 1.6** so the calculator SMS isn't a silent 503.

---

## 5. Real usage numbers (30-day window, 2026-03-17 → 2026-04-17)

From live Supabase query at the top of this task (cached below):

```
Real leads (is_test=false) by source, 30d:
  website_chat : 3  (all Alex captures)
  form_submit  : 0
  other        : 0

ai_conversations messages 30d:
  total : 234
    fb_messenger : 6
    test_probes  : 98 (reg-*, e2e-* session prefixes)
    other/audit  : 130 (audit_*, prod-audit-check, etc)
    website_chat : 0  (zero organic chat_* sessions)

outbound_jobs 30d:
  telegram_owner / sent   : 4  (4 actual Telegram alerts delivered)
  ga4_event       / failed : 12 (queue drain after ADR-0003)
```

**Translation:** 3 real leads in 30 days. Zero real website-chat sessions with chat_* prefix (all website_chat leads came via owner or audit probes, not organic widget users). Even the one measurable channel produced 0 organic usage.

The other 10+ CTA classes all fall into black-hole status — we have no way to count whether anyone ever clicked a phone number, WhatsApp, or email link on the production site.

---

## 6. Evidence links

- `ops/reports/2026-04-17-critical-audit/AUDIT.md` — prior audit establishing these facts.
- `scripts/inject_tracking.py` — GA4/Ads/Pixel injection script (coverage confirmed by Task 2.3 PR #16).
- `api/submit-lead.js` — single server endpoint with full Supabase + Telegram + GA4 chain.
- `api/ai-chat.js` — Alex capture pipeline; writes ai_conversations + leads + telegram_sends.
- `api/review-redirect.js` — /review 301 handler; does NOT log click.

## 7. Rollback

This file is pure documentation. Rollback: `git rm ops/reports/2026-04-17-cta-truth-table.md`.
