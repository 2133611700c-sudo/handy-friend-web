# GitHub CLI Workflow Run Runbook

Status: ACTIVE

## Goal

Run manual workflows from a terminal when GitHub UI is not convenient.

## Requirements

- GitHub CLI installed: `gh`
- authenticated GitHub session
- repo access with Actions permission

## Run Alex Smoke

```bash
gh workflow run alex-smoke.yml --repo 2133611700c-sudo/handy-friend-web --ref main
```

Then watch the latest run:

```bash
gh run list --repo 2133611700c-sudo/handy-friend-web --workflow alex-smoke.yml --limit 3
gh run watch --repo 2133611700c-sudo/handy-friend-web
```

## Run Supabase SQL Reports

First add repository secret `SUPABASE_DATABASE_URL` in GitHub settings.

Then run:

```bash
gh workflow run supabase-sql-reports.yml --repo 2133611700c-sudo/handy-friend-web --ref main
```

Then download artifacts:

```bash
gh run list --repo 2133611700c-sudo/handy-friend-web --workflow supabase-sql-reports.yml --limit 3
gh run download --repo 2133611700c-sudo/handy-friend-web --name supabase-sql-reports
```

## Rule

A blocker is closed only after raw logs or artifacts are attached to the relevant issue.
