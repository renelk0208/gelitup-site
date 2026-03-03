-- Creates the b2b_admins table used by the admin portal login (/portal/admin-login).
-- Any email listed here is granted access to the applications review panel.
-- Run once in Supabase SQL Editor.

create table if not exists public.b2b_admins (
  id         uuid        primary key default gen_random_uuid(),
  email      text        not null unique,
  created_at timestamptz not null default now()
);

-- RLS: table must be readable by the authenticated anon key so the login
-- check (select email from b2b_admins where email = $1) can execute.
alter table public.b2b_admins enable row level security;

create policy "Admins readable by authenticated users"
  on public.b2b_admins
  for select
  to authenticated
  using (true);

-- ── Seed admin accounts ──────────────────────────────────────────────────────
-- Add or remove rows here. Email matching is case-insensitive in the app.
insert into public.b2b_admins (email)
values ('rene@gelitup.com')
on conflict (email) do nothing;
