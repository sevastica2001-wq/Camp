-- Fix: INSERT ... RETURNING on camps needs SELECT policy to allow the creator
-- before camp_members row exists. Run this in the Supabase SQL Editor.

drop policy if exists camps_select_member on public.camps;
create policy camps_select_member on public.camps
  for select to authenticated
  using (public.is_camp_member(id) or created_by = auth.uid());
