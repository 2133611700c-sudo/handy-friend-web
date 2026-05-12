# OpenClaw VPS Runner — Small-Step Setup

Status: DRAFT / SAFE
Purpose: Run OpenClaw-Lite from a virtual machine when Dell is off.

## Principle
Do not build a fragile big system in one shot. Build in small gates:

1. Repo-side files only.
2. VPS bootstrap script.
3. GitHub self-hosted runner install.
4. Manual smoke workflow.
5. Browser audit artifacts.
6. Scheduled checks.
7. Optional Telegram heartbeat.

## Target architecture

```text
ChatGPT/GitHub issue/task
  -> GitHub Actions workflow
  -> self-hosted VPS runner labelled openclaw
  -> Playwright/Chromium audit
  -> artifacts/logs/screenshots
  -> ChatGPT reads evidence and patches repo
```

## What this runner is allowed to do

- Public website browser checks.
- Screenshots of public pages.
- Link checks.
- Claim-policy checks.
- Synthetic QA only.
- Upload artifacts to GitHub Actions.

## What this runner must not do

- No real customer messages.
- No social posting.
- No password/token screenshots.
- No destructive production actions.
- No auth/CAPTCHA bypass.

## Required VPS minimum

- Ubuntu 22.04 or 24.04
- 1 vCPU
- 2 GB RAM preferred
- 20 GB disk
- Stable internet

## GitHub runner labels

Use these labels when adding the self-hosted runner:

```text
self-hosted,linux,x64,openclaw,handy-friend
```

## Step gates

### Gate 1 — Bootstrap script exists
Expected file:

```text
ops/openclaw/vps/bootstrap-openclaw-vps.sh
```

### Gate 2 — Runner service alive
On VPS:

```bash
sudo systemctl status actions.runner.* --no-pager
```

### Gate 3 — Manual workflow starts
Workflow:

```text
.github/workflows/openclaw-vps-worker.yml
```

### Gate 4 — Artifacts uploaded
Expected artifact:

```text
openclaw-vps-browser
```

### Gate 5 — Only after manual pass
Enable schedule later. Do not schedule before manual evidence pass.

## Current blocker
A VPS or always-on machine is required for true 24/7. GitHub-hosted runner can do short public checks, but cannot maintain persistent sessions.
