-- Private storage bucket for lead photos. Keep it non-public.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-photos',
  'lead-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lock bucket access down to service role traffic only.
-- Service role calls include role=service_role in JWT claims.
drop policy if exists "lead-photos service role read" on storage.objects;
drop policy if exists "lead-photos service role insert" on storage.objects;
drop policy if exists "lead-photos service role update" on storage.objects;
drop policy if exists "lead-photos service role delete" on storage.objects;

create policy "lead-photos service role read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lead-photos' and auth.role() = 'service_role'
);

create policy "lead-photos service role insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lead-photos' and auth.role() = 'service_role'
);

create policy "lead-photos service role update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lead-photos' and auth.role() = 'service_role'
)
with check (
  bucket_id = 'lead-photos' and auth.role() = 'service_role'
);

create policy "lead-photos service role delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lead-photos' and auth.role() = 'service_role'
);
