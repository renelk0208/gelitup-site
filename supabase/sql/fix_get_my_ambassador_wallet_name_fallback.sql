-- Fix get_my_ambassador_wallet to match ambassador by name when ambassador_email is NULL.
-- Root cause: seeded codes have ambassador_name but no ambassador_email, so the original
-- email-only lookup always returned zero rows for logged-in ambassadors.
-- Safe to run multiple times.

-- Step 1: backfill ambassador_email on existing codes from approved applications
-- where the name matches, so future lookups resolve by email too.
update public.ambassador_codes c
set ambassador_email = lower(trim(a.email))
from public.ambassador_applications a
where c.ambassador_email is null
  and nullif(trim(a.email), '') is not null
  and lower(trim(a.full_name)) = lower(trim(c.ambassador_name))
  and a.status = 'approved';

-- Step 2: replace the RPC with a version that falls back to name-matching
-- when ambassador_email is NULL or doesn't match any auth user.
create or replace function public.get_my_ambassador_wallet()
returns table (
  code           text,
  ambassador_name text,
  available_eur  numeric,
  earned_eur     numeric,
  spent_eur      numeric,
  commission_pct numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email     text;
  v_full_name text;
begin
  v_email     := lower(trim(coalesce(auth.email(), '')));
  -- Pull full_name from the JWT user_metadata so name-based fallback works
  v_full_name := lower(trim(coalesce(
    auth.jwt() -> 'user_metadata' ->> 'full_name',
    auth.jwt() ->> 'full_name',
    ''
  )));

  if v_email = '' then
    return;
  end if;

  return query
  with me as (
    -- Primary match: by email
    select c.id, c.code, c.ambassador_name, c.commission_pct
    from public.ambassador_codes c
    where lower(coalesce(c.ambassador_email, '')) = v_email
      and c.active = true
    order by c.id desc
    limit 1
  ),
  me_by_name as (
    -- Fallback: by full_name from user metadata (covers seeded codes with no email)
    select c.id, c.code, c.ambassador_name, c.commission_pct
    from public.ambassador_codes c
    where not exists (select 1 from me)
      and v_full_name <> ''
      and lower(coalesce(c.ambassador_name, '')) = v_full_name
      and c.active = true
    order by c.id desc
    limit 1
  ),
  resolved as (
    select * from me
    union all
    select * from me_by_name
    limit 1
  ),
  earned as (
    select
      coalesce(sum(
        coalesce(r.commission_amount_eur,
          round(coalesce(r.order_total_eur, 0) * coalesce(m.commission_pct, 0) / 100, 2))
      ), 0)::numeric as total
    from resolved m
    left join public.ambassador_redemptions r on upper(r.code) = upper(m.code)
  ),
  spent as (
    select coalesce(sum(s.amount_eur), 0)::numeric as total
    from resolved m
    left join public.ambassador_wallet_spends s
      on s.ambassador_code_id = m.id
     and s.reversed_at is null
  )
  select
    m.code,
    m.ambassador_name,
    greatest(0, round(e.total - s.total, 2)) as available_eur,
    round(e.total, 2)                         as earned_eur,
    round(s.total, 2)                         as spent_eur,
    m.commission_pct
  from resolved m
  cross join earned e
  cross join spent s;
end;
$$;

grant execute on function public.get_my_ambassador_wallet() to authenticated;
