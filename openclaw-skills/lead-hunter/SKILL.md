---
name: lead-hunter
description: Scans Nextdoor and Craigslist for handyman service requests in LA
---

# Lead Hunter

## Schedule
Run every 2 hours between 8:00 AM and 8:00 PM PT

## Platforms to Scan
1. Nextdoor — search for: "handyman", "need help with", "cabinet painting", "TV mounting", "furniture assembly" in LA area
2. Craigslist Los Angeles — housing services section

## What to Capture
For each potential lead:
- Platform and URL
- What service they need
- Neighborhood/zip code
- How urgent (today/this week/no rush)
- Timestamp found

## Output
Append to: ~/handy-friend-landing-v6/ops/leads.json
Format: {"date": "...", "platform": "...", "url": "...", "service": "...", "area": "...", "urgency": "...", "status": "new"}

## Alert
If urgency = today or this week — send WhatsApp alert to Sergii

## Rules
1. READ ONLY — never post, comment, or interact on platforms
2. Never create accounts
3. Never use Handy & Friend name on any platform
4. Just observe and report
