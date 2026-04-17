# ADR-0001: Adopt Parallel Agent Workflow with Strict File Ownership
**Date:** 2026-04-17
**Status:** Accepted
**Deciders:** Sergii (owner)
**Supersedes:** none

---

## Context

Between 2026-04-14 and 2026-04-17 an internal Claude Code session plus an external Codex forensic audit produced 20+ PRs and migrations. A post-wave self-audit discovered that roughly 40% of those closures were false — infrastructure was built for synthetic traffic, tests validated themselves, and seven "PASS" items were later re-classified `PARTIAL` or `FAIL` after the fact.

Root causes were not purely technical:

1. **No claim discipline.** "Fixed everywhere" was used with no evidence.
2. **No ledger.** Work graph existed only in chat transcripts.
3. **No file ownership.** The same file was edited by multiple sessions that each assumed the other hadn't touched it.
4. **No release gate.** Commits reached `main` without repeatable live validation.
5. **No traceability after merge.** Rollback commands were rarely stated.

The solution has to be cultural (how claims are expressed) AND structural (who can edit what).

## Decision

Going forward, the recovery work adopts a **two-agent parallel workflow** with the following invariants:

1. **Two working branches:**
   - `agent-a/reliability` — owned by Agent A (Claude Code). Scope: `api/*` runtime, `lib/telegram/send.js`, `vercel.json` cron section.
   - `agent-b/data-tests-tracking` — owned by Agent B (Codex). Scope: `supabase/migrations/*`, `scripts/e2e_*.py`, `scripts/regression_*.py`, tracking inject, HTML landing pages.

2. **`main` is protected.** Merges happen only via PR reviewed by Sergii. Force-push is forbidden on all three branches.

3. **File ownership is strict.** An agent cannot touch a file outside its column. Conflict is recorded in `ops/recovery-ledger.md` under "Open Risks" instead of being resolved through direct edit.

4. **Claim Policy (see `docs/claim-policy.md`) is binding.** Every task closure names exactly one of {`PASS`, `PARTIAL`, `FAIL`, `UNKNOWN`, `SYNTHETIC`} and attaches trio-evidence: commit SHA + live validation output + artifact path.

5. **Release Gate (see `docs/release-gate.md`) is binding.** Six checkboxes in every PR; fewer = no merge.

6. **Recovery Ledger (`ops/recovery-ledger.md`) is the single source of truth.** Every agent reads it before starting, updates it atomically after finishing.

## Consequences

### Positive
- False closures become harder: they require fabricating both the evidence output AND the ledger entry.
- Work graph is inspectable in under 5 minutes by anyone who has git access.
- File conflicts surface earlier (via ownership rule) rather than during merge.
- Rollback is always available because every closure states its rollback command.

### Negative
- Coordination overhead: Sergii merges sequentially, not in parallel. Agent B sometimes waits on Agent A's merge (e.g. Task 1.3 before 1.4).
- More commits (one per IN_PROGRESS → DONE flip per task) clutter `git log`.
- Cross-cutting refactors are harder to land. Tracked in `docs/decisions/` when they happen.

### Neutral
- PR descriptions are longer. Owners spend ~5 min per PR filling the gate.
- A task that genuinely requires two files from different owners must be split into two coordinated tasks.

## Alternatives considered

### A. Single agent working on `main` directly.
Rejected. This is the state that produced the false closures in the first place.

### B. Feature flags for every change, no branch hygiene.
Rejected. The problem was not about deploying risky code — it was about making false claims. Feature flags don't fix that.

### C. External PR reviewer (human only, no agent).
Rejected. Sergii is the only human available. The gate formalizes what a careful human reviewer would already demand.

## Rollback plan for this ADR

If after two weeks the parallel-agent discipline costs more than it saves (measurable by time-to-merge for simple fixes), revert to single-agent on `main` with one person attending. Record a new ADR that supersedes this one.

## Related documents

- `ops/recovery-ledger.md`
- `docs/claim-policy.md`
- `docs/release-gate.md`
- `ops/recovery-plan-v2.md` (canonical plan if canonicalized by Sergii)
- `ops/reports/2026-04-17-critical-audit/AUDIT.md` (evidence that motivated this ADR)
