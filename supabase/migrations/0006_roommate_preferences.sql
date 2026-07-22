-- Preferred roommates (directed many-to-many)
-- Run after 0005_lodging.sql

create table if not exists public.registration_roommate_preferences (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  registration_id uuid not null references public.registrations (id) on delete cascade,
  roommate_registration_id uuid not null references public.registrations (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (registration_id, roommate_registration_id),
  check (registration_id <> roommate_registration_id)
);

create index if not exists roommate_prefs_registration_idx
  on public.registration_roommate_preferences (registration_id);
create index if not exists roommate_prefs_roommate_idx
  on public.registration_roommate_preferences (roommate_registration_id);
create index if not exists roommate_prefs_camp_idx
  on public.registration_roommate_preferences (camp_id);

alter table public.registration_roommate_preferences enable row level security;

drop policy if exists roommate_prefs_select on public.registration_roommate_preferences;
create policy roommate_prefs_select on public.registration_roommate_preferences
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists roommate_prefs_write on public.registration_roommate_preferences;
create policy roommate_prefs_write on public.registration_roommate_preferences
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

grant select, insert, update, delete on public.registration_roommate_preferences to authenticated;

-- Ensure both ends of a preference belong to the declared camp_id
create or replace function public.roommate_prefs_same_camp()
returns trigger
language plpgsql
as $$
declare
  reg_camp uuid;
  roommate_camp uuid;
begin
  select camp_id into reg_camp from public.registrations where id = new.registration_id;
  select camp_id into roommate_camp from public.registrations where id = new.roommate_registration_id;
  if reg_camp is null or roommate_camp is null then
    raise exception 'Roommate preference references unknown registration';
  end if;
  if reg_camp is distinct from new.camp_id or roommate_camp is distinct from new.camp_id then
    raise exception 'Roommate preference must stay within one camp';
  end if;
  return new;
end;
$$;

drop trigger if exists roommate_prefs_same_camp_trg on public.registration_roommate_preferences;
create trigger roommate_prefs_same_camp_trg
  before insert or update on public.registration_roommate_preferences
  for each row execute function public.roommate_prefs_same_camp();
