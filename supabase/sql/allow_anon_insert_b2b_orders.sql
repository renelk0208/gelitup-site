-- Allow unauthenticated (guest) users to insert orders.
-- Required for guest checkout flow (non-portal B2B clients placing orders
-- without logging in). Safe because no sensitive data is exposed on INSERT.

drop policy if exists "b2b_orders_insert_anon" on public.b2b_orders;

create policy "b2b_orders_insert_anon"
on public.b2b_orders
for insert
to anon
with check (true);
