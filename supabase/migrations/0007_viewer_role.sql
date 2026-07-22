-- Guest / VIEWER role for read-only share links (anonymous sign-in).
-- Also ensures invited_role exists (from 0004) if that migration was skipped.
-- Enable Anonymous Sign-Ins in Supabase Dashboard: Auth → Providers → Anonymous.
-- After running: Dashboard → Project Settings → API → Reload schema (or NOTIFY below).

-- 1) Enum value for guest viewers
alter type public.camp_role add value if not exists 'VIEWER';

-- 2) Invitation role column (idempotent; required by the app create-invite flow)
alter table public.camp_invitations
  add column if not exists invited_role public.camp_role not null default 'PARTICIPANT';

-- 3) Lookup must return invited_role (drop first — return type changed)
drop function if exists public.lookup_invitation(text, text);

create or replace function public.lookup_invitation(p_slug text, p_code text)
returns table (
  invitation_id uuid,
  camp_id uuid,
  camp_name text,
  camp_status camp_status,
  slug text,
  code text,
  invited_role camp_role
)
language sql
security definer
set search_path = public
as $$
  select
    i.id,
    i.camp_id,
    c.name,
    c.status,
    i.slug,
    i.code,
    i.invited_role
  from public.camp_invitations i
  join public.camps c on c.id = i.camp_id
  where i.slug = lower(trim(p_slug))
    and upper(i.code) = upper(trim(p_code))
    and i.active = true
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function public.lookup_invitation(text, text) to anon, authenticated;

-- 4) Join: VIEWER invites never change an existing higher (or any existing) role.
--    New members still receive VIEWER on first insert.
create or replace function public.join_camp_with_invite(p_slug text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_camp_id uuid;
  v_role camp_role;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select li.camp_id, li.invited_role
  into v_camp_id, v_role
  from public.lookup_invitation(p_slug, p_code) li
  limit 1;

  if v_camp_id is null then
    raise exception 'Invalid or expired invitation';
  end if;

  insert into public.camp_members (camp_id, user_id, role)
  values (v_camp_id, auth.uid(), coalesce(v_role, 'PARTICIPANT'::camp_role))
  on conflict (camp_id, user_id) do update
    set role = case
      when excluded.role = 'VIEWER' then public.camp_members.role
      when public.camp_members.role in ('ADMIN', 'ORGANIZER') then public.camp_members.role
      when excluded.role in ('ADMIN', 'ORGANIZER') then excluded.role
      when excluded.role = 'VOLUNTEER'
        and public.camp_members.role in ('PARTICIPANT', 'VIEWER') then excluded.role
      when excluded.role = 'PARTICIPANT'
        and public.camp_members.role = 'VIEWER' then excluded.role
      else public.camp_members.role
    end;

  return v_camp_id;
end;
$$;

grant execute on function public.join_camp_with_invite(text, text) to authenticated;

-- Refresh PostgREST schema cache so invited_role is visible to the API
notify pgrst, 'reload schema';
