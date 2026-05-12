# Site Health Agent

Status: SPEC READY
Level: L2 GitHub public checks

## Goal
Verify public Handy & Friend routes and health endpoint without Mac, Dell, VPS, secrets, or customer actions.

## Scope
Routes:
- `/`
- `/book`
- `/pricing`
- `/services`
- `/messenger`
- `/api/health`

## Allowed actions
- Public HTTP GET/HEAD checks.
- Record status codes.
- Record response size.
- Save report to `ops/agent-control/reports/`.

## Forbidden actions
- No form submissions.
- No customer messages.
- No auth bypass.
- No secrets.
- No destructive actions.

## Output
Report:

```text
ops/agent-control/reports/site-health-YYYYMMDDTHHMMSSZ.md
```

Required fields:
- route
- status
- result PASS/FAIL
- generated timestamp
- safety note

## Done definition
PASS only if all public routes return expected 2xx/3xx status and `/api/health` returns 200.

## Current implementation strategy
Use a narrow GitHub Actions workflow or an already-proven trigger workflow pattern. If connector safety blocks executable workflow creation, keep this spec and implement through the next allowed narrow workflow patch.
