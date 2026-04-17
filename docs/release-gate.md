# Release Gate Checklist
**Version:** 1.0
**Date:** 2026-04-17
**Applies to:** every PR targeting `main`

A PR cannot merge unless every single box below is checked in the PR description. The reviewer (Sergii) refuses to merge otherwise — no exceptions. Empty promises in prose do not substitute for the boxes.

---

## 6-Point Checklist (paste into PR description)

```markdown
## Release Gate

- [ ] **Code diff attached** — PR shows the diff, not a link to it
- [ ] **Commit SHA on branch** — paste short SHA + branch name
- [ ] **Live validation run** — paste command + response (curl, psql, grep)
- [ ] **Artifact retained 7+ days** — paste path under `ops/reports/` or note external archive location
- [ ] **Rollback command** — exactly one line, copy-pasteable
- [ ] **Ledger entry updated** — paste the row from `ops/recovery-ledger.md`

## Status Claim

Exactly one of: `PASS | PARTIAL | FAIL | UNKNOWN | SYNTHETIC`

If PARTIAL: enumerate what is NOT done.
If SYNTHETIC: state explicitly "prod not verified".
If UNKNOWN: list the access/data required to verify.

## Forbidden Phrasing Check

- [ ] PR does not contain "fixed everywhere" / "fully unified" / "110% complete" /
      "should work now" / "all green" / "bulletproof" / "production ready"
```

---

## How a PR reviewer uses this

1. Open PR. Scroll to description. Count checked boxes.
2. If fewer than 6: leave review comment with the missing item(s). No merge.
3. If 6: click every link. If any 404s or shows stale output, comment and block.
4. Check the status claim matches the evidence. PARTIAL without an enumeration list = block.
5. Verify the commit SHA in the PR title/body matches `git log` on the branch.
6. If rollback command looks wrong or missing — block.

---

## Why so strict

The prior wave of work claimed 10+ tasks as complete that later turned out to be false. Every false-positive cost an additional audit cycle (~30-90 min of Sergii's time) AND damaged trust between operator and agents. This gate is the cheapest way to refuse that pattern.

Cost of the gate: ~5 minutes per PR to fill the checklist.
Cost of not enforcing it: a week of false claims and rework.

---

## Escape valves

None. Every PR fills the checklist. Even typo fixes. Even one-line doc updates. The discipline is more valuable than the time saved.

Exception would require an ADR in `docs/decisions/`.
