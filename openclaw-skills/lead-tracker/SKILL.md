---
name: lead-tracker
description: Checks responses posted 24h ago for engagement (likes, replies), updates lead status
---

# Lead Tracker — 24h Follow-Up

## Schedule
Run daily at 10:00 AM PT

## Process

For each lead in ops/leads.json where:
- status = "responded"
- response_time is 24-48 hours ago

### Steps
1. Open post URL from leads.json
2. Find our comment on the post
3. Check engagement:
   - Our comment received likes? → count them
   - Someone replied to our comment? → capture reply text
   - Post author replied to us? → capture text
   - Post author marked our comment as "helpful"?
4. Update leads.json entry:
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
- Update leads.json after each check
- Log all activity to ops/hunter.log
