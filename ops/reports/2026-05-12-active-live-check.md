# Active Live Check — 2026-05-12

Status: PARTIAL / EVIDENCE-GATED
Scope: Active checks available without Dell/VPS runner and without Supabase Postgres secret.

## VERIFIED

### Live homepage

URL:

```text
https://handyandfriend.com/
```

Result:

```text
HTTP 200 OK
server: Vercel
x-vercel-cache: HIT
```

### Live API health

URL:

```text
https://handyandfriend.com/api/health
```

Result:

```json
{
  "ok": true,
  "status": "healthy",
  "service": "handy-friend-api",
  "runtime": { "region": "iad1", "env": "production" },
  "checks": {
    "supabase_url": true,
    "supabase_service_role_key": true,
    "telegram_bot_token": true,
    "telegram_chat_id": true,
    "resend_api_key": true,
    "sendgrid_api_key": false,
    "fb_page_access_token": true,
    "fb_verify_token": true,
    "deepseek_api_key": true
  }
}
```

Interpretation:
- API is alive.
- Supabase/Telegram/Resend/Facebook/DeepSeek envs are configured.
- SendGrid is not configured, but Resend is configured, so SendGrid false is not a blocker unless SendGrid is expected.

## FAILED / POLICY DRIFT FOUND

These findings came from the live homepage HTML and repo search.

### F1 — Unverified insurance claim appears publicly

Observed public strings include:
- `Insured.` in meta/OG/Twitter descriptions.
- FAQ question: `Are you insured?`
- FAQ answer: `Yes — we carry General Liability Insurance.`

Risk:
- `insured` is not listed as a verified claim in `rules-registry.yaml`; it is listed under unverified claims.
- Public claims should not use unverified claims unless proof is added and rules-registry is updated.

Required fix:
- Remove insurance wording from meta/OG/Twitter and FAQ, OR add verified proof and update canonical registry.

### F2 — Public email mismatch

Observed:

```text
hello@handyandfriend.com
```

Canonical verified email:

```text
2133611700c@gmail.com
```

Required fix:
- Replace public JSON-LD/footer/mailto contact email with canonical verified email, unless `hello@handyandfriend.com` is fully verified as routed/working and added to rules-registry.

### F3 — Working hours drift

Observed:
- JSON-LD opening hours: `08:00` to `19:00`.
- Public copy: `8am-7pm`.

Canonical rules:
- Mon-Sat `08:00` to `20:00` America/Los_Angeles.

Required fix:
- Align public hours to `8am-8pm` or update canonical rules if 7pm is now policy.

### F4 — Old legal/price copy

Observed:

```text
minor handyman jobs under $500 labor
```

Risk:
- Canonical rule is unlicensed single-job limit under $1,000 labor + materials combined, warning at $900.
- `$500 labor` creates internal/public inconsistency.

Required fix:
- Replace with safe public copy: `minor handyman jobs within California handyman limits; permitted or trade-regulated work is referred out`.

### F5 — Overpromising quote speed

Observed:

```text
Get Your Quote in 2 Min
```

Risk:
- Canonical SLA response target is 15 minutes, not 2 minutes.

Required fix:
- Replace with `Get Your Quote Request` or `Get Your Quote Started`.

### F6 — Unverified experience claim

Observed:

```text
12+ years fixing LA homes
```

Risk:
- This is a specific experience claim. If not documented, remove or verify.

Required fix:
- Replace with `small local team with direct service` unless proof exists.

### F7 — Warranty conflict

Observed:
- FAQ: `We stand behind our work for 1 year.`
- Done-right Promise: `tell us within 7 days`.

Risk:
- Conflicting warranty promises.

Required fix:
- Standardize to one policy. Safer immediate copy: `Tell us within 7 days if something in the agreed scope is not right, and we will schedule a touch-up at no extra labor charge.`

### F8 — Placeholder review risk

Observed:
- `Sample Customer Experiences`
- fake-looking named review cards with stars/names/dates.

Risk:
- Business context says reviews are not yet verified. Fake-style review cards can reduce trust and create platform/compliance risk.

Required fix:
- Replace with `Example project scenarios` without names/stars/dates, or remove until real reviews exist.

## BLOCKED

### B1 — VPS/OpenClaw execution

Blocked because no self-hosted VPS runner is online yet.

Required runner labels:

```text
self-hosted, linux, x64, openclaw, handy-friend
```

### B2 — Supabase SQL reports

Blocked because `SUPABASE_DATABASE_URL` still needs a real Supabase Postgres URI. Do not guess password. Do not log secret.

## NEXT ACTIONS

1. Patch public copy drift in `index.html` and affected service pages.
2. Re-run Validate Site.
3. Live fetch homepage and affected routes again.
4. Only after VPS runner exists: run `openclaw-vps-smoke.yml`, then browser audit.

## RISK CONTROL

- No customer messages sent.
- No secrets touched.
- No destructive changes.
- Findings are evidence-gated and must be fixed by exact copy patches.
