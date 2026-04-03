---
name: facebook-hunter-safe
description: Scans Facebook groups for handyman service requests in LA, generates personalized responses WITHOUT PRICES, posts comments
---

# Facebook Group Lead Hunter (SAFE VERSION - NO PRICES)

## PRICING RULE — CRITICAL

**NEVER quote an exact dollar amount in comments.** Say "free estimate", "affordable rates", "competitive pricing", or "call for a quick quote". Exact pricing happens only on the phone or in person after seeing the job.

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
Run EVERY HOUR: 8am through 8pm PT (12 scans/day)
Sunday: every 2 hours (6 scans/day)

## Phase 1: Search

1. Open Facebook groups (list below), sorted by Recent Posts
2. Search each group using keyword sets (rotate):
   - Set A: "handyman", "need handyman", "recommendation"
   - Set B: "TV mounting", "furniture assembly", "install"
   - Set C: "painter", "cabinet painting", "flooring"
   - Set D: "plumber", "electrician", "home repair"
   - Set E: "fix", "broken", "need help with"
3. Filter by date: only posts < 7 days old

### Facebook Groups to Monitor (Priority Order)

1. **HANDYMAN SERVICES NEEDED** (Los Angeles) — Primary target
2. **Contractors and Referrals in LA** — High engagement
3. **Contractors & Home Improvement Referrals** — Active
4. **Los Angeles Handyman Services** — Direct match
5. **LA Home Improvement & Contractors** — Secondary
6. **Los Angeles Contractors Network** — Backup

## Phase 2: Filter Each Post

For each found post, check ALL conditions:
- Post is REQUESTING a service (not offering) → skip if offering
- Service passes SCOPE FILTER (GREEN or YELLOW) → skip if RED
- We have NOT already responded (pre-check: POST to `/api/hunter-lead` with `post_url` — if `{"status":"skip"}` → duplicate) → skip if duplicate
- Author not already contacted in last 7 days (check author_name + author_area) → skip if repeat
- Post has < 30 comments → skip if too competitive (log as "observation")
- Assign priority:
  - HOT: posted < 24 hours ago AND < 10 comments
  - WARM: posted 1-3 days ago AND < 20 comments
  - COOL: posted 3-7 days ago AND < 30 comments

## Phase 3: Generate Response (SAFE - NO PRICES)

For each filtered post (HOT first):

1. Identify service → classify as GREEN or YELLOW
2. Identify author name and location
3. If YELLOW service → use YELLOW template
4. If GREEN service → use safe template from `safe-templates.js`
5. Personalize with: author name, specific service, location
6. Verify: response < 80 words, no spam words, no ALL CAPS, **NO DOLLAR AMOUNTS**

### Safe Response Templates (use from safe-templates.js)

**Cabinet Painting:**
"Hi! Cabinet painting is our specialty. Professional spray finish with premium paint included. Free estimate: (213) 361-1700"

**TV Mounting:**
"Hi! TV mounting is what we do daily. Professional & insured, clean installation. Free estimate: (213) 361-1700"

**Furniture Assembly:**
"Hi! We assemble furniture regularly - IKEA, Wayfair, all brands. Professional & insured. Free estimate: (213) 361-1700"

**Interior Painting:**
"Hi! We paint interiors with professional finish. Walls, ceilings, trim - we do it all. Free estimate: (213) 361-1700"

**Flooring:**
"Hi! We install laminate/LVP flooring with professional finish. Quick turnaround. Free estimate: (213) 361-1700"

**Plumbing:**
"Hi! We handle minor plumbing - faucets, toilets, shower heads. Professional & insured. Free estimate: (213) 361-1700"

**Electrical:**
"Hi! We do like-for-like electrical work - lights, outlets, switches. Professional & insured. Free estimate: (213) 361-1700"

**Drywall:**
"Hi! We patch drywall holes and repair damage. Professional finish. Free estimate: (213) 361-1700"

**Art/Mirror Hanging:**
"Hi! We hang art, mirrors, shelves with precision. Professional & insured. Free estimate: (213) 361-1700"

**Generic (when service not detected):**
"Hi! We can help with that. Professional & insured handyman service. Free estimate: (213) 361-1700"

## Phase 4: Post Comments

### Rules
- Start with HOT posts
- ONE comment per post — NEVER two
- Pause between comments: 5-8 minutes (randomized)
- Maximum per scan: 5 responses
- Maximum per day: 15 responses
- If CAPTCHA or block detected → STOP entire scan immediately
- Random variation: +/- 30% on all pause times
- Rotate templates — never use same template twice in a row
- **Post ONLY from Handy & Friend Page** — NEVER from personal profile

### Actions
1. Click Comment on the post
2. Paste prepared response text
3. Click Post/Submit
4. Wait for confirmation that comment appeared
5. POST to `https://handyandfriend.com/api/hunter-lead` with headers:
   - `Content-Type: application/json`
   - `x-hunter-secret: <HUNTER_API_SECRET env var>`
   ```json
   {
     "platform": "facebook",
     "post_url": "<full post URL>",
     "author_name": "<name>",
     "author_area": "<location>",
     "post_text": "<first 300 chars of post>",
     "service_detected": "<service type>",
     "scope": "GREEN",
     "our_response": "<text of our comment>",
     "template_used": "safe_template",
     "comments_count": <N>
   }
   ```
   API returns `{"status":"ok","post_id":"...","priority":"hot|warm|cool"}` — Telegram alert fires automatically.
   If API returns `{"status":"skip"}` → post was already recorded, no action needed.

## Phase 5: Summary Alert

After scan completes, send summary to Telegram (use telegram-alerts skill):

Format:
```
Facebook Hunter Scan Complete (Safe Version)
Time: [time] PT

Groups scanned: [N]
Found: [N] posts
Responded: [N] posts
Skipped: [N] ([reasons])
Dedup skipped: [N]

HOT LEADS:
1. [name] — [group] — [service]
   Posted [time] ago, [N] comments
   Responded with safe template
   URL: [link]

Daily total: [N]/15 Facebook
Next scan: [time]
```

If HOT lead found (< 1 hour old, < 5 comments), send URGENT alert immediately:
```
HOT LEAD ON FACEBOOK
[name] — [group] — [service]
Posted [X] min ago, only [Y] comments
Already responded. Call them NOW if they reply!
```

## Safety Rules

- Post ONLY from Handy & Friend Facebook Page
- Never post twice on same thread
- Never criticize competitors
- Never DM anyone first
- Never claim licensing beyond "minor work exemption"
- **NEVER use: "guaranteed", "certified", "licensed contractor"**
- **NEVER quote exact dollar amounts in comments**
- **ALWAYS use: "Professional & Insured"**
- Phone ONLY: (213) 361-1700
- Website ONLY: handyandfriend.com
- If 3 CAPTCHAs in one day → stop for 24 hours + Telegram alert
- Random delays between ALL browser actions (1-3 seconds)
- Never scan same group twice consecutively
