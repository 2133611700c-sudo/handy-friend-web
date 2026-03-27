---
name: facebook-hunter
description: Scans Facebook groups for handyman service requests in LA, generates personalized responses, posts comments
---

# Facebook Group Lead Hunter

## PRICING RULE — CRITICAL

NEVER quote an exact dollar amount in comments. Say "free estimate", "affordable rates", "competitive pricing", or "call for a quick quote". Exact pricing happens only on the phone or in person after seeing the job.

## SCOPE FILTER

Before responding, classify the requested service:

### GREEN — Always respond
Handyman, general home repair, TV mounting, shelf mounting, mirror/art hanging, Furniture assembly, Cabinet painting, kitchen painting, Interior wall painting, Flooring (laminate, LVP, vinyl plank), Minor plumbing, Minor electrical, Door/lock repair, Drywall patch/repair, Caulking, weatherstripping, Pressure washing

### YELLOW — Respond with caveat
Landscape lighting, Tile work, Fence repair, Deck repair, Appliance installation, Exterior painting, Bathroom remodel (minor only)

YELLOW template: "Hi [name]! That might be something I can help with — depends on the scope. Mind if I take a quick look? No charge for the estimate. (213) 361-1700 — Sergii"

### RED — DO NOT respond
Roofing, HVAC, Full kitchen remodel, Full bathroom remodel, Structural work, Pool maintenance, Tree removal, Pest control, Landscaping/gardening, Garage door springs, Solar panels, Window replacement, Foundation work, Any job requiring permits

If RED → skip post entirely. Do NOT comment.

## DEDUP RULES

1. Dedup is handled server-side by `/api/hunter-lead` — if `post_url` was already submitted, API returns `{"status":"skip","reason":"already_responded"}` → do NOT comment
2. After posting a comment → immediately POST to `/api/hunter-lead` (see Phase 4)
3. Check `author_name` + `author_area` for repeat posters (avoid responding to same person twice within 7 days) — local check only, no file needed

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

For each found post, check ALL conditions:
- Post is REQUESTING a service (not offering) → skip if offering
- Location is in LA area → skip if not
- Service passes SCOPE FILTER (GREEN or YELLOW) → skip if RED
- We have NOT already responded (pre-check: POST to `/api/hunter-lead` with `post_url` — if `{"status":"skip"}` → duplicate) → skip if duplicate
- Author not already contacted in last 7 days (check author_name + author_area) → skip if repeat
- Post has < 30 comments → skip if too competitive
- Priority assignment:
  - HOT: posted < 24 hours, < 10 comments
  - WARM: posted 1-3 days, < 20 comments
  - COOL: posted 3-7 days, < 30 comments

## Phase 3: Generate Response

### Facebook Templates (rotate 1-3)

**Template 1 — Professional:**
"Hi [name]! Handy & Friend here — we do [service] across LA. Professional, insured, free estimates. (213) 361-1700 or handyandfriend.com"

**Template 2 — Portfolio:**
"[name], we can definitely help! Check our work at handyandfriend.com. Free estimate — call/text (213) 361-1700 — Sergii"

**Template 3 — Local + friendly:**
"Hey [name]! Local LA handyman here. [service] is one of our specialties. Free estimates, same-day response. (213) 361-1700"

Rules:
- Personalize with name, service. NO PRICES.
- If YELLOW service → use YELLOW template instead
- Response < 80 words
- No spam words, no ALL CAPS, no dollar amounts

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
5. POST to `https://handyandfriend.com/api/hunter-lead` with JSON body:
   ```json
   {
     "platform": "facebook",
     "post_url": "<full post URL>",
     "author_name": "<name>",
     "author_area": "<city/area from profile or post>",
     "post_text": "<first 300 chars of post>",
     "service_detected": "<service type>",
     "scope": "GREEN",
     "our_response": "<text of our comment>",
     "template_used": <1-3>,
     "comments_count": <N>
   }
   ```
   API returns `{"status":"ok","post_id":"...","priority":"hot|warm|cool"}` — Telegram alert fires automatically.
   If API returns `{"status":"skip"}` → post was already recorded, no action needed.

## Phase 5: Alert via Telegram

Same format as nextdoor-hunter. Send summary after each scan.
Include dedup skip count in summary.
Send URGENT alert for HOT leads (< 1 hour, < 5 comments).

## Safety Rules

- Post ONLY from Handy & Friend Facebook Page
- Never post from personal profile
- Never post twice on same thread
- Never criticize competitors
- Never DM anyone first
- Never claim licensing beyond "minor work exemption"
- Never use: "guaranteed", "certified", "licensed contractor"
- Never quote exact dollar amounts in comments
- Always use: "Professional & Insured"
- Phone ONLY: (213) 361-1700
- Website ONLY: handyandfriend.com
- If any warning/restriction from Facebook → stop FB scanning for 48 hours
- Nextdoor scanning continues independently
