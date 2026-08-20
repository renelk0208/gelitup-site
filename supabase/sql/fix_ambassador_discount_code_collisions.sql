-- Fix approval failures caused by duplicate ambassador discount codes.
-- This replaces the approval RPC so generated codes are unique across both:
--   1) public.ambassador_codes
--   2) public.ambassador_applications.discount_code
-- Safe to run multiple times.

create or replace function public.generate_ambassador_discount_code(
  p_full_name text,
  p_application_id bigint
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seed bytea;
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_candidate text;
  v_suffix text;
  i integer;
begin
  loop
    v_seed := decode(md5(
      random()::text ||
      clock_timestamp()::text ||
      coalesce(p_application_id::text, '') ||
      coalesce(p_full_name, '')
    ), 'hex');
    v_suffix := '';
    for i in 0..7 loop
      v_suffix := v_suffix || substr(v_alphabet, (get_byte(v_seed, i) % 32) + 1, 1);
    end loop;
    v_candidate := 'GIUP-' || substr(v_suffix, 1, 4) || '-' || substr(v_suffix, 5, 4);
    exit when not exists (
      select 1
      from public.ambassador_codes c
      where upper(c.code) = upper(v_candidate)
    )
    and not exists (
      select 1
      from public.ambassador_applications a
      where a.id <> p_application_id
        and upper(coalesce(a.discount_code, '')) = upper(v_candidate)
    );
  end loop;

  return v_candidate;
end;
$$;

grant execute on function public.generate_ambassador_discount_code(text, bigint) to authenticated;

create or replace function public.approve_ambassador_application(
  p_application_id bigint
)
returns table (
  discount_code text,
  reviewed_at timestamptz,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ambassador_applications%rowtype;
  v_code text;
  v_reviewed_at timestamptz;
  v_status text;
begin
  select *
    into v_row
  from public.ambassador_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Ambassador application not found';
  end if;

  v_reviewed_at := v_row.reviewed_at;

  v_code := nullif(trim(coalesce(v_row.discount_code, '')), '');
  if v_code is null then
    select c.code
      into v_code
    from public.ambassador_codes c
    where lower(coalesce(c.ambassador_email, '')) = lower(coalesce(v_row.email, ''))
    order by c.id desc
    limit 1;
  end if;

  if v_code is null then
    select c.code
      into v_code
    from public.ambassador_codes c
    where lower(coalesce(c.ambassador_name, '')) = lower(coalesce(v_row.full_name, ''))
    order by c.id desc
    limit 1;
  end if;

  if v_code is null then
    v_code := public.generate_ambassador_discount_code(v_row.full_name, v_row.id);
  end if;

  while exists (
    select 1
    from public.ambassador_codes c
    where upper(c.code) = upper(v_code)
  )
  or exists (
    select 1
    from public.ambassador_applications a
    where a.id <> p_application_id
      and upper(coalesce(a.discount_code, '')) = upper(v_code)
  ) loop
    v_code := public.generate_ambassador_discount_code(v_row.full_name, v_row.id);
  end loop;

  if not exists (
    select 1
    from public.ambassador_codes c
    where upper(c.code) = upper(v_code)
  ) then
    insert into public.ambassador_codes (
      code,
      ambassador_name,
      ambassador_email,
      discount_pct,
      commission_pct,
      active,
      notes
    )
    values (
      v_code,
      v_row.full_name,
      v_row.email,
      20,
      20,
      true,
      concat('Auto-created from approved ambassador application #', v_row.id)
    );
  else
    update public.ambassador_codes c
       set ambassador_name = coalesce(nullif(trim(v_row.full_name), ''), c.ambassador_name),
           ambassador_email = coalesce(nullif(trim(v_row.email), ''), c.ambassador_email),
           active = true
     where upper(c.code) = upper(v_code);
  end if;

  update public.ambassador_applications
     set status = 'approved',
         reviewed_at = coalesce(v_reviewed_at, now()),
         reviewed_by = coalesce(v_row.reviewed_by, auth.email()),
         discount_code = v_code,
         discount_code_created_at = coalesce(v_row.discount_code_created_at, now())
   where id = p_application_id;

  v_reviewed_at := coalesce(v_reviewed_at, now());
  v_status := 'approved';

  return query select v_code, v_reviewed_at, v_status;
end;
$$;

grant execute on function public.approve_ambassador_application(bigint) to authenticated;
