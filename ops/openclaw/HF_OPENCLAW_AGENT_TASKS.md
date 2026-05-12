# Handy & Friend — OpenClaw Execution Task Packet

Status: ACTIVE
Owner: OpenClaw on Dell Vostro / WSL2
Coordinator: ChatGPT via GitHub/Vercel evidence
Last updated: 2026-05-12

## Goal
Use OpenClaw only for browser automation, source scanning, lead discovery, and platform observation. Do not use OpenClaw to make unsafe production/backend changes, reset secrets, or publish client-facing replies without human approval.

## Source of truth
1. `rules-registry.yaml` — canonical business rules.
2. Supabase tables/views — operational truth.
3. GitHub Actions logs/artifacts — CI truth.
4. Live browser screenshots / raw page evidence — UI truth.

## Non-negotiable rules
- No DONE without evidence.
- Separate VERIFIED / FAILED / BLOCKED / UNKNOWN.
- Customer-facing output must be English only.
- Never say licensed, bonded, certified, best in LA, #1, guaranteed lowest price.
- Do not reveal internal rates, margins, costs, account IDs, secrets, or incident internals.
- No auto-send to clients. Draft only, then Telegram / Sergii approval.
- Do not publish identical text across Facebook groups.
- No direct destructive actions without explicit approval.

## Current known blockers

### B1 — Supabase SQL Reports still failing
Known failure pattern:

```text
could not translate host name "aws-0-<REGION>.pooler.supabase.com" to address
```

Meaning: `SUPABASE_DATABASE_URL` contains a placeholder, not a real Supabase pooler URI.

OpenClaw must NOT guess the database password. If Supabase Dashboard is accessible in browser, OpenClaw may collect only the visible non-secret connection string pattern and identify missing placeholders. It must not paste secrets into chat logs.

### B2 — OpenClaw direct control from ChatGPT is not available
ChatGPT currently has GitHub/Vercel/Gmail/etc. connectors but no direct OpenClaw MCP connector. Therefore OpenClaw must execute from Dell using this packet and return evidence via files/logs/Telegram/GitHub issue comments.

## Phase 0 — Agent self-check

### Task O0.1 — Verify OpenClaw runtime
Run on Dell / WSL2:

```bash
pwd
python --version
node --version || true
git --version
```

If project path is known:

```bash
cd <OPENCLAW_OR_HANDY_OPS_ROOT>
ls -la
find . -maxdepth 3 -iname '*claw*' -o -iname '*hunter*' -o -iname '*scheduler*'
```

Evidence required:
- command output
- working directory
- exact scripts found
- any missing dependencies

### Task O0.2 — Verify configured scanners
Look for:
- `run_scheduler.bat`
- `cl_hunter.py`
- `nextdoor_hunter.py`
- `lead_dedup.py`
- `telegram_reporter.py`
- `verify_hunters.py`
- `agent_self_check.py`
- `monitor_hunter_sla.py`
- `lead_status_cli.py`
- `lead_pipeline_report.py`

Output table:

| script | exists | path | last_modified | runnable | notes |
|---|---:|---|---|---:|---|

Do not edit scripts yet.

## Phase 1 — Lead source health audit

### Task O1.1 — Craigslist scanner audit
Run scanner in dry-run/read-only mode if supported.

Evidence required:
- command used
- number of posts scanned
- number accepted/rejected
- top 10 rejection reasons
- examples of 5 accepted candidate leads, redacted if needed
- whether results reach Supabase or local queue

Failure classification:
- `NO_RESULTS`
- `AUTH_BLOCKED`
- `SELECTOR_BROKEN`
- `FILTER_TOO_STRICT`
- `DB_WRITE_FAILED`
- `TELEGRAM_FAILED`
- `UNKNOWN`

### Task O1.2 — Nextdoor scanner audit
Run Nextdoor scanner in dry-run/read-only mode if supported.

Evidence required:
- login/auth state
- page reached
- selectors used
- number of visible posts
- number extracted
- number classified as service-lead candidates
- screenshots or DOM excerpts where safe

Do not spam, auto-comment, or post.

### Task O1.3 — Source health report
Create one report:

```text
ops/openclaw/reports/source_health_YYYYMMDD_HHMM.md
```

Required sections:
- observed reality
- source-by-source status
- root cause candidates ranked by evidence
- exact fixes needed
- files/scripts touched: none unless explicitly changed

## Phase 2 — Website funnel browser audit

### Task O2.1 — Live browser pass
Open:
- https://handyandfriend.com/
- https://handyandfriend.com/book
- https://handyandfriend.com/pricing
- https://handyandfriend.com/services

Check mobile and desktop:
- call CTA visible/clickable
- WhatsApp/Messenger visible/clickable if present
- chat widget visible
- chat widget opens
- first message sends
- console errors
- tracking snippets visible where expected

Evidence required:
- screenshots
- URL
- viewport
- exact observed issue
- no assumptions

### Task O2.2 — Alex frontend behavior
Ask Alex only safe synthetic questions:

1. "How much is TV mounting?"
2. "Can you help with drywall repair in Hollywood?"
3. "Do you do electrical panel work?"
4. "Can you come today?"
5. "I need a quote for painting, I have photos."

Acceptance:
- mentions Handy & Friend contact correctly when appropriate
- no licensed/certified/bonded claims
- no exact quote when scope unknown
- asks for photos/ZIP/timing where needed
- escalates licensed/specialized work

Evidence:
- screenshots or copied responses
- mark synthetic test as synthetic

## Phase 3 — Telegram proof / approval loop

### Task O3.1 — Telegram alert path
OpenClaw must not send real client messages. It may verify whether alerts are generated for synthetic/test leads only if the existing test mechanism exists.

Evidence:
- Telegram message ID if sent
- Supabase lead/event ID if created
- exact test marker used
- cleanup status

## Phase 4 — Supabase blocker assistance

OpenClaw may help only by browser-navigation evidence:

1. Open Supabase Dashboard project `taqlarevwifgfnjxilfh` if authenticated.
2. Go to Project Settings / Database / Connection string or Connect.
3. Confirm whether Session Pooler URI is visible.
4. Confirm whether it still contains `[YOUR-PASSWORD]` placeholder.
5. Do NOT expose the password in screenshots/logs.
6. If password unknown, record `BLOCKED: database password not known; reset required by owner in Supabase UI`.

OpenClaw must not paste database secrets into chat, GitHub issues, logs, screenshots, or Markdown reports.

## Phase 5 — Output contract

Every OpenClaw run must produce:

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

## Priority order
1. Supabase connection-string evidence only, no secret exposure.
2. Craigslist scanner dry-run.
3. Nextdoor scanner dry-run.
4. Live website funnel audit.
5. Synthetic Alex QA.
6. Telegram proof path only with synthetic marker.

## Stop conditions
Stop and report if:
- CAPTCHA/auth wall blocks browser automation.
- Any action would publish, message, or spam real users.
- Any secret/password/token becomes visible.
- Supabase password reset is required.
- OpenClaw cannot find expected scripts.

## Coordinator notes
ChatGPT can edit GitHub workflows/runbooks and read GitHub Actions/Vercel evidence, but currently cannot directly operate OpenClaw. OpenClaw must run on Dell and return evidence artifacts.
