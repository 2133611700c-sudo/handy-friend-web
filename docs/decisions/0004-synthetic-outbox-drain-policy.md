# ADR-0004: Synthetic Outbox Drain Policy
**Date:** 2026-04-17
**Status:** Accepted
**Deciders:** Sergii (explicit assignment of Task A1 to Agent A)
**Related:** ADR-0002 (Task 1.1 forward), ADR-0003 (manual drain)

---

## Context

CI `Validate Site / validate` blocks PRs when `scripts/audit.sh` sees live prod `/api/health?type=outbox` return anything other than `ok:true`. The check is tautological: `ok:true` is satisfied whenever `queue_depth=0 AND slo_breached=false`, regardless of **how** the queue became empty.

On 2026-04-17, during the Task 1.1 cycle, 12 `ga4_event` rows were stuck in `status=queued` because the cron endpoint was returning 403. Task 1.1 fixed the auth — but Task 1.1 itself could not be merged because the same stuck queue was flunking CI. ADR-0003 documented a one-time manual drain to break the chicken-and-egg.

The drain cleared the queue but it did so by **marking rows `status=failed`, not by dispatching the events to GA4**. The delivery never happened. This is operationally fine for those specific rows (they are synthetic probes — see below) but it is **not** the same as "queue drained successfully". Any future report or audit that treats the two as equivalent is dishonest.

This ADR exists to put a crisp boundary around the 12 rows and document the explicit truth.

## Identity of the 12 rows

All 12 share `last_error = "drained_2026-04-17_ci_deadlock_adr_0003_pre_task_1_1_deploy"`. Live verification (2026-04-17 post-PR-19 merge):

```
curl -sS -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  "$SB_URL/rest/v1/outbound_jobs?select=id&status=eq.failed&last_error=eq.drained_2026-04-17_ci_deadlock_adr_0003_pre_task_1_1_deploy" \
  -H "Prefer: count=exact"
# → content-range: 0-11/12
```

Every row:
- `job_type = ga4_event`
- `payload.source = "website_chat"`
- `payload.value = 100` — the sentinel value used by `scripts/e2e_alex_telegram.py` and `scripts/regression_alex.py`
- `payload.lead_id` follows the pattern `lead_<unix_ms>_<rand6>` — the website-chat synthetic lead id shape produced by my e2e/regression runs
- timestamps clustered in 06:17–09:44 UTC of 2026-04-17, coinciding with my verification runs and Agent B's regression runs

None of the 12 reference a real customer-facing interaction. No `telegram_owner` or `resend_owner` rows were touched. The customer-alert path stayed intact.

## Decision

1. **These 12 rows were NOT successfully dispatched to GA4.** Stating otherwise in reports, PR descriptions, or ledger entries is forbidden.
2. **Do NOT replay these 12 rows.** They are test-probe `ga4_event`s; replaying would corrupt GA4 analytics with synthetic conversion events. Retention is archival-only.
3. **Do NOT delete these 12 rows.** They are audit evidence. A future reader tracing the chain of reasoning between Task 1.1 and the CI unblock needs to find them intact with the drain marker.
4. Cleanup comes from the normal test-row retention flow in `scripts/cleanup_test_rows.py` (30-day window, respects `is_test=true` marker). These rows will become eligible for cleanup on 2026-05-17 at earliest.
5. **Future reliability-caused drain events must use a new, distinctive `last_error` marker** so they are greppable separately from this incident. Never reuse `drained_2026-04-17_*` for a different incident.

## Non-decisions (explicit to prevent future drift)

- This ADR does not authorize manual drains for `telegram_owner` or `resend_*` job types. Those carry real customer-facing side effects.
- This ADR does not establish a general "drain when stuck" policy. Each incident needs its own ADR.
- This ADR does not change the outbox retry behavior. Existing backoff tiers in `api/process-outbox.js:27-32` are untouched.

## Follow-up obligations

- Task A2 (scripts/audit.sh): audit must warn or fail explicitly when `queue_depth=0` coexists with `failed_count > 0` and no recent successful dispatch evidence. Addressed in ADR-0004 §Risk.
- The `ok:true` signal from `/api/health?type=outbox` must NOT be the sole gate for "outbox healthy". The accompanying `metrics` field (grouped by status) must be consulted.

## Risk explicitly named

**Risk:** "queue_depth=0" alone is not delivery proof. A fully broken dispatch pipeline where every job immediately moves to `failed` would pass the current audit. This is structural CI weakness, not a code bug.
**Mitigation:** Task A2.
**Severity until A2 lands:** MEDIUM. We have low real-traffic volume (0 website_chat leads / 7d), so a broken pipeline would be hard to detect from metrics alone.

## Rollback

This ADR documents an action already taken; rollback for this ADR means "retract the policy statements here", which is orthogonal to the 12 rows themselves. To rollback the rows (un-fail them):

```
curl -sS -X PATCH \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  "$SUPABASE_URL/rest/v1/outbound_jobs?last_error=eq.drained_2026-04-17_ci_deadlock_adr_0003_pre_task_1_1_deploy" \
  -d '{"status":"queued","last_error":null,"attempts":0}'
```

This should ONLY be executed by Sergii after explicit review, because it would expose synthetic `value=100` conversion events to GA4.
