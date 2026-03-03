# Alex Unification Audit (Phone-First + No Contradictions)

Date: 2026-03-02
Project: /Users/sergiikuropiatnyk/handy-friend-landing-v6

## Phase 1 — Audit Findings

1. **Material policy conflict**
   - Risk: AI could state flooring includes materials.
   - Cause: prompt did not strictly ban this claim for non-cabinet services.

2. **Contact gate mismatch**
   - Risk: lead capture could happen with email-only while pricing gate requires phone.
   - Cause: `createLead()` accepted phone OR email.

3. **Cross-sell duplication**
   - Risk: duplicated “also we can…” lines in final response.
   - Cause: post-processor appended cross-sell even when AI already did.

4. **Legacy prompt drift risk**
   - Risk: old v8 rules diverge from one-truth behavior.
   - Cause: legacy file still present.

## Phase 2 — Implemented Fixes

1. **Single-source prompt hardened** (`lib/alex-one-truth.js`)
   - Added strict rule: phone mandatory for pricing.
   - Added strict material policy:
     - Cabinet painting full package includes materials.
     - Flooring/interior/furniture assembly/mounting/plumbing/electrical = labor-only.
     - Client provides and purchases materials for non-cabinet services.
     - Explicit ban: never say flooring includes materials.

2. **Runtime phone-only capture alignment** (`api/ai-chat.js`)
   - `createLead()` now requires `service + phone`.
   - Conversation inference now captures lead only when phone exists.
   - Telegram lead contact line now uses phone as primary captured contact for AI-chat leads.

3. **Cross-sell dedup guard strengthened** (`api/ai-chat.js`)
   - Added multi-language duplicate detection markers (`also`, `также`, `також`, `tambien`).

4. **Legacy drift reduced**
   - Prompt source remains `alex-one-truth.js` only.
   - Legacy module kept for helper compatibility only.

## Phase 3 — Expected Behavior After Fix

- Before phone: no prices/ranges/calculations.
- After phone: pricing is allowed, then delivery method + email follow-up.
- Non-cabinet services: always labor-only materials policy.
- No duplicate cross-sell line.

## Quick Validation Checklist

- [ ] Ask flooring price without phone -> no dollar amount; asks phone.
- [ ] Ask flooring materials question -> says labor-only/client supplies materials.
- [ ] Give phone -> pricing appears.
- [ ] Response has no repeated cross-sell sentence.
- [ ] RU/ES flows keep same policy semantics.
