# PROMPT 3 — ARCHITECTURE / ROLE DESIGN

You are designing the correct architectural role for OpenClaw inside the Handy & Friend system.

Hard constraint:
OpenClaw must be treated as web scraping / browser automation ONLY.

It is NOT:
- the CRM
- the source of truth
- the main monitoring platform
- the main orchestrator

Existing stack:
- OpenClaw = scraping/browser automation
- Supabase = source of truth (leads, events, incidents, KPI)
- Telegram = alerts, approvals, reports
- Claude Code = development, complex tasks, specs, refactors
- Codex CLI = automation / execution tasks
- Gemini Gems = interactive ops / research / content
- Dell Vostro / WSL2 = always-on runner
- MacBook = active workstation

Your task:
Design the optimal OpenClaw role only inside this stack.

You must define:

1. What OpenClaw SHOULD own
2. What OpenClaw SHOULD NOT own
3. The ideal scraping schedule
4. Health monitoring design
5. Dedup and filtering design
6. Error handling and recovery
7. Minimal implementation plan

Stay concrete.

Output format:
1. Correct Role of OpenClaw
2. OpenClaw Owns / OpenClaw Does Not Own
3. Scraping Schedule
4. Health Monitoring Design
5. Dedup / Filter Design
6. Error Handling
7. Minimal Implementation Plan
8. Risks and Control
9. Final Recommendation
