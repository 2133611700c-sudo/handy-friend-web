# OpenClaw Status Ledger

Last updated: 2026-05-12

## Goal
Create a reliable execution layer for Handy & Friend tasks when ChatGPT needs browser/local/UI hands.

## Current architecture

| Layer | Status | Purpose |
|---|---|---|
| ChatGPT GitHub connector | ACTIVE | Repo edits, run/log/artifact reading, issue updates |
| Dell OpenClaw | WAITING_DELL_ON | Authenticated local browser/scanners |
| GitHub OpenClaw-Lite | PARTIAL | Public browser runner code/workflows |
| VPS OpenClaw runner | WAITING_RUNNER | Always-on self-hosted runner |
| Supabase SQL reports | BLOCKED_SECRET | CRM/Telegram/revenue DB audit |

## Implemented files

| File | Status |
|---|---|
| `ops/openclaw/HF_OPENCLAW_AGENT_TASKS.md` | DONE |
| `ops/openclaw/OPENCLAW_ROUTING_POLICY.md` | DONE |
| `scripts/openclaw-virtual-browser-audit.mjs` | DONE |
| `.github/workflows/openclaw-virtual-browser.yml` | DONE / MANUAL ONLY |
| `.github/workflows/openclaw-command-router.yml` | ADDED / NOT CONFIRMED DUE GITHUB BOT EVENT LIMITS |
| `ops/openclaw/GITHUB_VIRTUAL_RUNNER_PROTOCOL.md` | DONE |
| `ops/openclaw/vps/README.md` | DONE |
| `ops/openclaw/vps/SETUP_RUNBOOK.md` | DONE |
| `.github/workflows/openclaw-vps-smoke.yml` | DONE / WAITING RUNNER |
| `.github/workflows/openclaw-vps-browser.yml` | DONE / WAITING RUNNER |
| `ops/openclaw/TASK_QUEUE.md` | DONE |

## Verified

- Alex production smoke previously passed.
- Validate Site includes syntax check for `scripts/openclaw-virtual-browser-audit.mjs`.
- Vercel deploys are being created from GitHub commits.

## Not verified yet

- VPS self-hosted runner online.
- OpenClaw VPS smoke workflow execution.
- OpenClaw VPS browser screenshots/artifacts.
- Issue-comment router execution.

## Blockers

### B1 — No self-hosted runner online yet
Required labels:

```text
self-hosted, linux, x64, openclaw, handy-friend
```

### B2 — Supabase SQL reports still need real Postgres URI
Do not guess password. Do not log secret.

## Next gate

1. Bring VPS/self-hosted runner online.
2. Run `.github/workflows/openclaw-vps-smoke.yml`.
3. If PASS, run `.github/workflows/openclaw-vps-browser.yml`.
4. Read artifact `openclaw-vps-browser`.
5. Patch site/workflows based on evidence.

## Risk control

- No real customer messages.
- No social posting.
- No secret screenshots.
- No destructive actions.
- No scheduled browser checks until manual browser run passes.
