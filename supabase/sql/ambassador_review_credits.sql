-- A review an ambassador wrote that Judge.me did not attach to a product (a
-- shop review) can be credited by an admin to one product she received, so it
-- counts in "My reviews" and for giveaways. One credit per Judge.me review.
create table if not exists public.ambassador_review_credits (
  id              bigserial primary key,
  created_at      timestamptz not null default now(),
  application_id  bigint not null references public.ambassador_applications(id) on delete cascade,
  judgeme_review_id text not null,
  product_handle  text not null,
  product_title   text,
  credited_by     text
);
create unique index if not exists idx_review_credits_review on public.ambassador_review_credits (judgeme_review_id);
create index if not exists idx_review_credits_app on public.ambassador_review_credits (application_id);
alter table public.ambassador_review_credits enable row level security;
drop policy if exists "review_credits_admin_all" on public.ambassador_review_credits;
create policy "review_credits_admin_all" on public.ambassador_review_credits
  for all to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())))
  with check (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));
