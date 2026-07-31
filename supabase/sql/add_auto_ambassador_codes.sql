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
  p_application_id bigint
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_attempt integer := 0;
begin
  v_base := upper(regexp_replace(split_part(trim(coalesce(p_full_name, '')), ' ', 1), '[^A-Za-z0-9]+', '', 'g'));
  if v_base = '' then
    v_base := 'AMB';
  end if;

  loop
    v_candidate := v_base || '20' || case when v_attempt = 0 then '' else v_attempt::text end;
    exit when not exists (
      select 1
      from public.ambassador_codes c
      where upper(c.code) = upper(v_candidate)
    );
    v_attempt := v_attempt + 1;
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
begin
  select *
    into v_row
  from public.ambassador_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Ambassador application not found';
  end if;

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
         reviewed_at = coalesce(reviewed_at, now()),
         reviewed_by = coalesce(reviewed_by, auth.email()),
         discount_code = v_code,
         discount_code_created_at = coalesce(discount_code_created_at, now())
   where id = p_application_id;

  return query
  select
    v_code,
    reviewed_at,
    status
  from public.ambassador_applications
  where id = p_application_id;
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
