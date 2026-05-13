# Repo Audit Skill

## Purpose

Run read-only repository checks and produce findings without source changes.

## Allowed actions

- File discovery and grep scans
- Workflow/script syntax checks
- Security pattern scan (no secret output)
- Dependency and config integrity checks

## Forbidden actions

- Source code modifications (except report output)
- Force push
- Secret exposure

## Report requirements

- Findings list with severity
- Exact file references
- Reproduction commands
- Safe next action
