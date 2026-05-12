# GitHub Virtual Runner Protocol for OpenClaw-Lite

Status: ACTIVE
Purpose: Provide a Dell-independent execution path for browser audits and evidence collection using GitHub Actions.

## Why
If Dell / WSL2 is off, local OpenClaw cannot run. GitHub-hosted Actions can still run a short-lived Ubuntu virtual machine and execute safe browser automation with Playwright.

## What exists now

Workflow:

```text
.github/workflows/openclaw-virtual-browser.yml
```

Runner script:

```text
scripts/openclaw-virtual-browser-audit.mjs
```

Artifacts:

```text
openclaw-virtual-browser
```

## Capabilities

This virtual runner can:
- open live public website pages;
- use headless Chromium;
- take screenshots;
- collect page status/title/buttons/links;
- detect risky claims such as licensed/bonded/certified/#1/best in LA;
- detect brand typo patterns like Handy & Fiend;
- upload JSON/Markdown/screenshot artifacts.

It cannot:
- use logged-in local browser sessions from Dell;
- solve CAPTCHA reliably;
- access private dashboards unless credentials are explicitly configured as secure GitHub Actions secrets;
- run 24/7 continuously;
- safely handle real customer messaging.

## Manual command

Run from any machine with GitHub CLI auth:

```bash
gh workflow run openclaw-virtual-browser.yml \
  --repo 2133611700c-sudo/handy-friend-web \
  --ref main \
  -f target_origin=https://handyandfriend.com \
  -f routes='/,/book,/pricing,/services,/messenger'
```

Then inspect:

```bash
gh run list --repo 2133611700c-sudo/handy-friend-web --workflow openclaw-virtual-browser.yml --limit 3
```

For latest log:

```bash
RUN_ID=$(gh run list --repo 2133611700c-sudo/handy-friend-web --workflow openclaw-virtual-browser.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run view "$RUN_ID" --repo 2133611700c-sudo/handy-friend-web --log
```

## ChatGPT coordinator rule

When ChatGPT cannot directly browse authenticated UI or use Dell OpenClaw, it should:

1. Use GitHub tools for repo/workflow changes.
2. Use this virtual runner for public browser checks.
3. Ask owner only for command execution if the connector cannot dispatch workflow directly.
4. Read GitHub Actions logs/artifacts after run.
5. Continue fixes based on evidence.

## Future improvement

A GitHub App / bot token with Actions workflow dispatch permission can allow ChatGPT-side dispatch without requiring owner terminal commands, if such tool support becomes available.

## Security rules

- Do not configure customer messaging actions.
- Do not store passwords in artifacts.
- Do not screenshot secrets.
- Do not use this runner to bypass auth/CAPTCHA.
- Use synthetic test markers only.
