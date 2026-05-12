# Handy & Friend — Autonomy Master Plan

Status: ACTIVE
Owner: Sergii
Coordinator: ChatGPT
Primary goal: give ChatGPT reliable execution hands through GitHub-first automation.
Last updated: 2026-05-12

## Goal
Build a controlled autonomous execution system that lets ChatGPT perform Handy & Friend operational tasks with evidence, without depending on ad hoc manual commands from Sergii.

## Core principle
GitHub is the main control plane.

Mac, Dell, and VPS are optional executors, not the main source of truth.

```text
ChatGPT
  -> creates task / trigger / workflow / patch in GitHub
  -> GitHub Actions executes safe work
  -> Vercel deploys when app changes
  -> reports/artifacts are produced
  -> ChatGPT reads evidence
  -> next task is created or issue is closed
```

## Non-negotiable boundaries
The system must not autonomously:
- send real customer messages;
- publish social posts;
- activate or spend paid ads budget;
- expose secrets;
- reset passwords;
- delete production data;
- force-push main;
- change DNS destructively;
- claim licensed/bonded/certified/best/#1;
- bypass CAPTCHA/auth walls.

These remain approval-gated.

## Autonomy levels

### L1 — GitHub repository execution
Status: PARTIALLY VERIFIED

Capabilities:
- deterministic file patches;
- policy copy sanitizers;
- reports;
- status ledgers;
- issue comments;
- workflow-triggered commits.

Verified evidence:
- GitHub Actions sanitizer bot commits were created.
- Vercel deployed those commits.
- Live `/api/health` returned healthy after deploy.

### L2 — GitHub public checks
Status: NEXT BUILD TARGET

Capabilities:
- public route status checks;
- public contact/link checks;
- public policy drift checks;
- no browser session required.

Execution target:
- GitHub Actions on `ubuntu-latest`.

### L3 — GitHub browser checks
Status: READY IN DESIGN / NOT VERIFIED

Capabilities:
- Playwright/Chromium public page screenshots;
- visual reports;
- CTA visibility;
- basic console/request error collection.

Execution target:
- GitHub-hosted runner if connector allows workflow creation;
- Dell/OpenClaw fallback if GitHub workflow safety blocks browser install;
- VPS optional later.

### L4 — Synthetic lead proof
Status: WAITING DB/TELEGRAM VERIFICATION

Capabilities:
- create synthetic test lead only;
- verify Supabase row;
- verify Telegram alert;
- verify outbox/status event.

Blocked by:
- real DB URI for SQL reports and/or safe API test path.

### L5 — Authenticated UI observation
Status: DELL/MAC/VPS ONLY

Capabilities:
- authenticated dashboards;
- screenshots without secrets;
- UI-only checks.

Cannot be GitHub-only unless credentials/session are safely configured.

### L6 — Real-world actions
Status: APPROVAL ONLY

Examples:
- real client replies;
- ad budget changes;
- public posts;
- DNS/password/payment changes.

## Required agents

### A1 — Copy Policy Agent
Purpose: keep public copy aligned with `rules-registry.yaml`.
Status: VERIFIED PARTIAL.

### A2 — Site Health Agent
Purpose: verify public pages and `/api/health`.
Status: NEXT.

### A3 — Pricing Policy Agent
Purpose: compare public price surfaces with canonical price rules.
Status: NEXT.

### A4 — Alex Smoke Agent
Purpose: verify `/api/ai-chat` safe behavior with synthetic prompts.
Status: EXISTS AS WORKFLOW, NEEDS CONTROL-PLANE INTEGRATION.

### A5 — Lead Proof Agent
Purpose: verify site form -> Supabase -> Telegram.
Status: BLOCKED UNTIL SAFE DB/API TEST PATH VERIFIED.

### A6 — Browser Evidence Agent
Purpose: screenshots/artifacts for website/CTA/UX.
Status: READY DESIGN, EXECUTION NOT VERIFIED.

### A7 — OpenClaw Local Agent
Purpose: local/browser tasks when GitHub-only cannot perform them.
Status: OPTIONAL FALLBACK.

## Execution contract for every agent
Every agent must produce:
- exact task id;
- exact status: PASS / FAIL / BLOCKED;
- raw evidence path;
- no secrets;
- next recovery action.

## Done definition for autonomy
Autonomy is complete when:

1. ChatGPT can create a GitHub task without asking Sergii for local commands.
2. GitHub Actions executes the task.
3. The task writes a report/artifact/commit.
4. ChatGPT can read the result through available tools.
5. ChatGPT can create the next task based on evidence.
6. The loop works for at least:
   - site health;
   - copy policy;
   - pricing policy;
   - Alex smoke;
   - browser evidence or fallback evidence.

## Current verified state

| Area | Status |
|---|---|
| GitHub can patch files via workflows | VERIFIED |
| Vercel deploys GitHub commits | VERIFIED |
| Live health endpoint works | VERIFIED |
| Full generic GitHub-only runner | NOT VERIFIED |
| Browser screenshots from GitHub | NOT VERIFIED |
| Supabase SQL reports | BLOCKED by real DB URI |
| OpenClaw local runner | PREPARED, NOT VERIFIED |

## Next sequence

### Step 1
Create and verify Site Health Agent with the smallest possible workflow.

### Step 2
Create Pricing Policy Agent as a repo-only static check.

### Step 3
Integrate existing Alex Smoke workflow into the same status/report model.

### Step 4
Retry Browser Evidence Agent in the smallest safe form.

### Step 5
Only after 1-4 are stable, add scheduling.

## Risk control
- Small workflows only.
- No universal unrestricted agent.
- No customer/send/post actions.
- No secrets in tasks or reports.
- Evidence-gated DONE only.
