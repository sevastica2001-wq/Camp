-- Camp program / schedule events
-- Run after 0001–0007.

do $$ begin
  create type schedule_event_category as enum (
    'meal',
    'break',
    'session',
    'activity',
    'travel',
    'checkin',
    'checkout',
    'other'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.schedule_events (
  id uuid primary key default gen_random_uuid(),
  camp_id uuid not null references public.camps (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  category schedule_event_category not null default 'other',
  location text not null default '',
  notes text not null default '',
  sort_order integer not null default 0,
  seed_key text,
  created_at timestamptz not null default now(),
  constraint schedule_events_time_chk check (ends_at > starts_at)
);

create index if not exists schedule_events_camp_idx
  on public.schedule_events (camp_id);

create index if not exists schedule_events_camp_starts_idx
  on public.schedule_events (camp_id, starts_at);

create unique index if not exists schedule_events_camp_seed_key_uidx
  on public.schedule_events (camp_id, seed_key)
  where seed_key is not null;

alter table public.schedule_events enable row level security;

drop policy if exists schedule_events_select_member on public.schedule_events;
create policy schedule_events_select_member on public.schedule_events
  for select to authenticated
  using (public.is_camp_member(camp_id));

drop policy if exists schedule_events_write_organizer on public.schedule_events;
create policy schedule_events_write_organizer on public.schedule_events
  for all to authenticated
  using (public.is_camp_organizer(camp_id))
  with check (public.is_camp_organizer(camp_id));

-- Any camp member may insert the first draft once (client-supplied seed rows).
create or replace function public.seed_schedule_events(p_camp_id uuid, p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_camp_member(p_camp_id) then
    raise exception 'Not allowed';
  end if;

  select count(*)::integer into v_count
  from public.schedule_events
  where camp_id = p_camp_id;

  if v_count > 0 then
    return 0;
  end if;

  insert into public.schedule_events (
    camp_id, title, starts_at, ends_at, category, location, notes, sort_order, seed_key
  )
  select
    p_camp_id,
    e->>'title',
    (e->>'starts_at')::timestamptz,
    (e->>'ends_at')::timestamptz,
    (e->>'category')::schedule_event_category,
    coalesce(e->>'location', ''),
    coalesce(e->>'notes', ''),
    coalesce((e->>'sort_order')::integer, 0),
    nullif(e->>'seed_key', '')
  from jsonb_array_elements(p_events) as e;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.seed_schedule_events(uuid, jsonb) to authenticated;

-- Replace seed-keyed events when the draft week needs to move (e.g. Jul → Aug).
create or replace function public.reseed_schedule_events(p_camp_id uuid, p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null or not public.is_camp_member(p_camp_id) then
    raise exception 'Not allowed';
  end if;

  delete from public.schedule_events
  where camp_id = p_camp_id
    and seed_key is not null;

  insert into public.schedule_events (
    camp_id, title, starts_at, ends_at, category, location, notes, sort_order, seed_key
  )
  select
    p_camp_id,
    e->>'title',
    (e->>'starts_at')::timestamptz,
    (e->>'ends_at')::timestamptz,
    (e->>'category')::schedule_event_category,
    coalesce(e->>'location', ''),
    coalesce(e->>'notes', ''),
    coalesce((e->>'sort_order')::integer, 0),
    nullif(e->>'seed_key', '')
  from jsonb_array_elements(p_events) as e;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.reseed_schedule_events(uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
