# GitHub Actions Secrets Setup

Status: ACTIVE

## Goal

Enable manual SQL report automation without exposing database credentials.

## Required secret

- `SUPABASE_DATABASE_URL`

## Where to add

GitHub repository → Settings → Secrets and variables → Actions → New repository secret.

## Used by

- `.github/workflows/supabase-sql-reports.yml`

## Verification

After adding the secret, run the manual workflow:

- `Supabase SQL Reports`

Expected result:

- workflow runs without missing `DATABASE_URL` error;
- artifacts are uploaded under `supabase-sql-reports`;
- raw outputs are available for SQL reports.

## Safety rules

- Do not commit the database URL to the repository.
- Do not print full secrets in logs.
- Use GitHub encrypted secrets only.
