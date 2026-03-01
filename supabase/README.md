# Supabase Lead Pipeline (Handy & Friend)

## Required env vars (server only)

- `SUPABASE_URL=https://taqlarevwifgfnjxilfh.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=...` (secret, never expose in browser)
- `NEXT_PUBLIC_SUPABASE_URL=https://taqlarevwifgfnjxilfh.supabase.co` (optional, frontend-safe)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...` (frontend-safe)
- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_CHAT_ID=...`

## SQL rollout order

Run in Supabase SQL editor:

1. `supabase/sql/001_leads_core.sql`
2. `supabase/sql/002_rls_policies.sql`
3. `supabase/sql/003_storage_private_bucket.sql`
4. `supabase/sql/004_analytics_views.sql`
5. `supabase/sql/005_conversations_patch.sql`
6. `supabase/sql/006_leads_schema_sync.sql` (required for legacy projects with missing columns)

## Runtime flow

1. Browser sends lead payload to `/api/submit-lead`.
2. `/api/submit-lead` validates payload and writes `public.leads` + `public.lead_events`.
3. Browser uploads compressed photos to `/api/upload-lead-photos`.
4. `/api/upload-lead-photos` writes files to private bucket `lead-photos` and creates `public.lead_photos` rows.
5. Telegram alert is sent server-side only.
6. AI intake messages can be appended with `/api/append-conversation`.
7. Signed private photo URLs are generated via `/api/lead-photo-url`.

## Safety checks

- No direct browser writes to CRM tables.
- No service-role key in frontend code.
- Private Storage bucket only.
- Event logging for lead creation, photo upload, telegram result, and validation failures.
- Basic server-side rate limits on `ai-chat`, `submit-lead`, `upload-lead-photos`, and `send-telegram`.

## Rollback

1. Remove new API routes from deployment.
2. Revert `index.html` upload call to previous endpoint if needed.
3. Keep Supabase tables; they are additive and safe.
