---
name: facebook-hunter
description: Scans Facebook groups for handyman service requests in LA, generates personalized responses, posts comments
---

# Facebook Group Lead Hunter

## Schedule
Run every 3 hours: 9am, 12pm, 3pm, 6pm, 9pm PT
Sunday: only 9am + 6pm scans

## Phase 1: Search

1. Open Facebook groups (list below), sorted by Recent Posts
2. Search each group using keyword sets (rotate):
   - Set A: "handyman", "need handyman", "recommendation"
   - Set B: "TV mounting", "furniture assembly", "install"
   - Set C: "painter", "cabinet painting", "flooring"
   - Set D: "plumber", "electrician", "home repair"
   - Set E: "fix", "broken", "need help with"
3. Filter by date: only posts < 7 days old

### Facebook Groups to Monitor
1. LA Home Improvement & Repair
2. Los Angeles Home Owners
3. Hollywood Neighbors
4. WeHo Community
5. Santa Monica Community
6. Beverly Hills Residents

New group discovery: once per week search "handyman los angeles" in Facebook Groups. Join max 3 new groups per week from Handy & Friend page.

## Phase 2: Filter Each Post

Same rules as nextdoor-hunter:
- Post is REQUESTING a service (not offering) → skip if offering
- Location is in LA area → skip if not
- Service is one we offer → skip if not (log for future)
- We have NOT already responded (check ops/leads.json by URL) → skip if duplicate
- Post has < 30 comments → skip if too competitive
- Priority assignment:
  - HOT: posted < 24 hours, < 10 comments
  - WARM: posted 1-3 days, < 20 comments
  - COOL: posted 3-7 days, < 30 comments

## Phase 3: Generate Response

### Facebook Templates (slightly more professional than Nextdoor)

**Template 1 — Professional:**
"Hi [name]! Handy & Friend here — we do [service] across LA. Professional, insured, transparent pricing. (213) 361-1700 or handyandfriend.com for a free estimate!"

**Template 2 — With price + portfolio:**
"[name], we can definitely help with this! [service] starts at [price]. Check our before/after photos at handyandfriend.com. Call/text (213) 361-1700 — Sergii"

**Template 3 — Local + friendly:**
"Hey [name]! Local LA handyman here. [service] is one of our specialties. Free estimates, same-day response. (213) 361-1700"

Rules: personalize with name, service, price from price-registry.js. Response < 80 words.

## Phase 4: Post Comments

### Rules (STRICTER than Nextdoor — Facebook has stronger moderation)
- Respond from Handy & Friend PAGE (not personal profile)
- ONE comment per post — NEVER two
- Pause between comments: 5-8 minutes (randomized)
- Maximum per scan: 5 responses
- Maximum per day: 15 responses
- If blocked or warning → STOP for 24 hours + Telegram alert
- Random variation: +/- 30% on all pause times
- Rotate templates

### Actions
1. Click Comment on the post
2. Paste prepared response text
3. Click Post
4. Verify comment appeared
5. Record in ops/leads.json

## Phase 5: Alert via Telegram

Same format as nextdoor-hunter. Send summary after each scan.
Send URGENT alert for HOT leads (< 1 hour, < 5 comments).

## Safety Rules

- Post ONLY from Handy & Friend Facebook Page
- Never post from personal profile
- Never post twice on same thread
- Never criticize competitors
- Never DM anyone first
- Never claim licensing beyond "minor work exemption"
- Never use: "guaranteed", "certified", "licensed contractor"
- Always use: "Professional & Insured"
- Phone ONLY: (213) 361-1700
- Website ONLY: handyandfriend.com
- If any warning/restriction from Facebook → stop FB scanning for 48 hours
- Nextdoor scanning continues independently
