# OpenClaw Status Ledger

Last updated: 2026-05-12

## Goal
Create a reliable execution layer for Handy & Friend tasks when ChatGPT needs browser/local/UI hands.

## Current architecture

| Layer | Status | Purpose |
|---|---|---|
| ChatGPT GitHub connector | ACTIVE | Repo edits, run/log/artifact reading, issue updates |
| Dell OpenClaw | DELL_ON_WAITING_SELF_CHECK | Local browser/scanners, authenticated UI when needed |
| GitHub OpenClaw-Lite | PARTIAL | Public browser runner code/workflows |
| VPS OpenClaw runner | OPTIONAL_WAITING_RUNNER | Always-on self-hosted runner if Dell is unavailable |
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
| `ops/openclaw/dell/START_HERE.md` | DONE |
| `ops/openclaw/dell/dell-self-check.sh` | DONE |

## Verified

- Alex production smoke previously passed.
- Validate Site includes syntax check for `scripts/openclaw-virtual-browser-audit.mjs`.
- Vercel deploys are being created from GitHub commits.
- GitHub Actions sanitizer workflows successfully patched public copy and deployed to Vercel.
- Live `/api/health` returned healthy after sanitizer deploy.

## Not verified yet

- Dell self-check execution.
- Dell local browser audit screenshots/artifacts.
- VPS self-hosted runner online.
- OpenClaw VPS smoke workflow execution.
- OpenClaw VPS browser screenshots/artifacts.
- Issue-comment router execution.

## Active Dell path

Start packet:

```text
ops/openclaw/dell/START_HERE.md
```

Self-check:

```bash
bash ops/openclaw/dell/dell-self-check.sh
```

Browser audit after self-check PASS:

```bash
TARGET_ORIGIN=https://handyandfriend.com \
ROUTES='/,/book,/pricing,/services,/messenger' \
OUT_DIR=ops/openclaw/reports/dell-browser \
node scripts/openclaw-virtual-browser-audit.mjs
```

## Blockers

### B1 — Dell self-check not run yet
Dell is reported ON, but runtime/repo/browser state is not verified yet.

### B2 — No self-hosted VPS runner online yet
VPS is optional while Dell is available. Required labels if later configured:

```text
self-hosted, linux, x64, openclaw, handy-friend
```

### B3 — Supabase SQL reports still need real Postgres URI
Do not guess password. Do not log secret.

## Next gate

1. Pull latest `main` on Dell.
2. Run `bash ops/openclaw/dell/dell-self-check.sh`.
3. If PASS, run Dell browser audit.
4. Review `ops/openclaw/reports/dell-browser/result.json` and `report.md`.
5. Patch site/workflows based on evidence.

## Risk control

- No real customer messages.
- No social posting.
- No secret screenshots.
- No destructive actions.
- No scheduled browser checks until manual Dell or VPS browser run passes.
