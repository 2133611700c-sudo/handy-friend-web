# Browser Audit Skill

## Scope

Audit live site routes using Playwright on cloud runner.

## Default origin and routes

- Origin: `https://handyandfriend.com`
- Routes: `/`, `/book`, `/pricing`, `/services`, `/messenger`

## Required checks

- HTTP response status
- Page title
- Phone visibility/link presence
- CTA visibility signals (buttons/links)
- WhatsApp and Messenger link presence
- Console errors
- Failed network requests
- Desktop screenshot
- Mobile screenshot
- Forbidden claims check

## Output

- `ops/openclaw/reports/virtual-browser/result.json`
- `ops/openclaw/reports/virtual-browser/report.md`
- Task report under `ops/agent-control/reports/openclaw-browser-audit/`
