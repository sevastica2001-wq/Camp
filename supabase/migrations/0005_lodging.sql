-- Lodging (room management) + participant gender / partner
-- Run after 0001–0004.

do $$ begin
  create type lodging_building_status as enum (
    'active', 'under_construction', 'unavailable'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lodging_gender_policy as enum (
    'unset', 'male', 'female', 'mixed', 'couple'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type lodging_bath_type as enum (
    'private', 'shared_corridor', 'none'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type person_gender as enum (
    'male', 'female', 'unspecified'
  );
exception when duplicate_object then null;
end $$;

alter table public.registrations
  add column if not exists gender person_gender not null default 'unspecified';

alter table public.registrations
  add column if not exists partner_registration_id uuid
    references public.registrations (id) on delete set null;

create index if not exists registrations_partner_idx
  on public.registrations (partner_registration_id);

create table if not exists public.lodging_buildings (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  site_name text not null default 'Campus',
  name text not null,
  seed_key text not null,
  sort_order integer not null default 0,
  status lodging_building_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (camp_id, seed_key)
);

create index if not exists lodging_buildings_camp_idx
  on public.lodging_buildings (camp_id);

create table if not exists public.lodging_rooms (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  building_id uuid not null references public.lodging_buildings (id) on delete cascade,
  name text not null,
  seed_key text not null,
  floor text not null default '',
  capacity integer not null check (capacity >= 0),
  amenities text[] not null default '{}',
  bath_type lodging_bath_type not null default 'private',
  gender_policy lodging_gender_policy not null default 'unset',
  sort_order integer not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (camp_id, seed_key)
);

create index if not exists lodging_rooms_camp_idx on public.lodging_rooms (camp_id);
create index if not exists lodging_rooms_building_idx on public.lodging_rooms (building_id);

create table if not exists public.lodging_assignments (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  room_id uuid not null references public.lodging_rooms (id) on delete cascade,
  registration_id uuid not null references public.registrations (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (registration_id),
  unique (room_id, registration_id)
);

create index if not exists lodging_assignments_camp_idx
  on public.lodging_assignments (camp_id);
create index if not exists lodging_assignments_room_idx
  on public.lodging_assignments (room_id);

alter table public.lodging_buildings enable row level security;
alter table public.lodging_rooms enable row level security;
alter table public.lodging_assignments enable row level security;

drop policy if exists lodging_buildings_select on public.lodging_buildings;
create policy lodging_buildings_select on public.lodging_buildings
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists lodging_buildings_write on public.lodging_buildings;
create policy lodging_buildings_write on public.lodging_buildings
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

drop policy if exists lodging_rooms_select on public.lodging_rooms;
create policy lodging_rooms_select on public.lodging_rooms
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists lodging_rooms_write on public.lodging_rooms;
create policy lodging_rooms_write on public.lodging_rooms
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

drop policy if exists lodging_assignments_select on public.lodging_assignments;
create policy lodging_assignments_select on public.lodging_assignments
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists lodging_assignments_write on public.lodging_assignments;
create policy lodging_assignments_write on public.lodging_assignments
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

grant select, insert, update, delete on public.lodging_buildings to authenticated;
grant select, insert, update, delete on public.lodging_rooms to authenticated;
grant select, insert, update, delete on public.lodging_assignments to authenticated;
