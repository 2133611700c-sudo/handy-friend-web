# Active Route Check — 2026-05-12

Status: VERIFIED / PARTIAL
Scope: Public routes check available without Dell/VPS runner and without Supabase Postgres secret.

## VERIFIED ROUTES

| Route | Result | Notes |
|---|---:|---|
| `/` | 200 | Homepage live on Vercel. Policy drift found separately. |
| `/api/health` | 200 | API healthy; Supabase/Telegram/Resend/Facebook/DeepSeek env flags true. |
| `/book` | 200 | Live, but copy/policy drift found. |
| `/pricing` | 200 | Live, but copy/policy drift found. |
| `/services` | 200 | Live, but copy/policy drift found. |
| `/messenger` | 307 | Redirects to `https://m.me/61588215297678...` |

## LIVE POLICY DRIFT — ADDITIONAL ROUTES

### `/book`

Observed:
- `Insured` in trust/form copy.
- Footer email `hello@handyandfriend.com`.
- Footer hours `Mon–Sat 8 AM–7 PM`.
- Hero says response within `30 minutes` while canonical SLA is 15 minutes.
- Trust tile says `5 ★ Customer Rating`.
- Copy says `available 7 days a week, 8am to 8pm` while canonical Sunday is off.

Required fix:
- Remove unverified insurance/rating claims.
- Use canonical contact email or verify/add `hello@handyandfriend.com` to rules registry.
- Align hours to Mon–Sat 8 AM–8 PM.
- Align response promise to 15 minutes or softer `during business hours` language.

### `/pricing`

Observed:
- Trust string: `Professional & Insured`.
- Multilingual FAQ includes insured/fully insured wording.
- English FAQ claims `Available 8am–8pm daily`.
- Some translations still advertise `free quote in 2 minutes`.
- Pricing app contains older non-canonical service prices for some categories before registry override logic.

Required fix:
- Remove unverified insurance claims.
- Change daily availability to Mon–Sat.
- Remove 2-minute claim.
- Confirm rendered price registry overrides old embedded fallback pricing.

### `/services`

Observed:
- JSON-LD email `hello@handyandfriend.com`.
- JSON-LD hours close at `19:00`.
- Hero/footer says `Mon–Sat 8AM–7PM`.
- Service copy has broad `Plumbing` / `Electrical` labels, while safer public copy should say `Minor Plumbing Fixtures` / `Minor Electrical Fixtures`.
- Trust tile says `20+ Happy Clients` and `Same-Day Available`.

Required fix:
- Replace email/hours with canonical values or update registry after verification.
- Rename broad service labels where needed.
- Remove/verify client count claim.

## BLOCKED

### Direct file patching for large HTML pages

The GitHub connector supports full-file replacement, not small patch application. `index.html` is very large, and direct content fetch is token-truncated. A safe exact patch needs one of:

1. local git checkout on an active machine;
2. Codex/Claude Code agent with repo checkout;
3. VPS/self-hosted runner online;
4. a purpose-built patch workflow that can run scripted replacements.

Do not hand-edit large HTML from truncated content.

## NEXT ACTIONS

1. Use a repo checkout agent or VPS runner to apply scripted replacements across `index.html`, `book/index.html`, `pricing/index.html`, and `services/index.html`.
2. Run `npm test` and `Validate Site`.
3. Re-fetch live routes and confirm drift removed.
4. Only then enable schedule/automated browser checks.

## RISK CONTROL

- No real customer messages sent.
- No secrets touched.
- No destructive actions.
- No partial large-file patch attempted from truncated content.
