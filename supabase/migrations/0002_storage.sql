-- Storage buckets (run in Supabase SQL or create via Dashboard → Storage)

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('camp-images', 'camp-images', true),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- Drop then recreate (Postgres has no CREATE POLICY IF NOT EXISTS)
drop policy if exists avatars_own_write on storage.objects;
drop policy if exists avatars_own_update on storage.objects;
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists camp_images_read on storage.objects;
drop policy if exists camp_images_write on storage.objects;
drop policy if exists documents_read on storage.objects;
drop policy if exists documents_write on storage.objects;

-- Avatars: users manage own folder
create policy avatars_own_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_own_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_public_read on storage.objects
  for select to public
  using (bucket_id = 'avatars');

-- Camp images: organizers write; public read
create policy camp_images_read on storage.objects
  for select to public
  using (bucket_id = 'camp-images');

create policy camp_images_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'camp-images'
    and public.is_camp_organizer(((storage.foldername(name))[1])::uuid)
  );

-- Documents: members read; organizers write
create policy documents_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and public.is_camp_member(((storage.foldername(name))[1])::uuid)
  );

create policy documents_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_camp_organizer(((storage.foldername(name))[1])::uuid)
  );
