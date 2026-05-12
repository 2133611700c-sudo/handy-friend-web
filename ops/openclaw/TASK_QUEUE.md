# OpenClaw Task Queue

Status: ACTIVE
Purpose: Single queue for tasks that require OpenClaw/Dell/VPS/browser execution.

## Queue rules

- One task = one evidence artifact/report.
- No real customer messages.
- No social posting.
- No secrets in screenshots/logs.
- Mark every task VERIFIED / FAILED / BLOCKED.
- Prefer VPS runner when Dell is off.
- Prefer Dell runner for authenticated browser sessions or local scanners.

## Active tasks

### OC-001 — VPS self-hosted smoke
Status: WAITING_RUNNER
Executor: VPS self-hosted runner
Workflow: `.github/workflows/openclaw-vps-smoke.yml`
Command:

```bash
gh workflow run openclaw-vps-smoke.yml --repo 2133611700c-sudo/handy-friend-web --ref main
```

Evidence required:
- workflow run ID
- job log showing runner hostname
- node/npm/python/git versions
- `node --check scripts/openclaw-virtual-browser-audit.mjs` PASS

Blocker:
- self-hosted runner with labels `self-hosted, linux, x64, openclaw, handy-friend` must be online.

### OC-002 — VPS browser audit
Status: WAITING_OC_001
Executor: VPS self-hosted runner
Workflow: `.github/workflows/openclaw-vps-browser.yml`
Command:

```bash
gh workflow run openclaw-vps-browser.yml \
  --repo 2133611700c-sudo/handy-friend-web \
  --ref main \
  -f target_origin=https://handyandfriend.com \
  -f routes='/,/book,/pricing,/services,/messenger'
```

Evidence required:
- artifact `openclaw-vps-browser`
- screenshots
- `result.json`
- `report.md`
- failed pages list
- risky claims list
- phone/WhatsApp/Messenger link counts

### OC-003 — Dell local scanner inventory
Status: WAITING_DELL_ON
Executor: Dell OpenClaw / WSL2
Reference: `ops/openclaw/HF_OPENCLAW_AGENT_TASKS.md`
Evidence required:
- exact project path
- scripts found table
- runtime versions
- scanner dry-run capability status

### OC-004 — Public website claim audit
Status: WAITING_OC_002
Executor: VPS OpenClaw-Lite
Scope:
- forbidden claims
- brand typo variants
- contact consistency
- page availability
- CTA link integrity

### OC-005 — Synthetic Alex UI QA
Status: WAITING_BROWSER_AGENT
Executor: VPS or Dell browser runner
Scope:
- synthetic website chat questions only
- no real lead submission unless explicitly marked test

## Completed tasks

None yet.

## Blocked tasks

### Supabase SQL reports
Status: BLOCKED_SECRET
Reason:
- `SUPABASE_DATABASE_URL` still requires a real Supabase Postgres URI.
- Last known failure showed placeholder host `aws-0-<REGION>.pooler.supabase.com`.

Control:
- do not guess database password;
- do not expose connection string in reports;
- use Supabase Connect / Session Pooler with real password.
