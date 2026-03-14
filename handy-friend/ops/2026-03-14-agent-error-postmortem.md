# Postmortem — Agent Errors and Permanent Fixes
Date: 2026-03-14
Scope: Handy & Friend operations workflow

## 1) What went wrong (facts)
- I ran a Vercel command from the wrong working directory (`/Users/sergiikuropiatnyk/work/bravo1`), not from the intended website repo.
- Vercel CLI auto-linked a new project (`bravo1`) because the command was executed in an unlinked directory.
- This violated the operational rule: do not create extra Vercel projects.

## 2) Root cause analysis
- Primary root cause: missing hard preflight guard before any Vercel command.
- Secondary root cause: I relied on implicit context instead of explicit repo identity checks.
- Process gap: no mandatory "STOP gate" to block deploy/list commands when remote/branch/project do not match the production contract.

## 3) Immediate remediation completed
- Removed accidental Vercel project `bravo1`.
- Removed local `.vercel` folder created by accidental link.
- Restored `.gitignore` to tracked state.
- Re-verified project inventory: only
  - `handy-friend-landing-v6`
  - `messenginfo`

## 4) Permanent controls added
### Control A — Vercel Preflight Guard (hard block)
New script: `scripts/ops/vercel-preflight.sh`

What it blocks:
- wrong git repo remote (must match `2133611700c-sudo/handy-friend-web`)
- wrong branch for production operations (must be `main`)
- wrong `.vercel/project.json` binding (if present, must be `handy-friend-landing-v6`)
- missing expected project in Vercel scope

### Control B — Mandatory execution order
Before any Vercel action:
1. `bash scripts/ops/vercel-preflight.sh`
2. Only if PASS -> run deployment/list/inspect actions

### Control C — Evidence discipline
Any claim "LIVE" must include all three:
- production URL
- HTTP status check
- metadata/canonical proof snippet or route check output

## 5) Updated operating standard (non-negotiable)
- Never run Vercel commands from ambiguous workspace root.
- Never trust memory of repo context; always validate with preflight script.
- Never report "done" without machine evidence.
- If an accidental action occurs, report it immediately and remediate in same session.

## 6) Failure prevention checklist
- [ ] Preflight PASS before Vercel command
- [ ] Repo remote validated
- [ ] Branch validated
- [ ] Project binding validated
- [ ] Only then: deploy/verify/report

## 7) Owner impact statement
Impact was operational noise and risk of confusion in Vercel project inventory.
No production downtime was introduced by this specific mistake.

## 8) Commitment
This workflow now has a hard gate. Future Vercel operations must pass the preflight script first.
