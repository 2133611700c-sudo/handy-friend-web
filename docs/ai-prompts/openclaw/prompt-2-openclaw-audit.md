# PROMPT 2 — OPENCLAW AUDIT

You are auditing OpenClaw usage for Handy & Friend after the immediate intake issue has been stabilized.

OpenClaw role in this system:
- OpenClaw = web scraping / browser automation ONLY
- Used for lead capture from Nextdoor and Craigslist
- Output goes to Supabase social_leads
- DeepSeek API is used for classification/filtering
- Telegram is used for alerts
- Dell Vostro / WSL2 is the 24/7 node

Before starting:
- Read the emergency-fix report from Supabase ops_incidents if available
- If not available there, read the latest local fix log / report file created during Prompt 1
- Do not assume version/path/config from memory; confirm from the report or live system

Your task:
Audit only what matters for OpenClaw’s real role in this business.

Questions to answer:
1. What OpenClaw version is actually installed?
2. Is our version current enough?
3. Are there known security or stability issues with our current version?
4. What new OpenClaw changes since our installed version actually matter for:
   - scraping reliability
   - Windows / WSL2 stability
   - browser/session handling
   - skills/config loading
   - recovery from parser drift
5. What features are irrelevant noise for our use case?
6. Is DeepSeek still the right classifier for this layer?
7. What scraping/config improvements should we adopt now?
8. What health checks are missing that would have caught:
   - empty feeds
   - dead sources
   - over-rejection
   - parser/schema drift
9. What should be monitored every 6 hours?
10. What should trigger a SEV 3 incident automatically?

Rules:
- Do not treat OpenClaw as CRM/orchestrator/monitoring platform
- Keep the scope to scraping/browser automation and intake reliability
- No generic AI tooling advice
- No fluff
- Mark anything uncertain as NOT VERIFIED

Output format:
1. Executive Verdict
2. Installed Version and Risk
3. What’s New That Actually Matters
4. What to Ignore
5. Recommended Changes Now
6. Monitoring Gaps
7. Risks and Control
8. Final Recommendation
