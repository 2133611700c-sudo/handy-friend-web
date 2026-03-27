---
name: nextdoor-hunter
description: Scans Nextdoor for handyman service requests in LA, generates personalized responses, posts comments
---

# Nextdoor Lead Hunter

## Schedule
Run every 2 hours: 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm PT
Skip 12pm-1pm (lunch break)
Sunday: only 8am + 6pm scans

## Phase 1: Search

1. Open nextdoor.com (must be logged in via saved cookies)
2. Search using keyword sets (rotate — use 1-2 sets per scan):
   - Set A: "handyman", "need handyman", "referral"
   - Set B: "TV mounting", "furniture assembly"
   - Set C: "painter", "cabinet painting", "flooring"
   - Set D: "plumber", "electrician", "home repair"
   - Set E: "install", "fix my", "broken"
3. Filter by LA service area neighborhoods
4. Filter by date: only posts < 7 days old

## Phase 2: Filter Each Post

For each found post, check ALL conditions:
- Post is REQUESTING a service (not offering) → skip if offering
- Neighborhood is in our service area → skip if not
- Service is one we offer → skip if not (but log for future reference)
- We have NOT already responded (check ops/leads.json by URL) → skip if duplicate
- Post has < 30 comments → skip if too competitive (log as "observation")
- Assign priority:
  - HOT: posted < 24 hours ago AND < 10 comments
  - WARM: posted 1-3 days ago AND < 20 comments
  - COOL: posted 3-7 days ago AND < 30 comments

## Phase 3: Generate Response

For each filtered post (HOT first):

1. Identify service → look up price in price-registry.js
2. Identify author name and neighborhood
3. Select template (rotate, never repeat same template consecutively)
4. Personalize with: author name, specific service, neighborhood, price from registry
5. Verify: response < 80 words, no spam words, no ALL CAPS

### Response Templates (rotate 1-5)

**Template 1 — Friendly neighbor:**
"Hi [name]! I'm Sergii, your neighbor here in [area]. I do [service] professionally — would be happy to help! Feel free to text me at (213) 361-1700 for a free estimate. More info at handyandfriend.com"

**Template 2 — With price:**
"Hey [name]! I handle [service] — starts at [price]. Professional & insured, same-day response. Call or text (213) 361-1700 — Sergii"

**Template 3 — Social proof:**
"[name], I just finished a [service] project nearby! Check our work at handyandfriend.com. Happy to come take a look — (213) 361-1700"

**Template 4 — Short:**
"Hi! I can help with this. Text me for a free estimate — (213) 361-1700. Sergii, Handy & Friend"

**Template 5 — Specific:**
"[name], this is exactly what I do! [service] from [price], professional & insured. (213) 361-1700 or handyandfriend.com — Sergii"

## Phase 4: Post Comments

### Rules
- Start with HOT posts
- ONE comment per post — NEVER two
- Pause between comments: 3-5 minutes (randomized)
- Maximum per scan: 8 responses
- Maximum per day: 25 responses
- If CAPTCHA or block detected → STOP entire scan immediately
- Random variation: +/- 30% on all pause times
- Rotate templates — never use same template twice in a row

### Actions
1. Click Comment on the post
2. Paste prepared response text
3. Click Post/Submit
4. Wait for confirmation that comment appeared
5. Record in ops/leads.json: URL, time, template used, author info

## Phase 5: Alert via Telegram

After scan completes, send summary to Telegram (use telegram-alerts skill):

Format:
```
Lead Hunter Scan Complete
Time: [time] PT

Found: [N] posts
Responded: [N] posts
Skipped: [N] ([reasons])

HOT LEADS:
1. [name] — [area] — [service]
   Posted [time] ago, [N] comments
   Responded with template #[N]
   URL: [link]

Daily total: [N]/25 Nextdoor
Next scan: [time]
```

If HOT lead found (< 1 hour old, < 5 comments), send URGENT alert immediately:
```
HOT LEAD RIGHT NOW
[name] — [area] — [service]
Posted [X] min ago, only [Y] comments
Already responded. Call them NOW if they reply!
```

## Safety Rules

- Post ONLY as Sergii (personal Nextdoor account)
- Never post twice on same thread
- Never criticize competitors
- Never DM anyone first
- Never claim licensing beyond "minor work exemption"
- Never use: "guaranteed", "certified", "licensed contractor"
- Always use: "Professional & Insured"
- Phone ONLY: (213) 361-1700
- Website ONLY: handyandfriend.com
- If 3 CAPTCHAs in one day → stop for 24 hours + Telegram alert
- Random delays between ALL browser actions (1-3 seconds)
- Never scan same page twice consecutively

## Service → Price Mapping (from price-registry.js)

- Cabinet painting: from $75/door
- Interior painting: from $3.00/sq ft
- TV mounting: from $150
- Furniture assembly: from $150
- Flooring (LVP/laminate): from $3.00/sq ft
- Plumbing (faucet): from $150
- Electrical (light fixture): from $150
- Drywall repair: from $120
- Door installation: from $140
