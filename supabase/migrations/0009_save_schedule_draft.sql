-- Batch save schedule edits in one round-trip (organizer only).

create or replace function public.save_schedule_draft(
  p_camp_id uuid,
  p_upserts jsonb,
  p_delete_ids uuid[] default '{}'
)
returns setof public.schedule_events
language plpgsql
security definer
set search_path = public
as $$
declare
  e jsonb;
  v_id uuid;
  v_is_new boolean;
  v_id_text text;
begin
  if auth.uid() is null or not public.is_camp_organizer(p_camp_id) then
    raise exception 'Not allowed';
  end if;

  if p_delete_ids is not null and cardinality(p_delete_ids) > 0 then
    delete from public.schedule_events
    where camp_id = p_camp_id
      and id = any (p_delete_ids);
  end if;

  for e in
    select value from jsonb_array_elements(coalesce(p_upserts, '[]'::jsonb)) as t(value)
  loop
    v_id_text := nullif(e->>'id', '');
    v_is_new := coalesce((e->>'is_new')::boolean, (e->>'isNew')::boolean, false)
      or v_id_text is null
      or v_id_text like 'new-%';

    if v_is_new then
      insert into public.schedule_events (
        camp_id, title, starts_at, ends_at, category, location, notes, sort_order, seed_key
      ) values (
        p_camp_id,
        e->>'title',
        (e->>'starts_at')::timestamptz,
        (e->>'ends_at')::timestamptz,
        coalesce((e->>'category')::schedule_event_category, 'other'),
        coalesce(e->>'location', ''),
        coalesce(e->>'notes', ''),
        coalesce((e->>'sort_order')::integer, 0),
        null
      );
    else
      v_id := v_id_text::uuid;
      update public.schedule_events
      set
        title = e->>'title',
        starts_at = (e->>'starts_at')::timestamptz,
        ends_at = (e->>'ends_at')::timestamptz,
        category = coalesce((e->>'category')::schedule_event_category, category),
        location = coalesce(e->>'location', ''),
        notes = coalesce(e->>'notes', '')
      where id = v_id
        and camp_id = p_camp_id;
    end if;
  end loop;

  return query
    select *
    from public.schedule_events
    where camp_id = p_camp_id
    order by starts_at;
end;
$$;

grant execute on function public.save_schedule_draft(uuid, jsonb, uuid[]) to authenticated;

notify pgrst, 'reload schema';
