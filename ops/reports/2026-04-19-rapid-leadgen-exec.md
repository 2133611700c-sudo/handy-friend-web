# Rapid Leadgen Execution — 2026-04-19

## Goal
Close same-day leadgen blockers: SMS path recovery + CTA-to-DB ingestion path.

## Implemented
1. **SMS path unblocked with security**
   - File: `api/notify.js`
   - Change: auth is now type-aware.
     - `type=telegram`: strict secret only (unchanged intent, fail-closed).
     - `type=sms`: allowed from trusted site origin/referrer OR secret.
   - Result: calculator SMS flow can work from website without exposing telegram channel.

2. **CTA ingestion endpoint without adding a 13th function**
   - File: `api/health.js`
   - Added: `POST /api/health?type=cta_event`
   - Validates event name + session_id + origin + rate-limit.
   - Writes to `public.funnel_events`.
   - If table missing in prod, returns `202 {stored:false, reason:"funnel_events_missing"}` (explicit, no fake green).

3. **Client-side CTA emission wired**
   - Files: `index.html`, `assets/js/shared.js`
   - Events sent on click: `phone_click`, `whatsapp_click`, `email_click`, `messenger_click`.
   - Transport: `sendBeacon` fallback to `fetch(...keepalive)`.

4. **Schema migration prepared**
   - File: `supabase/migrations/20260419110000_037_funnel_events.sql`
   - Creates `funnel_events` + indexes + `v_chat_funnel_7d`.

## Verification (local/static)
- `node --check` passed for modified JS files.
- grep confirms CTA ingest hooks present in root + shared JS.
- grep confirms server endpoint + migration file present.

## External blockers
- Prod DB insert proof for `funnel_events` requires migration application in Supabase.
- Live behavior change on `/api/notify` and `/api/health?type=cta_event` requires deploy.

## Live ops executed
- `supabase db push --include-all` executed successfully.
  - Applied: `20260419110000_037_funnel_events.sql`
  - Verified with `supabase migration list`: local=remote for `20260419110000`.
- `vercel --prod --yes` failed due auth:
  - Error: `The specified token is not valid. Use vercel login to generate a new token.`

## Next required actions
1. Deploy branch.
2. Apply migration `20260419110000_037_funnel_events.sql` to prod Supabase.
3. Validate live:
   - POST `/api/health?type=cta_event` from site click => `stored:true`.
   - Calculator SMS from site => 200/accepted path.
