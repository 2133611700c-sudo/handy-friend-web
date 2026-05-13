# Supabase SQL Contract

This folder defines a versioned schema contract for lead ops reporting.

## Files

- `generated-inventory.json`: auto-generated evidence snapshot from SQL and scripts.
- `lead_operational_view.v1.yaml`: curated, versioned contract used by gates.

## Policy

- `v1` must not be silently changed in a breaking way.
- Breaking changes require a new contract version (`v2`, etc.).
- `generated-inventory.json` is evidence only; curated YAML is the runtime source for schema gate.
- Infra/schema gates may only return `PASS`, `FAIL`, or `BLOCKED`.
- `DEGRADED` is allowed only for business reports after infra+schema `PASS`.
