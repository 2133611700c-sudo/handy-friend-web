# SECURITY — Handy & Friend AI Exoskeleton
# Last updated: 2026-03-27

## 1. CREDENTIALS — Where secrets live

| Secret | Location | NEVER in |
|---|---|---|
| Vercel env vars | Vercel Dashboard only | Git, code, chat |
| TELEGRAM_BOT_TOKEN | .env.production (local) + Vercel | Git, logs |
| TELEGRAM_CHAT_ID | .env.production (local) + Vercel | Git |
| DEEPSEEK_API_KEY | OpenClaw encrypted config | Git, chat |
| FB_PAGE_ACCESS_TOKEN | Vercel env only | Git, code |
| SUPABASE keys | Vercel env only | Git, code |
| RESEND_API_KEY | Vercel env only | Git, code |
| Google password | User's head only | Anywhere digital |
| Nextdoor password | Reset via Google OAuth | Anywhere digital |

## 2. GIT SECURITY

- .env, .env.production, .env.local → in .gitignore
- NEVER commit secrets, keys, passwords
- If accidentally committed → rotate key immediately + git filter-branch
- Pre-commit check: grep for patterns like "sk-", "re_", "eyJ", API keys

## 3. OPENCLAW SECURITY

- OpenClaw config: ~/.openclaw/openclaw.json (encrypted gateway token)
- Browser cookies: persist in OpenClaw browser profile (encrypted by Chrome)
- SKILL.md files: NO secrets inside, only instructions
- leads.json: contains client names/areas — CONFIDENTIAL, never share
- exec-approvals.json: controls what commands OpenClaw can run
- Rate limits enforced: max 8 ND / 5 FB comments per scan
- CAPTCHA detection → auto-stop scanning

## 4. LEAD HUNTER SAFETY

- Never auto-post on social media (drafts only for marketing)
- Lead comments: only on Nextdoor/Facebook where people ASK for help
- One comment per post — never spam
- Never DM first
- Never share client info between platforms
- Never screenshot/save other people's personal info beyond name+area
- All data in leads.json is for internal use only

## 5. WEBSITE SECURITY

- No secrets in client-side JavaScript
- price-registry.js: public prices only (OK to be in frontend)
- API routes: validate inputs, no SQL injection (Supabase parameterized)
- CORS: restricted to handyandfriend.com
- CSP headers: set via Vercel
- No eval(), no innerHTML with user data

## 6. ALEX AI SECURITY

- Alex never shares other customers' info
- Alex never confirms bookings without human approval
- Alex never sends payment links
- Phone-gate: collects phone before detailed pricing
- Session isolation: each conversation separate in Supabase

## 7. ACCESS CONTROL

| Who | Access | Cannot |
|---|---|---|
| Sergii | Everything | — |
| Claude Code | Code, files, terminal, browser | Push to prod without approval |
| OpenClaw | Browser, shell, files | Delete files, access payment systems |
| Codex | Code on branches | Push to main, modify /ops |
| Alex AI | Chat, Supabase leads table | Admin functions, delete data |
| ChatGPT | Knowledge base only | Code execution, deployments |
| Gemini | Research only | Any write access |

## 8. INCIDENT RESPONSE

If compromised:
1. Rotate ALL API keys immediately (Vercel dashboard)
2. Revoke OpenClaw browser sessions
3. Change Google password
4. Check Supabase for unauthorized access
5. Review git history for leaked secrets
6. Notify Sergii via Telegram backup channel

## 9. CONFIDENTIALITY RULE

ALL business data is STRICTLY CONFIDENTIAL:
- Pricing details, lead data, client information
- Revenue, costs, business strategies
- API keys, tokens, credentials
- Internal documents, scan results
- No access to ANYONE outside Sergii
- No exceptions. Ever.
