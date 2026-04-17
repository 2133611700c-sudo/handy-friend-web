<!--
Every PR must fill every box below. See docs/release-gate.md and docs/claim-policy.md.
Reviewer refuses to merge if any box is missing or if any forbidden phrasing appears.
-->

## Task

Task ID from `ops/recovery-ledger.md`: <!-- e.g. 1.1 -->
Branch: <!-- agent-a/reliability or agent-b/data-tests-tracking -->
Owner: <!-- Agent A or Agent B or Sergii -->

## Status Claim

<!-- Exactly ONE of: PASS | PARTIAL | FAIL | UNKNOWN | SYNTHETIC -->

**Status:**

If `PARTIAL`: list what is NOT done.
If `SYNTHETIC`: state explicitly "prod not verified".
If `UNKNOWN`: list the access / data required to verify.

## Release Gate

- [ ] Code diff attached (visible in PR's Files Changed tab)
- [ ] Commit SHA on branch: <!-- short sha -->
- [ ] Live validation run: paste command + response below
- [ ] Artifact retained 7+ days: paste path under `ops/reports/` or note external location
- [ ] Rollback command: one line, copy-pasteable
- [ ] Ledger row updated: paste the line from `ops/recovery-ledger.md`

## Evidence

<!-- Paste curl command + output, SQL + results, grep + hits, screenshots.
     See docs/claim-policy.md "How to cite evidence" for templates. -->

### Live endpoint / SQL / grep output


### Artifact location


### Rollback command


### Ledger line (paste row from ops/recovery-ledger.md)


## Forbidden Phrasing Check

- [ ] PR description does NOT contain any of: "fixed everywhere", "fully unified",
      "110% complete", "production ready", "should work now", "all green",
      "комплексно решено", "bulletproof", "across the board"

## Scope Control

- [ ] PR only touches files in the branch owner's column per `ops/recovery-ledger.md`
- [ ] No unrelated refactors bundled with the task fix
- [ ] No new monitoring / dashboards added unless task explicitly requires them

## Legacy DoD (still required)
- [ ] No prices hardcoded outside `lib/price-registry.js`
- [ ] No new dependencies or frameworks added
- [ ] No secrets, API keys, or tokens in code
- [ ] No `console.log` in production files (`api/`, `lib/`)
- [ ] Mobile responsive (tested at 375px)
- [ ] Contact info matches verified: (213) 361-1700, handyandfriend.com
