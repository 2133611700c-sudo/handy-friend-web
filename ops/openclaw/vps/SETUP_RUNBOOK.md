# OpenClaw VPS Setup Runbook

Status: SAFE / MANUAL-GATED
Purpose: Prepare a small always-on VPS to act as OpenClaw-Lite when Dell is off.

## Gate 0 — VPS requirement

Use Ubuntu 22.04 or 24.04.
Minimum:
- 1 vCPU
- 2 GB RAM preferred
- 20 GB disk

## Gate 1 — Base packages

On VPS, install:
- git
- curl
- jq
- unzip
- python3
- nodejs 22+
- npm

Verify:

```bash
node --version
npm --version
python3 --version
git --version
```

Expected:
- Node 22+
- Python 3.10+
- Git available

## Gate 2 — Browser runtime

Install Playwright and Chromium in a test folder.

Verify with a public page only:

```bash
node -e "console.log('node ok')"
```

Then run a Playwright smoke check after dependencies are installed.

Expected result:
- Chromium launches headless.
- Public page opens.
- No secrets or private dashboards involved.

## Gate 3 — GitHub self-hosted runner

In GitHub:

```text
Repo -> Settings -> Actions -> Runners -> New self-hosted runner
```

Choose:
- Linux
- x64

Labels to apply:

```text
self-hosted, linux, x64, openclaw, handy-friend
```

Security:
- Do not paste runner registration token into chat.
- Do not commit runner token.
- Register directly on VPS terminal.

## Gate 4 — Runner service

After GitHub runner is configured, install it as a service on VPS.

Verify:

```bash
sudo systemctl status actions.runner.* --no-pager
```

Expected:
- service active/running

## Gate 5 — First workflow

After runner is visible online in GitHub UI, enable/create a workflow that uses:

```yaml
runs-on: [self-hosted, linux, x64, openclaw, handy-friend]
```

First workflow must only run a safe smoke:
- checkout
- node version
- script syntax check
- no browser yet
- no secrets

## Gate 6 — Browser workflow

Only after Gate 5 passes, run:

```text
scripts/openclaw-virtual-browser-audit.mjs
```

Expected artifacts:
- report.md
- result.json
- screenshots

## Gate 7 — Scheduling

Do not enable schedule until manual browser run passes.

Allowed schedule after proof:
- every 6 hours for public site audit
- daily for source health summary

## Safety rules

- No real client messages.
- No Facebook/Nextdoor posting.
- No screenshots of passwords/tokens.
- No Supabase password reset by agent.
- No destructive actions.
- Synthetic/public checks only.

## Failure handling

If any gate fails, stop and report:
- exact command
- exact error
- which gate failed
- next minimal fix
