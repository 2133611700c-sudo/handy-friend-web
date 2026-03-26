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
