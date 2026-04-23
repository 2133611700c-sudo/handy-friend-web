# Dark Channels SOP — Manual-Only Inbound

**Last updated:** 2026-04-22  
**Audience:** Owner (Sergii)  
**Frequency:** Check each channel ≥3×/week (Mon/Wed/Fri minimum)

A "dark channel" is any inbound path where no automation captures the lead.
Missing a message here = missing revenue. There is no system safety net.

---

## Channel 1: Nextdoor Business Inbox

**URL:** https://nextdoor.com/page/handy-friend/  
**Profile ID:** 176256543  
**What arrives:** Direct messages from neighbors who see Nextdoor posts or the business page.

### Check Procedure

1. Open https://nextdoor.com/page/handy-friend/ → click **Messages**
2. Read all unread threads
3. For any service inquiry:
   - Reply within 24h (same-day preferred for HOT intents)
   - Collect: name, phone number, service needed, zip/neighborhood
   - Create lead in Supabase manually (see §Lead Creation below)
   - PATCH social_leads status to `contacted` if a corresponding scanner signal exists

### Response Template

```
Hi [Name]! Thanks for reaching out. I'm Sergii, owner of Handy & Friend — 
local handyman serving LA. Happy to help with [service].

What's your phone number so I can call/text you with a quick quote? 
Usually I can give you a price in 2 minutes.
```

### Notes

- Nextdoor scanner scrapes GROUP POSTS, NOT the business inbox. They are separate.
- Scanner staleness (last post > 7 days) does NOT mean inbox is empty.
- Nextdoor Business inbox has no API → permanent manual-only channel.

---

## Channel 2: Meta (Facebook) Page Inbox

**URL:** https://www.facebook.com/profile.php?id=61588215297678  
**Page ID:** 1039840475873352  
**What arrives:**
  - Messages sent to the Page directly (outside of the automated Messenger flow)
  - Messages where the user navigated directly to the Facebook page instead of clicking "Send Message" on an ad
  - Messages that failed to route through `api/alex-webhook.js` (rare)

### Check Procedure

1. Open https://www.facebook.com → Business Suite or Inbox
2. Filter: **Unanswered** / **Unread**
3. For any service inquiry not already showing in Telegram alerts:
   - Reply immediately (response time visible to potential customers on the page)
   - Collect: name, phone, service, zip
   - Create lead in Supabase manually
   - Note: if conversation shows ≥3 turns with no phone and you DON'T see a `PRE_LEAD_REVIEW` alert in Telegram → webhook may have failed; escalate to `ops_incidents`

### Response Template

```
Hi [Name]! I'm Sergii from Handy & Friend. Thanks for your message!
Could you share your phone number so I can call/text you a quick quote?
Usually takes 2 minutes. Serving LA area — fast availability.
```

### Notes

- The automated Alex AI handles messages that come via the standard Messenger flow (Facebook ad → "Send Message" → webhook). Those DO appear in Telegram as alerts.
- This manual check is for the gap: users who message the page directly via facebook.com, or whose messages weren't captured by the webhook.
- `subscribed_apps` check shows a permission error (needs `pages_manage_metadata`) — this is a diagnostic limitation only, does NOT affect message delivery or webhook routing.

---

## Channel 3: Craigslist — CONFIRMED NON-EXISTENT AS DARK CHANNEL

**Status:** No relay email path exists.  
- 90-day Gmail audit (2026-04): 0 emails from `@hb.craigslist.org` or `@la.craigslist.org`
- Craigslist contact-form replies from potential customers go to the poster's email (if ad is live)
- Our Craigslist strategy is scanner-only: we scrape OTHER PEOPLE's CL posts to find service needs
- We do NOT post on Craigslist ourselves currently

**Action:** None. CL is covered only via the scanner. Monitor scanner staleness via watchdog.

---

## Manual Lead Creation in Supabase

When you collect a lead from a dark channel:

```
Supabase → Table Editor → leads → Insert row

Required fields:
  full_name:    "<First Last>"
  phone:        "<10-digit US phone>"  
  source:       "nextdoor" | "facebook" | "referral" | "direct"
  service_type: "tv_mounting" | "cabinet_painting" | "furniture_assembly" | 
                "interior_painting" | "flooring" | "drywall" | "plumbing" | 
                "electrical" | "other"
  status:       "new"
  stage:        "new"
  is_test:      false
  
Optional but useful:
  notes:        "<where they found us, what they said>"
  zip_code:     "<zip>"
```

After creating: the row will appear in watchdog/digest reports automatically.

---

## Weekly Dark Channel Log

Keep a brief log in Telegram (send to yourself) after each check:

```
Dark channels [DATE]:
ND: [X] unread, [Y] replied, [Z] leads created
FB inbox: [X] unread, [Y] replied, [Z] leads created
```
