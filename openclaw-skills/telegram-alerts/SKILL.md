---
name: telegram-alerts
description: Sends lead hunter alerts, daily reports, and weekly summaries to Telegram
---

# Telegram Alerts for Lead Hunter

## Configuration
- Bot token: stored in environment variable TELEGRAM_BOT_TOKEN
- Chat ID: stored in environment variable TELEGRAM_CHAT_ID
- API: https://api.telegram.org/bot{TOKEN}/sendMessage

Note: Handy & Friend already has TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID configured in the Vercel environment. Use the same values for OpenClaw.

## Alert Types

### 1. Scan Summary (after each scan)
```
Lead Hunter Scan Complete
Time: [time] PT
Platform: [Nextdoor/Facebook]

Found: [N] posts
Responded: [N] posts
Skipped: [N] ([reasons])

HOT LEADS:
1. [name] — [area] — [service]
   Posted [time] ago, [N] comments
   Responded with template #[N]

Daily total: [ND]/25 Nextdoor, [FB]/15 Facebook
DeepSeek cost: $[amount]
Next scan: [time]
```

### 2. HOT Lead Alert (immediate, separate message)
Trigger: lead posted < 1 hour ago AND < 5 comments
```
HOT LEAD RIGHT NOW
[name] — [area] — [service]
Posted [X] min ago, only [Y] comments
Already responded. Call them NOW if they reply!
URL: [link]
```

### 3. Engagement Alert (from lead-tracker)
```
Lead Update: [name] [liked/replied to] your comment!
Platform: [platform]
Service: [service]
Post: [URL]
Consider calling them?
```

### 4. Daily Report (8:05 AM PT)
```
Daily Lead Hunter Report — [date]

Yesterday:
- Scans completed: [N]/[total]
- Posts found: [N]
- Responses posted: [N]
  - Nextdoor: [N]
  - Facebook: [N]
- Hot leads (replied): [N]
- Warm leads (liked): [N]
- Phone calls: [N]

Top lead:
[name] — [area] — [service]
[status details]

DeepSeek cost: $[amount]
System health: [status]
```

### 5. Weekly Report (Sunday 8:00 PM PT)
```
Weekly Lead Hunter Report — Week of [date]

Total scans: [N]
Posts found: [N]
Responses: [N] (ND: [N], FB: [N])
Engagement rate: [N]%
Hot leads: [N]
Converted to calls: [N]
Converted to jobs: [N]

Best template: #[N] ([N]% engagement)
Best platform: [platform]
Best time: [time range]
Best service: [service]

Cost: $[amount]
```

### 6. Error Alert (immediate)
Trigger: CAPTCHA, block, crash, or any system error
```
ALERT: Lead Hunter Error
Type: [CAPTCHA/BLOCK/CRASH]
Platform: [platform]
Action taken: [paused for X hours]
Manual check needed: [yes/no]
```

### 7. Low Balance Alert
Trigger: DeepSeek balance < competitive pricing
```
WARNING: DeepSeek balance low
Current: $[amount]
Estimated days remaining: [N]
Top up at deepseek.com
```

## Bot Commands (if user sends message to bot)
- /status — current system status
- /leads — last 5 leads
- /stats — week stats summary
- /scan — trigger manual scan now
- /pause — pause all scanning
- /resume — resume scanning

## Rules
- Never send more than 10 messages per hour (avoid Telegram rate limits)
- Group non-urgent alerts together
- HOT lead alerts always send immediately
- Error alerts always send immediately
