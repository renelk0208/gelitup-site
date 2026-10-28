-- 1) giveaway_invited_at: an admin invited this ambassador (she qualifies) to
--    request a giveaway; she then sees the "Request a giveaway" card even while
--    the card is switched off for everyone else.
-- 2) ambassador_reported_items: products she says she received for a general
--    package line ("3 different Cat Eye shades"), chosen from the shop in "My
--    reviews". They count as received. Admins can see and remove them.
alter table public.ambassador_applications add column if not exists giveaway_invited_at timestamptz;

create table if not exists public.ambassador_reported_items (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  application_id  bigint not null references public.ambassador_applications(id) on delete cascade,
  line            text not null,
  product_handle  text not null,
  product_title   text
);
create unique index if not exists idx_reported_items_unique on public.ambassador_reported_items (application_id, product_handle);
alter table public.ambassador_reported_items enable row level security;
drop policy if exists "reported_items_admin_all" on public.ambassador_reported_items;
create policy "reported_items_admin_all" on public.ambassador_reported_items
  for all to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())))
  with check (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));
