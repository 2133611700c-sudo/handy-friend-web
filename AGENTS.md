# AGENTS.md — Rules for AI Coding Agents

> For Codex, Claude Code, and any autonomous coding agent working on this repo.

## Branch Policy
- NEVER commit to main directly
- Branch naming: `feature/[short-description]` or `fix/[short-description]`
- All changes through PR only

## Code Style
- HTML/CSS/JS — vanilla, no frameworks, no build step
- Vercel serverless functions in `api/` — Node.js ESM
- No console.log in production code (use structured logging in API functions)
- Comments only for WHY, not WHAT

## Pricing — Single Source of Truth
- All prices live in `lib/price-registry.js` — NEVER hardcode prices elsewhere
- Alex AI (`lib/alex-one-truth.js`) reads from price-registry
- Service pages read from price-registry via shared.js
- If you change a price → change it in price-registry.js ONLY

## Testing
- Smoke test after deploy: `curl https://handyandfriend.com/api/health`
- Verify service pages load with correct pricing
- Check mobile responsiveness on any HTML changes

## Definition of Done
- [ ] Code works without errors
- [ ] No hardcoded secrets/keys
- [ ] PR description explains WHAT and WHY
- [ ] Prices match price-registry.js
- [ ] Mobile view checked if HTML changed

## Forbidden
- No direct pushes to main
- No API keys in code (use env vars)
- No dependencies without explicit approval (zero-dependency policy for API functions)
- No changes to `/ops` files without human review
- No 20% combo discount messaging (removed 2026-03-25)
- No new npm packages in serverless functions

## Deploy Policy
- Deploy only after human approval
- `npx vercel deploy --yes` → smoke test → `npx vercel --prod --yes`
- Health check: `curl https://handyandfriend.com/api/health`

## Key Architecture
- Static site: `index.html` + service pages (no framework)
- i18n: 4 languages (EN/ES/RU/UK) in main.js
- Lead flow: form → `api/submit-lead.js` → Supabase + Telegram + Email
- AI chat: Alex in `lib/alex-one-truth.js` → DeepSeek API
- FB Messenger: `api/alex-webhook.js` → Alex → Supabase
- Analytics: GA4 + GTM, server-side events via `lead-pipeline.js`

## OpenClaw
Role: web scraping / browser automation ONLY.

OpenClaw is used for:
- Nextdoor lead collection
- Craigslist lead collection
- source login/session handling
- raw lead extraction
- source-level parsing
- first-pass source filtering
- scrape heartbeat / source health evidence

OpenClaw is NOT:
- the CRM
- the source of truth
- the main orchestrator
- the main monitoring system
- the pricing authority
- the incident history authority

System boundaries:
- Supabase = source of truth
- Telegram = alerts / approvals / digests
- rules-registry.yaml = source of truth for pricing, geography, SLA, claims, escalation
- Claude Code / Codex / Gems = higher-level reasoning and ops tools

Runtime:
- Dell Vostro / WSL2 = 24/7 node
- OPENCLAW_ROOT = /Users/sergiikuropiatnyk/.openclaw/agents/main/agent
- Sources: nextdoor_sources.json + Craigslist config
- Health scripts: verify_hunters.py, monitor_hunter_sla.py, agent_self_check.py
- Output target: Supabase social_leads

Severity rules:
- feeds empty > expected interval = SEV 3
- scanner/scheduler down = SEV 3
- 100% lead rejection anomaly = SEV 2 minimum
- parser drift / source format drift = SEV 2 minimum
