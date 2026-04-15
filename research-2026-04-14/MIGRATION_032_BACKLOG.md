# Migration 032 — Social Leads Promote Columns — BACKLOG DECISION
**File:** `supabase/migrations/20260410120000_032_social_leads_promote_columns.sql`
**Status:** 🟡 **DEFERRED — future work, zero runtime impact**
**Decided:** 2026-04-14 (Phase 3 Block C), re-confirmed 2026-04-15 (Phase 4 Block E.4)
**Decider:** Claude Opus 4.6 (1M ctx) after live DB verification

---

## What the migration adds

Four columns on `public.social_leads`:

| Column | Type | Default | Purpose |
|---|---|---|---|
| `source_post_id` | text | NULL | Dedup key for a single post across scans |
| `source` | text | NULL | Source platform label (`facebook`, `nextdoor`, `craigslist`) |
| `promoted_to_leads` | boolean | `false` | Marker: social row was moved into `public.leads` |
| `promoted_lead_id` | text | NULL | Foreign ID into `public.leads.id` after promotion |

Plus two indexes:
- `idx_social_leads_source_post_id`
- `idx_social_leads_promoted_to_leads`

---

## Live DB state (verified 2026-04-14, Supabase REST API)

| Column | Exists in prod? | Used by code? |
|---|---|---|
| `source_post_id` | ✅ YES (added by an earlier migration, not 032) | ✅ YES — `social_scanner.py` writes it, `promote_social_leads.py` reads it for dedup |
| `source` | ✅ YES (added by an earlier migration) | ✅ YES — set to `facebook` / `nextdoor` / `craigslist` at write time |
| `promoted_to_leads` | ❌ NOT PRESENT | ❌ NOT REFERENCED by any script in `scripts/` |
| `promoted_lead_id` | ❌ NOT PRESENT | ❌ NOT REFERENCED by any script in `scripts/` |

**Verification method:** Queried `public.social_leads` schema via Supabase REST with `?select=*&limit=1` and inspected the returned column set. Repeated grep against `scripts/*.py` for the four column names.

---

## Why the code doesn't need the two missing columns

The social→CRM promotion bridge currently tracks promotion status via a different mechanism:

- `scripts/promote_social_leads.py` sets `social_leads.escalation_reason = 'promoted_lead:{leads.id}'` on the source row after inserting into `public.leads`.
- Dedup on re-runs uses the presence of that prefix in `escalation_reason` (LIKE `'promoted_lead:%'`).
- Verification in Supabase: 3 rows with `escalation_reason` starting `promoted_lead:` exist (ids `social_fb_*`, `social_nd_*`). The bridge works and has produced real CRM rows.

The two missing columns (`promoted_to_leads` boolean + `promoted_lead_id` FK) are a **cleaner schema** that would replace the string-pattern convention, but the current convention is stable and observable.

---

## Risks if the migration were applied now

| Risk | Severity | Mitigation |
|---|---|---|
| Supabase DDL adds columns with `DEFAULT false` on `promoted_to_leads` — backfills every row | Low | Backfill is O(rows) on a small table (< 5k social_leads today) |
| Existing `promoted_lead:` escalation_reason rows would NOT auto-populate `promoted_lead_id` | Medium | Requires a backfill UPDATE that parses the escalation_reason string |
| If future code checks only `promoted_to_leads = true` and ignores `escalation_reason LIKE 'promoted_lead:%'`, it will miss 3 historical rows | Medium | Dual-read migration period required |
| Index creation adds write amplification on high-volume scanner | Low | Social leads volume is low (< 100/day) |

---

## Cost of NOT applying it

- **Runtime:** zero. Current code paths ignore the two missing columns.
- **Observability:** marginal. Admins querying `promoted_to_leads = true` get an error, not a silent wrong count. They must use `escalation_reason LIKE 'promoted_lead:%'`.
- **Schema drift between `supabase/migrations/*.sql` and prod:** 2 columns out of 4 in this file. The file will show as "not applied" in a strict migration tracker, but there is no tracker enforcement in this project (migrations are applied via copy-paste to Supabase SQL editor, no `supabase db push`).

---

## What would need to be true to apply it

All three must hold:

1. **A referencing code change is ready** that uses `promoted_to_leads` / `promoted_lead_id` — e.g., a new admin dashboard query, a new CRM view, or a new retry job that skips already-promoted rows.
2. **A backfill SQL script exists** that parses existing `escalation_reason` strings and populates `promoted_lead_id` for historical rows.
3. **A dual-read period is planned** (at least 7 days) where code checks BOTH the old convention AND the new columns, so a rollback is possible.

None of these three are true today. This is why the migration stays in the `supabase/migrations/` directory but is not applied.

---

## Re-evaluate when

- A CRM view for "pending promotion" social leads is requested by the owner.
- An admin needs to filter social_leads by promoted-state programmatically (not just for debugging).
- The social→CRM bridge is rewritten to support retries.

Until then: **do not apply.** The migration file stays as documentation of future intent.

---

## History

- 2026-04-10: migration file created (by an earlier Claude/Codex session)
- 2026-04-14: first forensic audit discovered partial drift (2/4 cols live, 2/4 missing); decision deferred
- 2026-04-15: this doc written to lock the decision in the repo so future agents don't re-apply blindly
