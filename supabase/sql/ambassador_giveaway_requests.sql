-- Ambassador giveaways: an ambassador asks for a giveaway from her portal
-- ("Request a giveaway"); the admin approves it into a monthly slot
-- (week 1, 2 or 3), waitlists it for the next month, or declines it.
--
-- Ambassadors never touch this table directly: the portal goes through the
-- Netlify function /.netlify/functions/giveaway-request, which checks that she
-- is eligible and that every prize product is one she has reviewed on
-- shop.gelitup.com (Judge.me). Admins (b2b_admins) read and update it from the
-- Shipments view.
--
-- Safe to re-run.

create table if not exists public.ambassador_giveaway_requests (
  id               bigserial primary key,
  created_at       timestamptz not null default now(),
  application_id   bigint not null references public.ambassador_applications(id) on delete cascade,
  products         jsonb not null default '[]'::jsonb,   -- [{ handle, title, image }]
  preferred_month  text,                                  -- 'YYYY-MM'
  idea             text,
  followers        text,
  other_links      text,
  notes            text,
  status           text not null default 'requested'
                   check (status in ('requested', 'approved', 'waitlisted', 'declined', 'cancelled')),
  slot_start       date,
  slot_end         date,
  decided_at       timestamptz,
  decided_by       text,
  decision_note    text,
  notified_at      timestamptz                            -- included in the 08:00 summary
);

create index if not exists idx_giveaway_requests_application on public.ambassador_giveaway_requests (application_id);
create index if not exists idx_giveaway_requests_status on public.ambassador_giveaway_requests (status);

-- One open request per ambassador at a time.
create unique index if not exists idx_giveaway_requests_one_open
  on public.ambassador_giveaway_requests (application_id)
  where status in ('requested', 'waitlisted');

alter table public.ambassador_giveaway_requests enable row level security;

drop policy if exists "giveaway_requests_admin_select" on public.ambassador_giveaway_requests;
create policy "giveaway_requests_admin_select" on public.ambassador_giveaway_requests
  for select to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));

drop policy if exists "giveaway_requests_admin_update" on public.ambassador_giveaway_requests;
create policy "giveaway_requests_admin_update" on public.ambassador_giveaway_requests
  for update to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())))
  with check (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));
