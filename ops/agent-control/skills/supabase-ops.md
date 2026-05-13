# Supabase Ops Skill

## Scope

Safe operational DB/report verification without destructive SQL or PII leaks.

## Use scripts

- `scripts/check-supabase-infra.sh`
- `scripts/check-supabase-schema-contract.sh`
- `scripts/run-supabase-business-reports.sh`

## Rules

- Read-only first
- No destructive SQL
- Redact DSN and credentials
- No customer PII in committed evidence
- `BLOCKED` when required secret missing

## Output

- Run IDs, artifact names, status classification
- Remediation path for non-PASS
