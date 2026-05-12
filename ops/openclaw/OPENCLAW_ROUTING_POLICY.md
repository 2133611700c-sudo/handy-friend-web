# OpenClaw Routing Policy — Handy & Friend

Status: ACTIVE
Owner: Sergii / Handy & Friend
Coordinator: ChatGPT
Runtime executor: OpenClaw on Dell Vostro / WSL2
Last updated: 2026-05-12

## Rule
OpenClaw is the execution hand for browser automation, local scanner operation, visual audits, and platform workflows whenever ChatGPT cannot directly access the browser, local machine, or authenticated UI.

This policy applies to all future Handy & Friend operational tasks unless explicitly overridden.

## Use OpenClaw for

1. Live browser audits
   - Website pages
   - Chat widgets
   - WhatsApp/Messenger buttons
   - Console errors
   - Mobile/desktop screenshots
   - UI regressions

2. Lead-source scanning
   - Craigslist dry-runs
   - Nextdoor dry-runs
   - Facebook group observation/drafts only
   - Source health checks
   - Selector breakage checks

3. Evidence collection
   - Screenshots
   - DOM excerpts
   - Browser-visible status
   - Run logs from Dell/WSL2
   - Scanner outputs
   - Telegram message IDs for synthetic tests only

4. Synthetic QA
   - Alex website chat tests
   - Funnel tests with synthetic markers
   - Non-customer test leads
   - Copy/claims verification

5. UI-only authenticated dashboards
   - Supabase dashboard observation without exposing secrets
   - Google/Meta dashboard screenshots where allowed
   - Vercel browser verification when API/connector is insufficient

## Do not use OpenClaw for

1. Secret handling
   - Do not print, screenshot, paste, or store API keys, passwords, tokens, database URLs, session cookies, recovery codes, or OAuth codes.

2. Real customer communication
   - No auto-send to clients.
   - No WhatsApp replies to real customers.
   - No Facebook/Nextdoor posting without approval.
   - No email sending.

3. Destructive production actions
   - No deleting records.
   - No resetting passwords unless owner explicitly performs/approves inside UI.
   - No DNS/domain deletion.
   - No forced deploy rollback.
   - No force-push.

4. Legal/claim-risk changes
   - No claims of licensed, bonded, certified, best in LA, #1, guaranteed lowest price, or no job too big.
   - No advice outside handyman scope.

## Required handoff format from ChatGPT to OpenClaw

Every OpenClaw task must include:

```yaml
goal:
mode:
project:
rules:
inputs:
steps:
evidence_required:
stop_conditions:
output_path:
```

## Required output from OpenClaw

Every run must produce a report:

```text
ops/openclaw/reports/YYYYMMDD_HHMM_openclaw_status.md
```

Template:

```markdown
# OpenClaw Status — YYYY-MM-DD HH:MM PT

## Goal

## VERIFIED

## FAILED

## BLOCKED

## UNKNOWN

## Evidence
| item | evidence type | exact evidence | file/screenshot/log |
|---|---|---|---|

## Risks and control

## Next action
```

## Coordination rules

- ChatGPT handles GitHub, Vercel connector checks, workflow changes, issue updates, report synthesis, and policy logic.
- OpenClaw handles browser/local execution and returns evidence.
- Supabase remains source of operational truth when database access is available.
- Telegram remains alert/control plane for approvals.
- GitHub issue/comment/report is the permanent evidence trail.

## Default OpenClaw trigger conditions

Use OpenClaw automatically when a task requires any of these:

- real browser verification
- visual screenshot proof
- authenticated dashboard UI
- Craigslist/Nextdoor/Facebook observation
- local Dell script execution
- scanner status evidence
- console/network tab inspection
- manual UI path checking
- evidence that cannot be obtained from GitHub/Vercel/API tools

## Current active OpenClaw task packet

Primary packet:

```text
ops/openclaw/HF_OPENCLAW_AGENT_TASKS.md
```

This packet must be used first for the current lead/Alex/Supabase/website audit track.
