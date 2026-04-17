# Claim Policy
**Version:** 1.0
**Date:** 2026-04-17
**Source:** `ops/recovery-plan-v2.md` section 1
**Binding:** every agent PR, every ledger update, every external report

---

## Why this document exists

A prior remediation wave closed dozens of tasks as "PASS" that later turned out to be false:
- "Unified Telegram sender" — actually 15 of 16 paths still bypassed.
- "10/10 PASS" — on is_test=TRUE rows that the test script itself deleted.
- "17/17 pages tracked" — 2 pages missing Meta Pixel.
- "followup_queue view recreated" — the view was dropped and never restored.

Each of those claims was unsupported by the evidence the author had on hand. This policy exists so future claims can be refuted by anyone reading the ledger in under 5 minutes.

---

## Allowed status labels

Exactly one of the following must appear on every ledger row and every PR description:

| Status | When to use | Required evidence |
|---|---|---|
| `PASS` | Behaviour works on real/prod data. | Live endpoint response **+** SQL row from prod **+** file:line pointer |
| `PARTIAL` | Works in N of M paths. | Exact list: fixed in X/Y/Z; NOT fixed in A/B/C |
| `FAIL` | Behaviour does not work. | HTTP error code, error message, repro command |
| `UNKNOWN` | No evidence available to verify. | Reason **+** the access or data needed for verification |
| `SYNTHETIC` | Works only on test/synthetic traffic. | Direct statement: "verified only synthetically; prod not proven" |
| `BLOCKED_ON_<task>` | Waiting on another task. | Target task id; must be a real task in the ledger |
| `READY` | Unblocked, not yet started. | n/a |
| `IN_PROGRESS` | Actively being worked on. | Assignment timestamp in a dedicated commit |
| `DONE` | Committed on agent branch, not yet merged. | Branch commit SHA |

## Forbidden phrasing

Any of these in a PR description, ledger entry, commit message, or status report automatically invalidates the claim. The reviewer must reject without re-reading.

- "fixed everywhere"
- "fully unified"
- "110% complete"
- "production ready"
- "should work now"
- "all green"
- "комплексно решено"
- "best-in-class"
- "bulletproof"
- "across the board"

---

## How to cite evidence

### Live endpoint
Paste the exact `curl` command and the response. Truncate body if longer than 20 lines but keep status line and headers of interest.

```
$ curl -sSI https://handyandfriend.com/api/notify -X POST -d '{}' -H 'Content-Type: application/json'
HTTP/2 503
content-type: application/json
{"success":false,"error":"notify_disabled"}
```

### SQL
Paste the SELECT statement and at least:
- Row count, or
- A small sample (≤5 rows) with the evidence column visible.

```
$ psql -c "SELECT count(*) FROM telegram_sends WHERE created_at > now() - interval '24h';"
 count
-------
    12
```

### Code
File path + line number + ≤3-line excerpt.

```
api/health.js:60
  const cronSecret = process.env.VERCEL_CRON_SECRET || '';
  const auth = String(req.headers.authorization || '');
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
```

### Grep
Paste the `grep` command and every matching line. If output exceeds 50 lines, paste the count plus the first 20.

```
$ grep -rn "event_payload" api/ lib/
api/health.js:493:        lead_events?select=event_type,event_payload,...
api/health.js:545:      fetchSupabase(config, `lead_events?select=event_type,event_payload,...
lib/conversation.js:83:    : (events[0]?.event_payload?.raw_text || ...);
```

### Screenshot
If the evidence is a UI view (Google Ads, GBP, Vercel logs), save the PNG under `ops/reports/<YYYY-MM-DD>-<task>/` and reference the path in the ledger entry. Include the timestamp and the element visible.

### Rollback command
Every closure must state exactly one rollback command. Examples:
- `git revert <sha>`
- `supabase db reset --to <migration_id>`
- `vercel env rm HF_NOTIFY_SECRET production`

No rollback command = the task is not closable.

---

## Evidence lifetime

All artifacts referenced in a closure must be retained for at least **7 days** after the PR merges. Artifacts under `ops/reports/` are committed to the repo. External artifacts (Vercel logs, Supabase dashboard screenshots) must be saved to `ops/reports/` locally.

---

## Enforcement

1. Reviewer (Sergii) refuses to merge any PR that:
   - Uses forbidden phrasing, or
   - Cites a status without the matching evidence template, or
   - Lacks a rollback command.
2. Agents refuse to start a task whose prerequisites include a `BLOCKED_ON_<X>` where `<X>` is not yet `PASS`.
3. Ledger is the last word. If a PR and the ledger disagree, fix the ledger in the same PR.

---

## Worked example — correct closure of Task 1.1 (hypothetical)

> **Status:** PASS
> **Evidence:**
> - Live endpoint:
>   ```
>   $ curl -X GET https://handyandfriend.com/api/process-outbox -H "Authorization: Bearer $CRON_SECRET"
>   HTTP/2 200
>   {"processed": 6, "sent": 6, "errors": 0}
>   ```
> - SQL:
>   ```
>   $ psql -c "SELECT status, count(*) FROM outbound_jobs GROUP BY status;"
>    status | count
>   --------+-------
>    sent   |    10
>   ```
> - Grep proof of auth change: `grep -n "Authorization" api/process-outbox.js:78-82`
> - Rollback: `git revert <sha>`
> - Commit SHA on main: `<sha>`
> - Artifact: `ops/reports/2026-04-18-task-1.1/logs.txt`

---

## Worked example — correct PARTIAL closure

> **Status:** PARTIAL (5 of 5 API files, 0 of 1 lib path)
> **Evidence:**
> - Migrated: `api/ai-chat.js:540+`, `api/ai-intake.js:53`, `api/alex-webhook.js:472+497+505`, `api/process-outbox.js:475+593`, `api/notify.js` (already via unified)
> - NOT migrated: `lib/lead-pipeline.js:1112,1303` — reason: this module is called from multiple contexts including photo multipart uploads the unified sender does not yet support. Tracked as Task 1.5-follow-up.
> - Live: `grep -rn "api.telegram.org" api/ | grep -v "send.js" | wc -l` → `0`
> - Live: `grep -rn "api.telegram.org" lib/lead-pipeline.js | wc -l` → `2`
> - Rollback: `git revert <sha>`
