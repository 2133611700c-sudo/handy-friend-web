# PROMPT 4 — HEALTH MONITOR BUILDER

You are building a health monitor for OpenClaw scraping
on Dell Vostro WSL2 for Handy & Friend.

Current sources:
- Nextdoor (3 feeds)
- Craigslist (LA handyman)

Output:
- Supabase social_leads
Alerts:
- Telegram

Build a Python script:
openclaw_health_monitor.py

It must check every 6 hours:

1. Source freshness
- Query Supabase: last lead_detected_at per source
- If any source has no leads > 6 hours → status = DEGRADED
- If any source has no leads > 12 hours → status = DEAD
- If all sources dead > 6 hours → SEV 3 alert

2. Rejection anomaly
- Query last 50 leads per source if enough metadata exists
- If rejection rate > 80% → SEV 2 alert
- If rejection rate = 100% → SEV 2 + flag for filter review

3. Feed response check
- Read nextdoor_sources.json
- For each source: attempt fetch, check if response is non-empty
- If response empty or error → log specific error type

4. Scanner process check
- Check if cl_hunter.py and nextdoor_hunter.py ran within expected interval
- If no run in expected window → SEV 3

5. Output
- Write to Supabase ops_incidents (create or update)
- Send Telegram digest:
  SOURCE HEALTH REPORT
  ND Source 1: ALIVE / DEGRADED / DEAD
  ND Source 2: ALIVE / DEGRADED / DEAD
  ND Source 3: ALIVE / DEGRADED / DEAD
  CL: ALIVE / DEGRADED / DEAD
  Rejection rate ND: X%
  Rejection rate CL: X%
  Last scan: Xm ago
  Status: GREEN / YELLOW / RED

6. Cron integration
- Design for: 0 */6 * * *
- Exit 0 on success, 1 on failure
- Log to: ~/handy-friend-ops/logs/health_monitor.log

Requirements:
- Use env vars for SUPABASE_URL, SUPABASE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
- Handle all exceptions gracefully
- Never crash silently — always log + alert
- Use rules-registry.yaml source_health section for thresholds if available
- Prefer create-or-update incident logic, not duplicate spam
- Include test mode if practical

Deliver:
1. Complete working Python script
2. Cron line for installation
3. Test instructions
4. Risks and Control
