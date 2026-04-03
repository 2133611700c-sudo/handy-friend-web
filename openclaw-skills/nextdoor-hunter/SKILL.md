---
name: nextdoor-hunter
description: Scans Nextdoor for handyman service requests in LA, generates personalized responses, posts comments
---

# Nextdoor Lead Hunter

## RESPONSE RULE

NO PRICES in comments. Never use `$` or exact numbers for service cost.
Use short conversion replies: "We can help" + website + phone.

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
Run EVERY HOUR: 7am through 9pm PT (15 scans/day)
Sunday: every 2 hours (8 scans/day)

## Phase 1: Search

1. Open nextdoor.com (must be logged in via saved cookies)
2. Search using keyword sets (rotate — use 2-3 sets per scan, cover all within 3 scans):
   - Set A: "handyman", "need handyman", "looking for handyman"
   - Set B: "TV mounting", "mount my TV", "hang TV"
   - Set C: "cabinet painting", "paint cabinets", "kitchen refresh"
   - Set D: "interior painting", "need painter", "paint my house"
   - Set E: "flooring", "install floor", "LVP", "laminate"
   - Set F: "furniture assembly", "IKEA", "assemble"
   - Set G: "plumber", "leaking", "faucet", "toilet"
   - Set H: "electrician", "outlet", "light fixture", "switch"
   - Set I: "drywall", "hole in wall", "patch wall"
   - Set J: "install", "fix my", "broken", "need someone to"
   - Set K: "home repair", "home improvement", "renovation"
3. Filter by LA service area neighborhoods
4. Filter by date: only posts < 7 days old

## Phase 2: Filter Each Post

For each found post, check ALL conditions:
- Post is REQUESTING a service (not offering) → skip if offering
- Neighborhood is in our service area → skip if not
- Service passes SCOPE FILTER (GREEN or YELLOW) → skip if RED
- We have NOT already responded (pre-check: POST to `/api/hunter-lead` with `post_url` — if `{"status":"skip"}` → duplicate) → skip if duplicate
- Author not already contacted in last 7 days (check author_name + author_area) → skip if repeat
- Post has < 30 comments → skip if too competitive (log as "observation")
- Assign priority:
  - HOT: posted < 24 hours ago AND < 10 comments
  - WARM: posted 1-3 days ago AND < 20 comments
  - COOL: posted 3-7 days ago AND < 30 comments

## Phase 3: Generate Response

For each filtered post (HOT first):

1. **Detect service using detectService(post_text)** → returns `service_id` (e.g., "tv_mounting") or null
2. Classify scope (GREEN or YELLOW) using SCOPE FILTER
3. Identify author name and neighborhood
4. **Select template:**
   - If `service_id` found → use service-specific template from `nextdoor-templates.js`
   - Else if YELLOW scope → use YELLOW template
   - Else (GREEN scope, no service detected) → rotate generic GREEN template (1-5)
5. Personalize with: author name, specific service, neighborhood
6. Verify: response < 140 chars (Nextdoor limit), no spam, no ALL CAPS

### SERVICE-SPECIFIC TEMPLATES (13 services)

All service-specific templates are imported from `nextdoor-templates.js`.
All templates must follow no-price policy and include:
- "we can help" phrasing
- website `handyandfriend.com`
- phone `(213) 361-1700`

### FALLBACK TEMPLATES (if service_id = null)

**Template 1 — Friendly neighbor:**
"Hi [name]! I'm Sergii, your local handyman in [area]. I do [service] professionally. Professional & insured, free estimate. (213) 361-1700"

**Template 2 — Competitive:**
"Hi [name]! We handle [service] with competitive rates, professional & insured. Free estimate — call (213) 361-1700"

**Template 3 — Social proof:**
"Hi [name]! I'm Sergii — just finished a similar project nearby. [service] is exactly what we do. Free estimate! (213) 361-1700"

**Template 4 — Short & direct:**
"Hi [name]! I can help with [service]. Professional work, free estimate. (213) 361-1700"

**Template 5 — Specific:**
"Hi [name]! This is exactly what I do. Let's discuss your [service] project. Free estimate — (213) 361-1700"

## PRE-POST GATE — Run before EVERY comment

Before posting ANY comment, check ALL 5 gates. If ANY fails → **DO NOT POST**, log error, send Telegram alert.

| Gate | Check | Fail action |
|------|-------|-------------|
| 1. Service detected OR fallback | `service_id != null` OR fallback explicitly chosen | Skip post, log |
| 2. No prices / no placeholders | Template does NOT contain "$", "competitive pricing", "{}", "undefined" | Skip post, log |
| 3. Phone present | Text contains "(213) 361-1700" | Skip post, log |
| 4. Char limit | `text.length <= 140` | Shorten or skip |
| 5. Dedup passed | API returned `status != "skip"` | Skip, no comment |

Only proceed to posting if all 5 pass.

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
5. POST to `https://handyandfriend.com/api/hunter-lead` with headers:
   - `Content-Type: application/json`
   - `x-hunter-secret: <HUNTER_API_SECRET env var>`
   ```json
   {
     "platform": "nextdoor",
     "post_url": "<full post URL>",
     "author_name": "<name>",
     "author_area": "<neighborhood>",
     "post_text": "<first 300 chars of post>",
     "service_detected": "<service_id from detectService()>",
     "scope": "GREEN|YELLOW",
     "our_response": "<text of our comment>",
     "template_used": "<service_id if service-specific, OR 1-5 if fallback>",
     "comments_count": <N>
   }
   ```
   API returns `{"status":"ok","post_id":"...","priority":"hot|warm|cool"}` — Telegram alert fires automatically.
   If API returns `{"status":"skip"}` → post was already recorded, no action needed.

## Phase 5: Summary Alert

After scan completes, send summary to Telegram (use telegram-alerts skill):

Format:
```
Lead Hunter Scan Complete
Time: [time] PT

Found: [N] posts
Responded: [N] posts
Skipped: [N] ([reasons])
Dedup skipped: [N]

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
- Never quote prices in comments; direct user to website for quote details
- Always use: "Professional & Insured"
- Phone ONLY: (213) 361-1700
- Website ONLY: handyandfriend.com
- If 3 CAPTCHAs in one day → stop for 24 hours + Telegram alert
- Random delays between ALL browser actions (1-3 seconds)
- Never scan same page twice consecutively
