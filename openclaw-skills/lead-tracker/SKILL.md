---
name: lead-tracker
description: Checks responses posted 24h ago for engagement (likes, replies), updates lead status
---

# Lead Tracker — 24h Follow-Up

## Schedule
Run daily at 10:00 AM PT

## Process

Query hunter posts from API: `GET https://handyandfriend.com/api/hunter-lead?status=responded&age=24h-48h` with header `x-hunter-secret: <HUNTER_API_SECRET env var>`
If API is unavailable, fall back to reading `ops/leads.json` where status = "responded" and response_time is 24-48 hours ago.

### Steps
1. Open post URL from the query results
2. Find our comment on the post
3. Check engagement:
   - Our comment received likes? → count them
   - Someone replied to our comment? → capture reply text
   - Post author replied to us? → capture text
   - Post author marked our comment as "helpful"?
4. Update lead status via API: `PATCH https://handyandfriend.com/api/hunter-lead` with header `x-hunter-secret: <HUNTER_API_SECRET env var>` and body `{"post_url":"...","status":"warm|hot|cold|converted","engagement":{"likes":N,"replies":[...]}}`
   If API unavailable, update `ops/leads.json` entry as fallback:
   - likes > 0 → status: "warm"
   - reply from post author → status: "hot"
   - phone call received (manual flag) → status: "converted"
   - no engagement after 48h → status: "cold"
5. Update likes_on_our_comment and replies_to_our_comment fields

## Telegram Alerts

If engagement found, send alert:
```
Lead Update: [name] [action] your comment!
Platform: [Nextdoor/Facebook]
Service: [service]
Area: [area]
Original post: [URL]
Consider calling them?
```

If post author replied directly:
```
HOT: [name] replied to you!
Their message: "[reply text]"
Post: [URL]
CALL THEM NOW: check if they called (213) 361-1700
```

## Rules
- Read-only on platforms — never post additional comments during tracking
- Only check posts 24-48h old (not older)
- Update lead status via API (fall back to ops/leads.json if API unavailable)
- Log all activity to ops/hunter.log
