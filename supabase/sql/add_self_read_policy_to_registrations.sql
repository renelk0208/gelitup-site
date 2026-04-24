-- Allow authenticated distributors to read their OWN registration row.
-- Without this policy, distributors cannot fetch their distributor_tier from
-- b2b_registrations and the portal always falls back to tierPriceMultiplier=1.0
-- (showing full B2B prices instead of tier-discounted prices).
--
-- Run this once in the Supabase SQL Editor.

drop policy if exists "Users can read own registration" on public.b2b_registrations;
create policy "Users can read own registration"
  on public.b2b_registrations
  for select
  to authenticated
  using (
    lower(contact_email) = lower(auth.email())
  );
