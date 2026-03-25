# Full Integrity Audit (GitHub + Vercel + Site + Alex)
Date: 2026-03-25 (America/Los_Angeles)

## 1) Audit Prompt Used (Self-Check Prompt)
"Run a zero-trust integrity audit over GitHub CI, Vercel production linkage, live site behavior, and Alex policy compliance. Treat every prior claim as untrusted. For each assertion, classify as CONFIRMED / INFERRED / UNCONFIRMED. Flag stale assumptions, brittle checks, and nondeterministic validations. Reject checks that can pass/fail due to tool variance instead of business truth."

## 2) Execution Plan
1. Verify repo state and recent CI runs in GitHub.
2. Verify Vercel project linkage, project id, and active production deployments.
3. Re-run local policy tests (pricing + attribution).
4. Re-run production readiness audit script against live site.
5. Validate critical routes/redirects and health contract on production.
6. Probe Alex with a multi-scenario API test set (pricing, discount requests, contact capture, language).
7. Detect stale-price leakage in live HTML for service pages.
8. Compare prior claims against fresh evidence to detect hallucinations.
9. Patch broken audit logic that creates false negatives.
10. Re-run Validate Site workflow and confirm green status.

## 3) Findings

### GitHub
- CONFIRMED: `Validate Site` latest run succeeded.
  - Run: `23528431066` (success)
- CONFIRMED: Prior run failed for a real check mismatch, then fixed.
  - Failed run: `23528079465` (failure)
  - Fixed by later commits and green runs.
- CONFIRMED: Open PRs exist and are not the release path (main push path is active).

### Vercel
- CONFIRMED: Canonical project linkage is correct.
  - project name: `handy-friend-landing-v6`
  - project id: `prj_cB1RFa7bfSuWpuhBZs76UiYvTLzg`
- CONFIRMED: Production alias points to `https://handyandfriend.com` and is attached to latest ready deployment.
- CONFIRMED: Multiple recent production deployments are `Ready`.

### Live Site
- CONFIRMED: Core routes return expected 200.
  - `/`, `/pricing`, `/privacy`, `/terms`, `/api/health`, `/r/one-tap/`
- CONFIRMED: Redirects valid.
  - `/fb` -> Facebook (301/302 acceptable)
  - `/review` -> Google review URL (currently 301)
- CONFIRMED: Tracking IDs present on required pages.
  - `G-Z05XJ8E281`, `GTM-NQTL3S6Q`, `AW-17971094967` checks pass in CI gate.
- CONFIRMED: No legacy price leakage pattern `$155/$165/$175` in public pages checked by gate.

### Alex (api/ai-chat)
- CONFIRMED: TV pricing responses use current anchors (`$150`, `$185`), no `$105` observed in sampled runs.
- CONFIRMED: Discount request handling rejects 20% discount claims.
- CONFIRMED: Email-only capture sets `contact_captured=true`.
- CONFIRMED: Phone capture sets `leadCaptured=true` when expected.
- CONFIRMED: Spanish response path works with current pricing anchors.
- INFERRED: Model response shape is semantically correct but text phrasing is nondeterministic; assertion strategy must avoid brittle exact wording checks.

## 4) Hallucination / Error Self-Audit

### Confirmed Errors Found
1. Stale audit expectation in `scripts/audit.sh` expected old TV anchor `$105` after policy moved to `$150`.
2. Redirect check was too strict (`302` only) while production validly returns `301` for `/review`.
3. Audit script depended on `rg` availability; CI runner can lack `rg`, causing noisy false negatives.
4. `audit.sh` ran `workflow:validate` without CI flags, mixing workstation-only checks into prod-readiness local runs.

### Fixes Applied
- Commit `63d8108`:
  - Accept `301|302` redirect checks.
  - Update AI price anchor check to current policy (`$185` present, stale `$105` absent).
  - Add `grep` fallback when `rg` is unavailable.
- Commit `861b58a`:
  - Run `workflow:validate` in CI mode inside `audit.sh` for deterministic prod-readiness semantics.

### Current Risk Level
- GitHub CI Gate: LOW
- Vercel Linkage Drift: LOW
- Live Price Policy Drift: LOW-MEDIUM (requires periodic re-check because content edits can regress)
- Alex Response Determinism: MEDIUM (LLM phrasing variance; policy-level assertions remain stable)

## 5) Final Integrity Status
- CONFIRMED: End-to-end release path is operational and green (`Validate Site` success).
- CONFIRMED: Vercel + production aliases are correctly bound.
- CONFIRMED: Alex behavior aligns with updated minimum-call strategy in sampled tests.
- UNCONFIRMED: Full conversational edge-case space for Alex (only scenario sample tested, not exhaustive formal verification).
