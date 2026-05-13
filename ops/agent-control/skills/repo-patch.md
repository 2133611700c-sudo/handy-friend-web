# Repo Patch Skill

## Purpose

Apply small scoped patches with verification and evidence.

## Allowed

- Safe scoped patch in approved files
- Docs/status/report updates
- Tests/scripts updates
- Non-customer-facing safety fixes

## Forbidden

- Force push
- Secrets
- Paid ads changes
- Customer messages
- DNS/account/billing changes
- New `api/*.js` without approval
- Validate workflow experiments

## Must run

- Syntax checks for changed scripts
- Relevant tests for impacted scope
- Vercel readiness check when deploy-impacting
