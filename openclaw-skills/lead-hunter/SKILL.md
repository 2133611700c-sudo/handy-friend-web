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
POST each found lead to `https://handyandfriend.com/api/hunter-lead` with headers:
- `Content-Type: application/json`
- `x-hunter-secret: <HUNTER_API_SECRET env var>`

JSON body:
```json
{
  "platform": "<nextdoor|craigslist>",
  "post_url": "<full post URL>",
  "author_name": "<name if available>",
  "author_area": "<neighborhood/zip>",
  "post_text": "<first 300 chars of post>",
  "service_detected": "<service type>",
  "scope": "GREEN",
  "our_response": "",
  "template_used": 0,
  "comments_count": 0
}
```
- API returns `{"status":"ok"}` → lead recorded, Telegram alert fires automatically via outbox.
- API returns `{"status":"skip"}` → already recorded, skip.
- If API unreachable → append to `ops/leads.json` as local backup (same JSON format).

## Alert
Telegram alerts fire automatically via `/api/hunter-lead` outbox pipeline.
If urgency = today or this week — API marks priority=hot and sends URGENT Telegram alert.

## Rules
1. READ ONLY — never post, comment, or interact on platforms
2. Never create accounts
3. Never use Handy & Friend name on any platform
4. Just observe and report
