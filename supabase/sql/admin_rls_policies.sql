-- Admin RLS policies for b2b_registrations and b2b_orders.
-- Run once in Supabase SQL Editor after create_b2b_admins.sql.
-- These allow any authenticated user whose email is in b2b_admins
-- to read and update all rows in both tables.
-- Safety: always re-applies the anon insert policy so the registration form keeps working.

-- ── b2b_registrations ────────────────────────────────────────────────────────

drop policy if exists "Admins can read all registrations" on public.b2b_registrations;
create policy "Admins can read all registrations"
  on public.b2b_registrations
  for select
  to authenticated
  using (
    exists (
      select 1 from public.b2b_admins
      where lower(email) = lower(auth.email())
    )
  );

drop policy if exists "Admins can update registrations" on public.b2b_registrations;
create policy "Admins can update registrations"
  on public.b2b_registrations
  for update
  to authenticated
  using (
    exists (
      select 1 from public.b2b_admins
      where lower(email) = lower(auth.email())
    )
  );

-- ── b2b_orders ────────────────────────────────────────────────────────────────

drop policy if exists "Admins can read all orders" on public.b2b_orders;
create policy "Admins can read all orders"
  on public.b2b_orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.b2b_admins
      where lower(email) = lower(auth.email())
    )
  );

drop policy if exists "Admins can update orders" on public.b2b_orders;
create policy "Admins can update orders"
  on public.b2b_orders
  for update
  to authenticated
  using (
    exists (
      select 1 from public.b2b_admins
      where lower(email) = lower(auth.email())
    )
  );

-- ── Safety footer — always re-apply anon insert so this script can never lock out registrations ──
drop policy if exists "b2b_registrations_insert_anon" on public.b2b_registrations;
create policy "b2b_registrations_insert_anon"
  on public.b2b_registrations
  for insert
  to anon, authenticated
  with check (true);

-- Safety: always re-apply the anon insert policy so the registration form keeps working.
drop policy if exists "b2b_registrations_insert_anon" on public.b2b_registrations;
create policy "b2b_registrations_insert_anon"
  on public.b2b_registrations
  for insert
  to anon, authenticated
  with check (true);
