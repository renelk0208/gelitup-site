-- Draft cart safety net (from wip/draft-cart-backup-rescue, reviewed and fixed).
--
-- b2b_draft_carts holds each customer's live cart and is deleted when the cart
-- is emptied or ordered. b2b_draft_cart_snapshots keeps the latest state of
-- every cart, so it can still be seen and recovered from the admin even if
-- the live row or the browser copy disappears. Emptied / ordered carts are
-- archived (archived_at set) instead of deleted.
--
-- It also carries the reminder columns (last_reminder_sent_at, reminder_count,
-- customer_action...) that netlify/functions/send-cart-reminders.js and
-- respond-cart-reminder.js read. Those columns never existed on
-- b2b_draft_carts, so abandoned-cart reminders were failing on every run.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.

create table if not exists public.b2b_draft_cart_snapshots (
  id                    bigint generated always as identity primary key,
  user_id               uuid          not null,
  customer_email        text,
  items                 jsonb         not null default '{}',
  total_units           integer       not null default 0,
  total_estimated       numeric(10,2) not null default 0,
  source                text          not null default 'portal',   -- 'portal' | 'catalogue'
  last_reminder_sent_at timestamptz,
  reminder_count        integer       not null default 0,
  customer_action       text,
  customer_action_at    timestamptz,
  customer_action_note  text,
  archived_at           timestamptz,
  archived_reason       text,
  updated_at            timestamptz   not null default now(),
  created_at            timestamptz   not null default now(),
  unique (user_id, source)
);

create index if not exists idx_b2b_draft_cart_snapshots_open
  on public.b2b_draft_cart_snapshots (updated_at desc)
  where archived_at is null;

alter table public.b2b_draft_cart_snapshots enable row level security;

drop policy if exists "Users can upsert own draft cart snapshots" on public.b2b_draft_cart_snapshots;
create policy "Users can upsert own draft cart snapshots"
  on public.b2b_draft_cart_snapshots for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins can manage draft cart snapshots" on public.b2b_draft_cart_snapshots;
create policy "Admins can manage draft cart snapshots"
  on public.b2b_draft_cart_snapshots for all
  to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())))
  with check (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));

-- Copy today's live carts in, so nothing disappears from the admin when the
-- new code starts reading this table. Existing snapshots are left alone.
-- Carts last touched more than 30 days ago are copied as already reminded
-- twice, so switching reminders back on doesn't email people about carts
-- they left weeks ago. Recent carts get the normal reminders.
insert into public.b2b_draft_cart_snapshots
  (user_id, customer_email, items, total_units, total_estimated, source, updated_at, created_at,
   last_reminder_sent_at, reminder_count)
select d.user_id, d.customer_email, coalesce(d.items, '{}'::jsonb), coalesce(d.total_units, 0),
       coalesce(d.total_estimated, 0), coalesce(d.source, 'portal'), coalesce(d.updated_at, now()), coalesce(d.created_at, now()),
       case when d.updated_at < now() - interval '30 days' then now() end,
       case when d.updated_at < now() - interval '30 days' then 2 else 0 end
  from public.b2b_draft_carts d
 where d.user_id is not null
on conflict (user_id, source) do nothing;
