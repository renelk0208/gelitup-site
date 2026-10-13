-- Ambassador code orders + credit, following the ambassador agreement:
-- commission 10% of client orders placed with the code, 15% once the code's
-- client orders reach €1,000, 20% once they reach €2,000. Credit is spent at checkout.
--
-- Orders come from gelitup.com (checkout calls redeem_ambassador_code) and from
-- shop.gelitup.com (Shopify order webhook -> record_shop_ambassador_redemption).

-- 1. Redemption details ------------------------------------------------------
alter table public.ambassador_redemptions
  add column if not exists order_total_eur       numeric,
  add column if not exists commission_amount_eur numeric,
  add column if not exists commission_pct        numeric,
  add column if not exists source                text not null default 'gelitup.com',
  add column if not exists country               text,
  add column if not exists notified_at           timestamptz;

create unique index if not exists idx_ambassador_redemptions_source_order
  on public.ambassador_redemptions (source, upper(order_ref))
  where order_ref is not null;

-- Order value used for tiers and commission: what the client paid for products
-- (after the code discount, before shipping); older rows fall back to the value
-- implied by the discount.
create or replace function public.ambassador_redemption_value(r public.ambassador_redemptions)
returns numeric language sql immutable as $$
  select coalesce(
    r.order_total_eur,
    case when r.discount_pct > 0 and r.discount_amount_eur > 0
         then round(r.discount_amount_eur / (r.discount_pct / 100.0) - r.discount_amount_eur, 2)
         else 0 end
  )
$$;

-- 2. Commission on each new code order (tiered, per agreement) ---------------
create or replace function public.fn_ambassador_credit_on_redemption()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email   text;
  v_name    text;
  v_value   numeric;
  v_prior   numeric;
  v_total   numeric;
  v_rate    numeric;
begin
  -- Sets this order's commission (tier by the ambassador's client-order total).
  select ambassador_email, ambassador_name into v_email, v_name
    from public.ambassador_codes where upper(code) = upper(new.code) limit 1;
  if v_email is null then return new; end if;

  v_value := public.ambassador_redemption_value(new);
  if v_value is null or v_value <= 0 then return new; end if;

  select coalesce(sum(public.ambassador_redemption_value(r)), 0) into v_prior
    from public.ambassador_redemptions r
   where r.id <> new.id
     and upper(r.code) in (select upper(code) from public.ambassador_codes
                            where lower(ambassador_email) = lower(v_email));

  v_total := v_prior + v_value;
  v_rate  := case when v_total >= 2000 then 20 when v_total >= 1000 then 15 else 10 end;

  new.commission_pct        := v_rate;
  new.commission_amount_eur := round(v_value * v_rate / 100, 2);
  return new;
end;
$function$;

-- Ledger entry only once the order row is really saved (duplicates are skipped).
create or replace function public.fn_ambassador_ledger_after_redemption()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_email text; v_name text;
begin
  if coalesce(new.commission_amount_eur, 0) <= 0 then return null; end if;
  select ambassador_email, ambassador_name into v_email, v_name
    from public.ambassador_codes where upper(code) = upper(new.code) limit 1;
  if v_email is null then return null; end if;
  insert into public.ambassador_credit_ledger
    (ambassador_email, ambassador_name, entry_type, amount_eur, note, source_redemption_id, source_order_ref)
  values
    (v_email, coalesce(new.ambassador_name, v_name), 'earned', new.commission_amount_eur,
     format('%s%% commission on %s order %s with code %s', new.commission_pct, new.source, new.order_ref, new.code),
     new.id, new.order_ref);
  return null;
end;
$function$;

drop trigger if exists trg_ambassador_ledger_after_redemption on public.ambassador_redemptions;
create trigger trg_ambassador_ledger_after_redemption
  after insert on public.ambassador_redemptions
  for each row execute function public.fn_ambassador_ledger_after_redemption();

drop trigger if exists trg_ambassador_credit_on_redemption on public.ambassador_redemptions;
create trigger trg_ambassador_credit_on_redemption
  before insert on public.ambassador_redemptions
  for each row execute function public.fn_ambassador_credit_on_redemption();

-- 3. gelitup.com checkout: record a code order (now with the order total) ------
drop function if exists public.redeem_ambassador_code(text, text, text, numeric);
create or replace function public.redeem_ambassador_code(
  p_code text, p_order_ref text, p_customer_email text,
  p_discount_amount numeric, p_order_total numeric default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint; v_pct numeric; v_name text;
begin
  select id, discount_pct, ambassador_name into v_id, v_pct, v_name
    from public.ambassador_codes
   where upper(code) = upper(trim(p_code)) and active = true
     and (expires_at is null or expires_at > now())
     and (max_redemptions is null or redemption_count < max_redemptions)
   for update;
  if v_id is null then return null; end if;

  -- Only for a real order just placed on gelitup.com (stops made-up orders earning credit).
  if not exists (
    select 1 from public.b2b_orders o
     where o.order_ref = p_order_ref
       and lower(o.customer_email) = lower(trim(coalesce(p_customer_email, '')))
       and o.created_at > now() - interval '2 hours'
  ) then
    return null;
  end if;

  insert into public.ambassador_redemptions
    (code, ambassador_name, order_ref, customer_email, discount_pct, discount_amount_eur, order_total_eur, source)
  values
    (upper(trim(p_code)), v_name, p_order_ref, p_customer_email, v_pct, p_discount_amount, p_order_total, 'gelitup.com')
  on conflict do nothing;
  if found then
    update public.ambassador_codes set redemption_count = redemption_count + 1 where id = v_id;
  end if;
  return v_pct;
end;
$$;
grant execute on function public.redeem_ambassador_code(text, text, text, numeric, numeric) to anon, authenticated;

-- 4. shop.gelitup.com orders (called by the Netlify webhook with the service key) --
create or replace function public.record_shop_ambassador_redemption(
  p_code text, p_order_ref text, p_customer_email text,
  p_discount_amount numeric, p_order_total numeric, p_country text, p_ordered_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint; v_name text; v_inserted int;
begin
  select id, ambassador_name into v_id, v_name
    from public.ambassador_codes where upper(code) = upper(trim(p_code))
   order by active desc, id desc limit 1;
  if v_id is null then return false; end if;

  insert into public.ambassador_redemptions
    (created_at, code, ambassador_name, order_ref, customer_email, discount_pct,
     discount_amount_eur, order_total_eur, source, country)
  values
    (coalesce(p_ordered_at, now()), upper(trim(p_code)), v_name, p_order_ref, p_customer_email, 20,
     p_discount_amount, p_order_total, 'shop.gelitup.com', p_country)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.ambassador_codes set redemption_count = redemption_count + 1 where id = v_id;
  end if;
  return v_inserted > 0;
end;
$$;
revoke all on function public.record_shop_ambassador_redemption(text, text, text, numeric, numeric, text, timestamptz) from public, anon, authenticated;

-- 5. Credit spending at checkout -------------------------------------------------
create table if not exists public.ambassador_wallet_spends (
  id                 bigint generated by default as identity primary key,
  created_at         timestamptz not null default now(),
  ambassador_code_id bigint not null references public.ambassador_codes(id) on delete cascade,
  ambassador_email   text,
  code               text not null,
  order_ref          text not null,
  customer_email     text,
  amount_eur         numeric not null check (amount_eur > 0),
  reversed_at        timestamptz,
  notes              text
);
create unique index if not exists idx_ambassador_wallet_spends_order_ref
  on public.ambassador_wallet_spends (upper(order_ref)) where reversed_at is null;
alter table public.ambassador_wallet_spends enable row level security;
drop policy if exists "ambassador_wallet_spends_admin_select" on public.ambassador_wallet_spends;
create policy "ambassador_wallet_spends_admin_select" on public.ambassador_wallet_spends
  for select to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));

-- Balance for one ambassador email: commission earned on all her codes minus credit spent.
create or replace function public.ambassador_balance_for(p_email text)
returns table (earned numeric, spent numeric, client_orders_total numeric)
language sql stable security definer set search_path = public as $$
  with codes as (select upper(code) code from public.ambassador_codes where lower(ambassador_email) = lower(p_email))
  select
    coalesce((select sum(r.commission_amount_eur) from public.ambassador_redemptions r where upper(r.code) in (select code from codes)), 0),
    coalesce((select sum(s.amount_eur) from public.ambassador_wallet_spends s where lower(s.ambassador_email) = lower(p_email) and s.reversed_at is null), 0),
    coalesce((select sum(public.ambassador_redemption_value(r)) from public.ambassador_redemptions r where upper(r.code) in (select code from codes)), 0)
$$;
revoke all on function public.ambassador_balance_for(text) from public, anon, authenticated;

drop function if exists public.get_my_ambassador_wallet();
create or replace function public.get_my_ambassador_wallet()
returns table(code text, ambassador_name text, available_eur numeric, earned_eur numeric, spent_eur numeric,
              commission_pct numeric, discount_pct numeric, total_redeemed_eur numeric, next_tier_at numeric,
              next_tier_pct numeric, orders_count bigint)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_email text; v_full_name text; v_code_email text;
begin
  v_email := lower(trim(coalesce(auth.email(), '')));
  v_full_name := lower(trim(coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() ->> 'full_name', '')));
  if v_email = '' then return; end if;

  select lower(c.ambassador_email) into v_code_email from public.ambassador_codes c
   where lower(coalesce(c.ambassador_email, '')) = v_email and c.active order by c.id desc limit 1;
  if v_code_email is null and v_full_name <> '' then
    select lower(c.ambassador_email) into v_code_email from public.ambassador_codes c
     where lower(coalesce(c.ambassador_name, '')) = v_full_name and c.active order by c.id desc limit 1;
  end if;
  if v_code_email is null then return; end if;

  return query
  with c as (
    select x.code, x.ambassador_name from public.ambassador_codes x
     where lower(x.ambassador_email) = v_code_email and x.active order by x.id desc limit 1
  ), b as (select * from public.ambassador_balance_for(v_code_email))
  select c.code, c.ambassador_name,
         greatest(0, round(b.earned - b.spent, 2)),
         round(b.earned, 2), round(b.spent, 2),
         (case when b.client_orders_total >= 2000 then 20 when b.client_orders_total >= 1000 then 15 else 10 end)::numeric,
         20::numeric,
         round(b.client_orders_total, 2),
         (case when b.client_orders_total >= 2000 then null when b.client_orders_total >= 1000 then 2000 else 1000 end)::numeric,
         (case when b.client_orders_total >= 2000 then null when b.client_orders_total >= 1000 then 20 else 15 end)::numeric,
         (select count(*) from public.ambassador_redemptions r
           where upper(r.code) in (select upper(code) from public.ambassador_codes where lower(ambassador_email) = v_code_email))
    from c cross join b;
end;
$function$;
grant execute on function public.get_my_ambassador_wallet() to authenticated;

-- The signed-in ambassador's own code orders (no client names or emails).
create or replace function public.get_my_ambassador_code_orders()
returns table(ordered_at timestamptz, source text, country text, order_total_eur numeric,
              commission_pct numeric, commission_amount_eur numeric)
language sql stable security definer set search_path = public as $$
  select r.created_at, r.source, r.country, public.ambassador_redemption_value(r), r.commission_pct, r.commission_amount_eur
    from public.ambassador_redemptions r
   where upper(r.code) in (
     select upper(code) from public.ambassador_codes
      where lower(ambassador_email) = lower(trim(coalesce(auth.email(), ''))) and coalesce(auth.email(), '') <> '')
   order by r.created_at desc
   limit 200
$$;
grant execute on function public.get_my_ambassador_code_orders() to authenticated;

create or replace function public.spend_my_ambassador_wallet(p_order_ref text, p_customer_email text, p_amount numeric)
returns table (applied_amount_eur numeric, available_after_eur numeric)
language plpgsql security definer set search_path = public
as $$
declare
  v_email text; v_code_id bigint; v_code text; v_available numeric; v_existing numeric;
begin
  v_email := lower(trim(coalesce(auth.email(), '')));
  if v_email = '' then raise exception 'Authentication required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid wallet amount'; end if;
  if trim(coalesce(p_order_ref, '')) = '' then raise exception 'Order reference is required'; end if;

  select c.id, c.code into v_code_id, v_code from public.ambassador_codes c
   where lower(coalesce(c.ambassador_email, '')) = v_email and c.active order by c.id desc limit 1 for update;
  if v_code_id is null then raise exception 'No active ambassador wallet found'; end if;

  select s.amount_eur into v_existing from public.ambassador_wallet_spends s
   where upper(s.order_ref) = upper(trim(p_order_ref)) and lower(s.ambassador_email) = v_email and s.reversed_at is null limit 1;

  select greatest(0, round(b.earned - b.spent, 2)) into v_available from public.ambassador_balance_for(v_email) b;
  if v_existing is not null then
    return query select round(v_existing, 2), v_available; return;
  end if;
  if round(p_amount, 2) > v_available then raise exception 'Requested wallet amount exceeds available balance'; end if;

  insert into public.ambassador_wallet_spends (ambassador_code_id, ambassador_email, code, order_ref, customer_email, amount_eur)
  values (v_code_id, v_email, v_code, trim(p_order_ref), nullif(trim(coalesce(p_customer_email, '')), ''), round(p_amount, 2));

  insert into public.ambassador_credit_ledger (ambassador_email, entry_type, amount_eur, note, source_order_ref)
  values (v_email, 'redeemed', round(p_amount, 2), 'Credit used at checkout', trim(p_order_ref));

  return query select round(p_amount, 2), round(greatest(0, v_available - round(p_amount, 2)), 2);
end;
$$;
grant execute on function public.spend_my_ambassador_wallet(text, text, numeric) to authenticated;

create or replace function public.rollback_my_ambassador_wallet_spend(p_order_ref text)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare v_email text; v_amount numeric;
begin
  v_email := lower(trim(coalesce(auth.email(), '')));
  if v_email = '' or trim(coalesce(p_order_ref, '')) = '' then return 0; end if;
  update public.ambassador_wallet_spends s
     set reversed_at = now(), notes = coalesce(s.notes || ' | ', '') || 'Auto-reversed after checkout failure'
   where lower(s.ambassador_email) = v_email and upper(s.order_ref) = upper(trim(p_order_ref)) and s.reversed_at is null
  returning s.amount_eur into v_amount;
  if v_amount is not null then
    insert into public.ambassador_credit_ledger (ambassador_email, entry_type, amount_eur, note, source_order_ref)
    values (v_email, 'adjustment', v_amount, 'Credit returned: checkout did not complete', trim(p_order_ref));
  end if;
  return coalesce(v_amount, 0);
end;
$$;
grant execute on function public.rollback_my_ambassador_wallet_spend(text) to authenticated;
