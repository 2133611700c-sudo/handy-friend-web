---
name: nextdoor-hunter
description: Scans Nextdoor for handyman service requests in LA, generates personalized responses, posts comments
---

# Nextdoor Lead Hunter

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

1. Read `ops/leads.json` before posting
2. Check if `post_url` already exists in leads.json
3. If YES → SKIP (do not respond)
4. If NO → proceed with response
5. After posting → immediately write entry to `ops/leads.json`
6. Check `author_name` + `author_area` for repeat posters (avoid responding to same person twice within 7 days)

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
- Service passes SCOPE FILTER (GREEN or YELLOW) → skip if RED
- We have NOT already responded (check ops/leads.json by URL) → skip if duplicate
- Author not already contacted in last 7 days (check author_name + author_area) → skip if repeat
- Post has < 30 comments → skip if too competitive (log as "observation")
- Assign priority:
  - HOT: posted < 24 hours ago AND < 10 comments
  - WARM: posted 1-3 days ago AND < 20 comments
  - COOL: posted 3-7 days ago AND < 30 comments

## Phase 3: Generate Response

For each filtered post (HOT first):

1. Identify service → classify as GREEN or YELLOW
2. Identify author name and neighborhood
3. Select template (rotate, never repeat same template consecutively)
4. If YELLOW service → use YELLOW template instead
5. Personalize with: author name, specific service, neighborhood
6. Verify: response < 80 words, no spam words, no ALL CAPS, NO DOLLAR AMOUNTS

### Response Templates (rotate 1-5)

**Template 1 — Friendly neighbor:**
"Hi [name]! I'm Sergii, your neighbor here in [area]. I do [service] professionally — happy to come take a look and give you a free estimate. Call or text (213) 361-1700. More info at handyandfriend.com"

**Template 2 — Competitive:**
"Hey [name]! We handle [service] — competitive rates, professional & insured. Free estimates, same-day response. Call or text (213) 361-1700 — Sergii"

**Template 3 — Social proof:**
"[name], I just finished a similar project nearby! Check our before/after photos at handyandfriend.com. Happy to give you a free estimate — (213) 361-1700"

**Template 4 — Short:**
"Hi! I can help with this. Free estimate — just call or text (213) 361-1700. Sergii, Handy & Friend"

**Template 5 — Specific:**
"[name], this is exactly what I do! Professional & insured, free estimates. (213) 361-1700 or handyandfriend.com — Sergii"

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
5. Record in ops/leads.json: URL, time, template used, author info, service, scope (GREEN/YELLOW)

## Phase 5: Alert via Telegram

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
- Never quote exact dollar amounts in comments
- Always use: "Professional & Insured"
- Phone ONLY: (213) 361-1700
- Website ONLY: handyandfriend.com
- If 3 CAPTCHAs in one day → stop for 24 hours + Telegram alert
- Random delays between ALL browser actions (1-3 seconds)
- Never scan same page twice consecutively
