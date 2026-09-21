-- Adds commission tracking to the ambassador program.
-- - commission_pct on each code (flat 20% by default; editable per ambassador).
-- - order_total_eur logged on every redemption so payouts = order total × commission %.
-- Safe to run on an existing install (idempotent). Run once in the Supabase SQL Editor.

alter table public.ambassador_codes
  add column if not exists commission_pct numeric not null default 20
    check (commission_pct >= 0 and commission_pct <= 100);

alter table public.ambassador_redemptions
  add column if not exists order_total_eur numeric;

-- Replace the redeem RPC with a version that also records the full order total.
-- Drop the old 4-arg signature first so PostgREST resolves the new one cleanly.
drop function if exists public.redeem_ambassador_code(text, text, text, numeric);

create or replace function public.redeem_ambassador_code(
  p_code            text,
  p_order_ref       text,
  p_customer_email  text,
  p_discount_amount numeric,
  p_order_total     numeric
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   bigint;
  v_pct  numeric;
  v_name text;
begin
  select id, discount_pct, ambassador_name
    into v_id, v_pct, v_name
  from public.ambassador_codes
  where upper(code) = upper(trim(p_code))
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_redemptions is null or redemption_count < max_redemptions)
  for update;

  if v_id is null then
    return null;
  end if;

  update public.ambassador_codes
     set redemption_count = redemption_count + 1
   where id = v_id;

  insert into public.ambassador_redemptions
    (code, ambassador_name, order_ref, customer_email, discount_pct, discount_amount_eur, order_total_eur)
  values
    (upper(trim(p_code)), v_name, p_order_ref, p_customer_email, v_pct, p_discount_amount, p_order_total);

  return v_pct;
end;
$$;

grant execute on function public.redeem_ambassador_code(text, text, text, numeric, numeric) to anon, authenticated;

-- ── Payout report: sales + commission owed per ambassador ───────────────────
-- select r.ambassador_name, r.code,
--        count(*)                                                as orders,
--        sum(r.order_total_eur)                                  as sales_eur,
--        round(sum(r.order_total_eur) * c.commission_pct / 100, 2) as commission_owed_eur
-- from public.ambassador_redemptions r
-- join public.ambassador_codes c on upper(c.code) = upper(r.code)
-- group by r.ambassador_name, r.code, c.commission_pct
-- order by sales_eur desc;
