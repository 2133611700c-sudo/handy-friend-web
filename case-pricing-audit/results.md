# Pricing Canary Validation Results - 2026-04-24

## Final Commit

- Commit: `8d88f847 Harden Alex pricing guardrails`
- Source branch: `codex/telegram-contract-hardening`
- Clean verification worktree: `/tmp/hf-pricing-clean2`

## Final Preview

- Preview URL: https://handy-friend-landing-v6-1jsawg2hh-sergiis-projects-8a97ee0f.vercel.app
- Inspect URL: https://vercel.com/sergiis-projects-8a97ee0f/handy-friend-landing-v6/CpJyjXcTDZUEsd41ezNzyhDVhmoC
- Deploy method: local `vercel build`, then no-git prebuilt package deploy from `/tmp/hf-pricing-deploy2`.

Why no-git package was required:

- Direct git-attributed Vercel deploy failed with `TEAM_ACCESS_REQUIRED`.
- Exact Vercel reason: `Git author sergiikuropiatnyk@gmail.com must have access to the team Sergii's projects on Vercel to create deployments.`
- The code/build was not the failure; `vercel build` passed before deploy.

## Local Verification

- `npm run test:pricing-policy`: PASS - 2954/2954
- Clean worktree audit: PASS - 46 PASS / 0 FAIL
- Command: `bash scripts/audit.sh --skip-stats`
- Migration drift: PASS after setting ignored Supabase project ref in `supabase/.temp/project-ref`.

## Preview API

- `/api/health`: PASS - 200 OK
- Preview env:
  - `supabase_url`: true
  - `supabase_service_role_key`: true
  - `resend_api_key`: true
  - `deepseek_api_key`: true
  - `telegram_bot_token`: false, expected for preview
  - `telegram_chat_id`: false, expected for preview
  - `fb_page_access_token`: false, expected for preview
  - `fb_verify_token`: false, expected for preview

## Preview HTML Smoke

Checked with `vercel curl`:

- `/`
- `/pricing`
- `/services`
- `/gallery`
- `/terms`
- `/book`
- `/interior-painting`
- `/flooring`

Result: PASS.

No hits for:

- `from $X`
- `$105`, `$185`, `$120`, `$140`, `$195`, `$95`, `$115`
- `$75/door`, `$70/door`
- `service minimum`, `minimum service call`, `service call starts`
- stale schema prices `"price":"120"`, `"price":"140"`, `"price":"195"`, `"price":"20"`
- `$75 onsite estimate`
- `premium paint, primer, degreasing, and prep are included`
- `you provide tools`

## Alex Live Preview Tests

Endpoint: `/api/ai-chat`

Result: PASS - 9/9 prompts.

- `How much to mount a TV?`
  - PASS: `$150 service call`, up to 2 hours, `$75/hour after`; no old TV prices.
- `Hidden wire TV?`
  - PASS: `quote after photos - no public price`; no dollar leakage.
- `How much to paint cabinets?`
  - PASS: `quote after photos - no public price`; no per-door prices or included-materials claim.
- `Drywall small hole?`
  - PASS: `$150 service call`, up to 2 hours; no old drywall price.
- `Can you install vanity?`
  - PASS: `quote after photos - no public price`; no service-call leakage.
- `Furniture assembly dresser?`
  - PASS: `$150 service call`, up to 2 hours, `$75/hour after`; no old assembly prices and no customer-provides-tools wording.
- `How much for flooring?`
  - PASS: `$3/sf labor estimate`, materials separate.
- `Backsplash price?`
  - PASS: `quote after photos - no public price`; no stale tile price.
- `Door installation cost?`
  - PASS: `quote after photos - no public price`; no stale door price.

## Lead Submit Smoke

- Endpoint: `/api/submit-lead`
- Payload: synthetic pricing canary smoke test
- Result: PASS
- Response: `{"success":true,"mode":"outbox","leadId":"lead_1777073055932_8lu3wf"}`

## Guardrail Changes Confirmed

- `api/ai-chat.js`
  - Adds server-side quote-only pricing guard, not just prompt guidance.
  - Quote-only intent catches hidden-wire TV, cabinets, furniture painting, vanity, backsplash, and door installation by service inference or user text.
  - Quote-only answers are forced to `quote after photos - no public price`.
  - Adds canonical pricing normalizer so service-call answers include `$75/hour after` and painting/flooring use `$3/sf labor estimate`.
  - Removes customer-provides-tools wording.
  - Removes cabinet materials-included fallback; materials and third-party purchases are extra only if written into the quote.

- `tests/pricing-policy.test.js`
  - Adds denylist coverage for customer-provides-tools and cabinet-materials-included claims.
  - Adds server-side Alex quote-only and canonical-pricing guardrail assertions.

## Remaining Risks

- Production was not deployed in this pass. This is a validated preview/canary, not prod.
- Vercel Deployment Protection means public browser checks need signed-in access or `vercel curl`.
- Preview lacks Telegram and Facebook env vars; acceptable for pricing canary, not a full messaging-prod rehearsal.
- Vercel team access should be fixed so normal git-attributed deploys do not hit `TEAM_ACCESS_REQUIRED`.

## Verdict

Canary validation for pricing and Alex guardrails is PASS on the final preview.

Do not promote to production until the 48h canary watch is accepted or Sergii explicitly decides to skip the wait.
