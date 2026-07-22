-- Restore join_camp_with_invite_token (from 0004) if missing on remote.
-- Also accept code-only when it uniquely matches one active invitation.

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
  v_count integer;
begin
  v_raw := trim(p_token);

  -- Accept full URL ending with /join/slug/code or /view/slug/code
  if position('/join/' in v_raw) > 0 then
    v_raw := split_part(v_raw, '/join/', 2);
  elsif position('/view/' in v_raw) > 0 then
    v_raw := split_part(v_raw, '/view/', 2);
  end if;

  v_raw := trim(both '/' from v_raw);
  -- Drop query/hash if pasted with a full URL remnant
  v_raw := split_part(split_part(v_raw, '?', 1), '#', 1);
  v_parts := string_to_array(v_raw, '/');

  if array_length(v_parts, 1) >= 2 then
    v_slug := v_parts[1];
    v_code := v_parts[2];
  elsif position(' ' in v_raw) > 0 then
    v_slug := split_part(v_raw, ' ', 1);
    v_code := split_part(v_raw, ' ', 2);
  elsif position('/' in v_raw) = 0 and length(v_raw) > 0 then
    -- Code only: allow when exactly one active invite matches
    select count(*)::integer into v_count
    from public.camp_invitations i
    where upper(i.code) = upper(v_raw)
      and i.active = true
      and (i.expires_at is null or i.expires_at > now());

    if v_count = 1 then
      select i.slug, i.code into v_slug, v_code
      from public.camp_invitations i
      where upper(i.code) = upper(v_raw)
        and i.active = true
        and (i.expires_at is null or i.expires_at > now())
      limit 1;
    elsif v_count > 1 then
      raise exception 'Code matches multiple camps — use slug/code or the full invite link';
    else
      raise exception 'Invalid or expired invitation';
    end if;
  else
    raise exception 'Use format slug/code or paste the full invite link';
  end if;

  return public.join_camp_with_invite(v_slug, v_code);
end;
$$;

grant execute on function public.join_camp_with_invite_token(text) to authenticated;

notify pgrst, 'reload schema';
