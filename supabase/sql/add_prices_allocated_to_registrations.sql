-- Add prices_allocated flag to b2b_registrations
-- Default: false — prices are hidden from distributors until explicitly enabled by admin.
-- Admin can toggle this per-registration via the Admin Dashboard.
-- On the distributor's next login, buildUserMetadataFromRegistration reads this flag
-- and writes it to their Supabase auth user_metadata, which gates price visibility in the portal.

alter table public.b2b_registrations
  add column if not exists prices_allocated boolean not null default false;
