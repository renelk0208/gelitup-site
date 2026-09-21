-- Auto-create ambassador discount codes when an application is approved.
-- Also stores the generated code on the application row so admins can see it.
-- Safe to run multiple times.

alter table public.ambassador_applications
  add column if not exists discount_code text,
  add column if not exists discount_code_created_at timestamptz;

create unique index if not exists idx_ambassador_applications_discount_code
  on public.ambassador_applications (upper(discount_code))
  where discount_code is not null;

create or replace function public.generate_ambassador_discount_code(
  p_full_name text,
  p_instagram text,
  p_application_id bigint
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix_source text;
  v_prefix text;
  v_seed bytea;
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_candidate text;
  v_suffix text;
  i integer;
begin
  v_prefix_source := upper(regexp_replace(
    coalesce(nullif(trim(p_instagram), ''), split_part(trim(coalesce(p_full_name, '')), ' ', 1), 'AMB'),
    '[^A-Za-z0-9]+',
    '',
    'g'
  ));
  if v_prefix_source = '' then
    v_prefix_source := 'AMB';
  end if;
  v_prefix := substr(v_prefix_source, 1, 6);

  loop
    v_seed := decode(md5(
      random()::text ||
      clock_timestamp()::text ||
      coalesce(p_application_id::text, '') ||
      coalesce(p_full_name, '') ||
      coalesce(p_instagram, '')
    ), 'hex');
    v_suffix := '';
    for i in 0..7 loop
      v_suffix := v_suffix || substr(v_alphabet, (get_byte(v_seed, i) % 32) + 1, 1);
    end loop;
    v_candidate := v_prefix || '-' || substr(v_suffix, 1, 4);
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

grant execute on function public.generate_ambassador_discount_code(text, text, bigint) to authenticated;

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

  -- Pre-read reviewed_at into a variable to avoid ambiguity with RETURNS TABLE column
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
    v_code := public.generate_ambassador_discount_code(v_row.full_name, v_row.instagram, v_row.id);
  end if;

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

  -- All SET values use v_ variables to avoid ambiguity with RETURNS TABLE column names
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

do $$
declare
  r record;
begin
  -- First, sync already-approved applications to previously allocated codes.
  update public.ambassador_applications a
     set discount_code = c.code,
         discount_code_created_at = coalesce(a.discount_code_created_at, now())
    from public.ambassador_codes c
   where a.status = 'approved'
     and a.discount_code is null
     and (
       lower(coalesce(c.ambassador_email, '')) = lower(coalesce(a.email, ''))
       or lower(coalesce(c.ambassador_name, '')) = lower(coalesce(a.full_name, ''))
     );

  -- Only generate/create when there is still no matched existing code.
  for r in
    select id
    from public.ambassador_applications
    where status = 'approved'
      and discount_code is null
  loop
    perform public.approve_ambassador_application(r.id);
  end loop;
end;
$$;
