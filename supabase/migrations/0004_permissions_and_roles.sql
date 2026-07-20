-- Platform permission: who may create camps
-- Role-aware invitations: participant vs organizer invites
-- Run in Supabase SQL Editor after 0001–0003.

-- 1) users.can_create_camps (default false)
alter table public.users
  add column if not exists can_create_camps boolean not null default false;

-- Bootstrap: anyone who already created a camp can keep creating
update public.users u
set can_create_camps = true
where exists (
  select 1 from public.camps c where c.created_by = u.id
);

-- Block self-grant via client updates
create or replace function public.protect_can_create_camps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.can_create_camps is distinct from old.can_create_camps
     and auth.uid() is not null
     and auth.role() = 'authenticated' then
    raise exception 'Only a platform admin can change can_create_camps';
  end if;
  return new;
end;
$$;

drop trigger if exists users_protect_can_create_camps on public.users;
create trigger users_protect_can_create_camps
  before update on public.users
  for each row execute function public.protect_can_create_camps();

create or replace function public.user_can_create_camps()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select can_create_camps from public.users where id = auth.uid()),
    false
  );
$$;

-- Tighten camp insert: must have permission
drop policy if exists camps_insert_auth on public.camps;
create policy camps_insert_auth on public.camps
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.user_can_create_camps()
  );

-- Keep signup trigger compatible (column has default)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, first_name, last_name, can_create_camps)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    false
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

-- 2) Role on invitations
alter table public.camp_invitations
  add column if not exists invited_role camp_role not null default 'PARTICIPANT';

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
      when public.camp_members.role in ('ADMIN', 'ORGANIZER') then public.camp_members.role
      when excluded.role in ('ADMIN', 'ORGANIZER') then excluded.role
      when excluded.role = 'VOLUNTEER' and public.camp_members.role = 'PARTICIPANT' then excluded.role
      else public.camp_members.role
    end;

  return v_camp_id;
end;
$$;

-- Optional helper: join by pasted "slug/code" or URL path
create or replace function public.join_camp_with_invite_token(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_raw text;
  v_slug text;
  v_code text;
  v_parts text[];
begin
  v_raw := trim(p_token);
  -- Accept full URL ending with /join/slug/code
  if position('/join/' in v_raw) > 0 then
    v_raw := split_part(v_raw, '/join/', 2);
  end if;
  v_raw := trim(both '/' from v_raw);
  v_parts := string_to_array(v_raw, '/');
  if array_length(v_parts, 1) >= 2 then
    v_slug := v_parts[1];
    v_code := v_parts[2];
  elsif position(' ' in v_raw) > 0 then
    v_slug := split_part(v_raw, ' ', 1);
    v_code := split_part(v_raw, ' ', 2);
  else
    raise exception 'Use format slug/code or paste the full invite link';
  end if;
  return public.join_camp_with_invite(v_slug, v_code);
end;
$$;

grant execute on function public.user_can_create_camps() to authenticated;
grant execute on function public.lookup_invitation(text, text) to anon, authenticated;
grant execute on function public.join_camp_with_invite(text, text) to authenticated;
grant execute on function public.join_camp_with_invite_token(text) to authenticated;
