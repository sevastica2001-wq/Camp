-- Multi-camp event management schema + RLS
-- Run in Supabase SQL editor or via supabase db push

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type camp_status as enum (
    'draft', 'registration_open', 'planning', 'active', 'finished', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type camp_role as enum (
    'ADMIN', 'ORGANIZER', 'VOLUNTEER', 'PARTICIPANT'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type transport_role as enum ('PASSENGER', 'DRIVER');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type attendance_status as enum (
    'pending', 'confirmed', 'cancelled', 'waitlist'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type message_template_type as enum ('driver', 'passenger');
exception when duplicate_object then null;
end $$;

-- Users (extends auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Camps
create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  location text not null default '',
  start_date date,
  end_date date,
  status camp_status not null default 'draft',
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create index if not exists camps_created_by_idx on public.camps (created_by);
create index if not exists camps_status_idx on public.camps (status);

-- Camp membership
create table if not exists public.camp_members (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role camp_role not null default 'PARTICIPANT',
  created_at timestamptz not null default now(),
  unique (camp_id, user_id)
);

create index if not exists camp_members_user_idx on public.camp_members (user_id);
create index if not exists camp_members_camp_idx on public.camp_members (camp_id);

-- Registrations (transport lives here)
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  display_name text not null default '',
  attendance_status attendance_status not null default 'confirmed',
  transport_role transport_role not null default 'PASSENGER',
  departure_location text not null default '',
  return_location text not null default '',
  available_seats integer not null default 0,
  car_model text not null default '',
  car_color text not null default '',
  license_plate text not null default '',
  phone text,
  email text,
  notes text,
  assigned_driver_registration_id uuid references public.registrations (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (camp_id, user_id)
);

create index if not exists registrations_camp_idx on public.registrations (camp_id);
create index if not exists registrations_driver_idx on public.registrations (assigned_driver_registration_id);
create index if not exists registrations_role_idx on public.registrations (camp_id, transport_role);

-- Invitations
create table if not exists public.camp_invitations (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  slug text not null,
  code text not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (slug, code)
);

create index if not exists camp_invitations_camp_idx on public.camp_invitations (camp_id);

-- Message templates
create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  type message_template_type not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (camp_id, type)
);

-- Helper: membership check
create or replace function public.is_camp_member(p_camp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.camp_members m
    where m.camp_id = p_camp_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.camp_role_in(p_camp_id uuid, p_roles camp_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.camp_members m
    where m.camp_id = p_camp_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_camp_organizer(p_camp_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.camp_role_in(p_camp_id, array['ADMIN', 'ORGANIZER']::camp_role[]);
$$;

-- Auto-create public.users on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.users enable row level security;
alter table public.camps enable row level security;
alter table public.camp_members enable row level security;
alter table public.registrations enable row level security;
alter table public.camp_invitations enable row level security;
alter table public.message_templates enable row level security;

-- users policies
drop policy if exists users_select_authenticated on public.users;
create policy users_select_authenticated on public.users
  for select to authenticated using (true);

drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users
  for insert to authenticated with check (id = auth.uid());

-- camps policies
drop policy if exists camps_select_member on public.camps;
create policy camps_select_member on public.camps
  for select to authenticated
  using (public.is_camp_member(id) or created_by = auth.uid());

drop policy if exists camps_insert_auth on public.camps;
create policy camps_insert_auth on public.camps
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists camps_update_organizer on public.camps;
create policy camps_update_organizer on public.camps
  for update to authenticated
  using (public.is_camp_organizer(id))
  with check (public.is_camp_organizer(id));

drop policy if exists camps_delete_organizer on public.camps;
create policy camps_delete_organizer on public.camps
  for delete to authenticated
  using (public.is_camp_organizer(id));

-- camp_members policies
drop policy if exists camp_members_select on public.camp_members;
create policy camp_members_select on public.camp_members
  for select to authenticated
  using (public.is_camp_member(camp_id) or user_id = auth.uid());

drop policy if exists camp_members_insert_organizer on public.camp_members;
create policy camp_members_insert_organizer on public.camp_members
  for insert to authenticated
  with check (
    public.is_camp_organizer(camp_id)
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.camps c where c.id = camp_id and c.created_by = auth.uid()
      )
    )
  );

drop policy if exists camp_members_update_organizer on public.camp_members;
create policy camp_members_update_organizer on public.camp_members
  for update to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

drop policy if exists camp_members_delete_organizer on public.camp_members;
create policy camp_members_delete_organizer on public.camp_members
  for delete to authenticated
  using (public.is_camp_organizer(camp_id) or user_id = auth.uid());

-- registrations policies
drop policy if exists registrations_select_member on public.registrations;
create policy registrations_select_member on public.registrations
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists registrations_insert on public.registrations;
create policy registrations_insert on public.registrations
  for insert to authenticated
  with check (
    public.is_camp_organizer(camp_id)
    or (user_id = auth.uid() and public.is_camp_member(camp_id))
  );

drop policy if exists registrations_update on public.registrations;
create policy registrations_update on public.registrations
  for update to authenticated
  using (
    public.is_camp_organizer(camp_id)
    or user_id = auth.uid()
  )
  with check (
    public.is_camp_organizer(camp_id)
    or user_id = auth.uid()
  );

drop policy if exists registrations_delete_organizer on public.registrations;
create policy registrations_delete_organizer on public.registrations
  for delete to authenticated
  using (public.is_camp_organizer(camp_id));

-- invitations: members can read; organizers write; anon can read active by slug+code via RPC later
drop policy if exists invitations_select_member on public.camp_invitations;
create policy invitations_select_member on public.camp_invitations
  for select to authenticated
  using (public.is_camp_member(camp_id) or active = true);

drop policy if exists invitations_select_anon on public.camp_invitations;
create policy invitations_select_anon on public.camp_invitations
  for select to anon
  using (active = true);

drop policy if exists invitations_write_organizer on public.camp_invitations;
create policy invitations_write_organizer on public.camp_invitations
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

-- message templates
drop policy if exists templates_select_member on public.message_templates;
create policy templates_select_member on public.message_templates
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists templates_write_organizer on public.message_templates;
create policy templates_write_organizer on public.message_templates
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

-- Public invite lookup function
create or replace function public.lookup_invitation(p_slug text, p_code text)
returns table (
  invitation_id uuid,
  camp_id uuid,
  camp_name text,
  camp_status camp_status,
  slug text,
  code text
)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, c.id, c.name, c.status, i.slug, i.code
  from public.camp_invitations i
  join public.camps c on c.id = i.camp_id
  where i.slug = p_slug
    and i.code = p_code
    and i.active = true
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function public.lookup_invitation(text, text) to anon, authenticated;

-- Join camp via invitation
create or replace function public.join_camp_with_invite(p_slug text, p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_camp_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select camp_id into v_camp_id
  from public.lookup_invitation(p_slug, p_code)
  limit 1;

  if v_camp_id is null then
    raise exception 'Invalid or expired invitation';
  end if;

  insert into public.camp_members (camp_id, user_id, role)
  values (v_camp_id, auth.uid(), 'PARTICIPANT')
  on conflict (camp_id, user_id) do nothing;

  return v_camp_id;
end;
$$;

grant execute on function public.join_camp_with_invite(text, text) to authenticated;
