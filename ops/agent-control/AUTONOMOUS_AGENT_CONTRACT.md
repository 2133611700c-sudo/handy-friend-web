# Handy & Friend — Autonomous Agent Contract

Status: ACTIVE
Owner: Sergii / Handy & Friend
Coordinator: ChatGPT
Execution hands: GitHub Actions, Dell OpenClaw, optional VPS OpenClaw
Last updated: 2026-05-12

## Goal
Create an execution system where ChatGPT can delegate tasks to a machine agent, receive evidence, analyze results, and continue work without relying on manual ad hoc commands.

## Reality boundary
The agent can be operationally autonomous, but not unrestricted.

It must not autonomously:
- expose or reset secrets;
- spend money;
- message real customers;
- publish social posts;
- delete production data;
- force-push or overwrite main;
- bypass CAPTCHA/auth;
- make legal/licensing claims.

These actions require explicit owner approval or must remain manual.

## Execution layers

| Layer | Role | Current status |
|---|---|---|
| ChatGPT | Coordinator, code/workflow editor, evidence analyst | ACTIVE |
| GitHub Actions | Remote execution, patching, audits, CI | ACTIVE / PARTIAL |
| Dell OpenClaw | Local/browser/authenticated UI execution | DELL_ON_WAITING_SELF_CHECK |
| VPS OpenClaw | Always-on browser worker | OPTIONAL / NOT CONNECTED |
| Supabase | CRM/source of truth | PARTIAL / SQL reports blocked by DB URI |
| Telegram | Control plane/alerts/approval | ENV CONFIGURED, E2E NOT VERIFIED |

## Task lifecycle

Every autonomous task must follow this lifecycle:

```text
TASK_CREATED
  -> CLAIMED_BY_AGENT
  -> RUNNING
  -> EVIDENCE_UPLOADED
  -> VERIFIED_BY_CHATGPT
  -> PATCHED_OR_ESCALATED
  -> CLOSED
```

No task is DONE until evidence is uploaded and checked.

## Agent task sources

Primary task queue:

```text
ops/openclaw/TASK_QUEUE.md
```

Status ledger:

```text
ops/openclaw/STATUS.md
```

Reports path:

```text
ops/openclaw/reports/
ops/reports/
```

## Required task packet format

```yaml
id: OC-000
title:
priority: P0|P1|P2
executor: github-actions|dell-openclaw|vps-openclaw
mode: read_only|synthetic|patch|evidence_only
scope:
  urls: []
  files: []
  workflows: []
rules:
  no_real_customer_messages: true
  no_secrets_in_logs: true
  no_destructive_actions: true
steps: []
evidence_required: []
stop_conditions: []
expected_output:
```

## Evidence requirements

At least one of:
- GitHub Actions run URL/log;
- artifact with `result.json`;
- artifact with `report.md`;
- screenshots from browser audit;
- Vercel deployment READY proof;
- live fetch result;
- Supabase query output with no secrets;
- Telegram message ID for synthetic tests only.

## Autonomy levels

### Level 1 — Repo automation
Allowed:
- create reports;
- add safe workflows;
- run sanitizers through trigger files;
- patch public copy;
- update docs/runbooks.

Status: ACTIVE.

### Level 2 — Public browser automation
Allowed:
- open public pages;
- screenshot pages;
- check links/status/copy;
- detect risky claims.

Status: READY IN CODE, WAITING Dell/VPS runtime evidence.

### Level 3 — Synthetic lead automation
Allowed:
- create test leads only with explicit synthetic markers;
- verify Supabase/Telegram/outbox path;
- no real customers.

Status: WAITING DB/Telegram E2E verification.

### Level 4 — Authenticated dashboard observation
Allowed:
- observe dashboards;
- collect non-secret screenshots;
- report blockers.

Status: DELL ONLY, requires authenticated browser and no secret exposure.

### Level 5 — Real-world outbound actions
Not autonomous.
Requires owner approval:
- client replies;
- payment changes;
- DNS destruction;
- password resets;
- paid ads activation;
- public social posts.

## Current next gate

Dell is ON. The next autonomy gate is:

```bash
bash ops/openclaw/dell/dell-self-check.sh
```

If PASS, run Dell browser audit and upload evidence.

## Definition of complete autonomous agent

The agent is considered complete only when all pass:

1. Dell or VPS runner can execute browser audit without manual debugging.
2. Browser audit uploads `result.json`, `report.md`, and screenshots.
3. ChatGPT can read evidence and patch repo.
4. Vercel deploys patched repo to production.
5. Live fetch verifies the deployed change.
6. Synthetic lead test proves Supabase + Telegram path.
7. A heartbeat/report confirms agent health.

## Failure handling

If blocked, agent must report:
- what failed;
- exact error;
- why it failed;
- evidence path;
- minimal next recovery action.

## Risk control

- Keep production-safe default.
- Prefer read-only/synthetic actions.
- Never fake DONE.
- Never invent access or secret values.
- Escalate gated actions instead of bypassing controls.
