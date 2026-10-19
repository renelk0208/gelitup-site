-- ─────────────────────────────────────────────────────────────────────────────
-- World of GEL.IT.UP — international nail-look competition
--
-- Applied to production as migration "create_world_competition".
--
-- Tables
--   world_rounds    one row per competition round (monthly / themed)
--   world_profiles  public creator profile, one per auth user
--   world_entries   uploaded nail looks (photo in storage bucket world-entries)
--   world_votes     one heart per account per entry
--   world_reports   "report this photo" flags for moderation
--   world_wildcards jury wildcards: looks from outside the top 10 sent to the final
--   world_placements the jury's 1st/2nd/3rd place per round (the month's GEL.IT.UP Icons)
--
-- How a round is decided: new looks wait for admin approval (status 'pending').
-- When the round closes, the top 10 approved looks by hearts plus up to 2 jury
-- wildcards form the final, and the jury chooses 1st, 2nd and 3rd place.
-- Wildcards and placings stay private until the admin publishes them.
--
-- Community accounts are ordinary Supabase auth users, but they only get
-- B2B portal access if they also have a b2b_registrations row — so this
-- feature never grants portal access by itself.
-- ─────────────────────────────────────────────────────────────────────────────

-- Admin check (re-uses the existing b2b_admins list)
create or replace function public.world_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.b2b_admins where lower(email) = lower(auth.email()));
$$;

-- ── Rounds ──────────────────────────────────────────────────────────────────
create table if not exists public.world_rounds (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  slug         text not null unique,
  theme        text not null default 'everyday',          -- halloween, best-french, 3d-design, movember, christmas, valentines, everyday …
  title        jsonb not null default '{}'::jsonb,         -- {"en": "...", "el": "...", ...}
  description  jsonb not null default '{}'::jsonb,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  prizes       jsonb not null default '["€1000", "€500", "€300"]'::jsonb, -- 1st/2nd/3rd: value of GEL.IT.UP products (no cash)
  local_prizes jsonb not null default '{}'::jsonb,         -- {"GR": ["€300","€100","€50"]} — products provided by that country's distributor
  max_entries_per_user int not null default 3,
  -- Countries whose residents may enter: the EU plus the non-EU European countries
  -- listed on gelitup.com. Anyone, anywhere, can register and vote.
  eligible_countries text[] not null default array['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','AL','AD','BY','BA','GE','IS','XK','LI','MD','MC','ME','MK','NO','SM','RS','CH','TR','UA','GB','VA'],
  is_published boolean not null default true,
  icon_month   date,                                      -- month the winners are named for ("GEL.IT.UP Icons of November 2026")
  finalists    int not null default 10 check (finalists between 1 and 50), -- looks with the most hearts that reach the final
  max_wildcards int not null default 2 check (max_wildcards between 0 and 10),
  wildcards_published boolean not null default false,     -- show the jury's wildcards publicly
  results_published   boolean not null default false,     -- show 1st/2nd/3rd publicly (Hall of Fame)
  cleaned_at   timestamptz,                               -- when non-winning looks were removed after the round
  constraint world_rounds_dates check (ends_at > starts_at)
);

alter table public.world_rounds enable row level security;

drop policy if exists world_rounds_read on public.world_rounds;
create policy world_rounds_read on public.world_rounds
  for select to anon, authenticated
  using (is_published or public.world_is_admin());

drop policy if exists world_rounds_admin_write on public.world_rounds;
create policy world_rounds_admin_write on public.world_rounds
  for all to authenticated
  using (public.world_is_admin())
  with check (public.world_is_admin());

-- ── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.world_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  created_at       timestamptz not null default now(),
  handle           text not null unique check (handle ~ '^[a-z0-9._]{2,30}$'),
  display_name     text not null check (char_length(display_name) between 2 and 60),
  instagram        text not null check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  country          char(2) not null check (country ~ '^[A-Z]{2}$'),
  adult_confirmed  boolean not null default false check (adult_confirmed),
  -- Registration consents (all required to enter or vote)
  rules_version    text not null,                             -- version of the competition rules accepted
  terms_accepted_at timestamptz not null default now(),       -- when that version was accepted
  public_display_consent boolean not null default false check (public_display_consent),
  public_display_consent_at timestamptz not null default now(),
  marketing_opt_in boolean not null default false,
  -- Consent to automatic competition emails (entry live, progress, final call,
  -- results, new rounds). Unticked by default; the time of consent is recorded.
  competition_emails_opt_in   boolean not null default false,
  competition_emails_consent_at timestamptz,
  email_unsubscribe_token     uuid not null default gen_random_uuid(),
  preferred_lang   text not null default 'en' check (preferred_lang ~ '^[a-z]{2}$'),
  signup_source    text,                                      -- which GEL.IT.UP site the person came from
  is_banned        boolean not null default false
);

alter table public.world_profiles enable row level security;

-- Public creator info (name, handle, Instagram, country) is visible to everyone.
drop policy if exists world_profiles_read on public.world_profiles;
create policy world_profiles_read on public.world_profiles
  for select to anon, authenticated
  using (true);

drop policy if exists world_profiles_insert_own on public.world_profiles;
create policy world_profiles_insert_own on public.world_profiles
  for insert to authenticated
  with check (user_id = auth.uid() and is_banned = false);

drop policy if exists world_profiles_update_own on public.world_profiles;
create policy world_profiles_update_own on public.world_profiles
  for update to authenticated
  using (user_id = auth.uid() or public.world_is_admin())
  with check (user_id = auth.uid() or public.world_is_admin());

-- Users can't un-ban themselves; consent time is stamped by the database.
create or replace function public.world_profiles_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then
    if not public.world_is_admin() then
      new.is_banned := old.is_banned;
      new.user_id := old.user_id;
    end if;
    new.email_unsubscribe_token := old.email_unsubscribe_token;
    new.terms_accepted_at := case when new.rules_version is distinct from old.rules_version then now() else old.terms_accepted_at end;
    new.public_display_consent_at := old.public_display_consent_at;
    if new.competition_emails_opt_in and not old.competition_emails_opt_in then
      new.competition_emails_consent_at := now();
    elsif not new.competition_emails_opt_in then
      new.competition_emails_consent_at := null;
    else
      new.competition_emails_consent_at := old.competition_emails_consent_at;
    end if;
  else
    new.competition_emails_consent_at := case when new.competition_emails_opt_in then now() else null end;
    new.email_unsubscribe_token := gen_random_uuid();
    new.terms_accepted_at := now();
    new.public_display_consent_at := now();
  end if;
  return new;
end $$;

drop trigger if exists world_profiles_guard on public.world_profiles;
create trigger world_profiles_guard before insert or update on public.world_profiles
  for each row execute function public.world_profiles_guard();

-- The unsubscribe token must not be readable by the public
revoke select on public.world_profiles from anon, authenticated;
grant select (user_id, created_at, handle, display_name, instagram, country) on public.world_profiles to anon, authenticated;
-- Owners read their own full profile through this function
create or replace function public.world_my_profile()
returns setof public.world_profiles
language sql stable security definer set search_path = public as $$
  select * from public.world_profiles where user_id = auth.uid();
$$;
revoke all on function public.world_my_profile() from public, anon;
grant execute on function public.world_my_profile() to authenticated;

-- ── Entries ─────────────────────────────────────────────────────────────────
create table if not exists public.world_entries (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  round_id     uuid not null references public.world_rounds(id) on delete cascade,
  user_id      uuid not null references public.world_profiles(user_id) on delete cascade,
  country      char(2) not null,
  image_path   text not null,                    -- path inside the world-entries bucket
  caption      text check (caption is null or char_length(caption) <= 600),
  products     jsonb not null default '[]'::jsonb,   -- [{"name": "15 Total Eclipse", "sku": "..."}]
  source_site  text,                             -- e.g. gelitup.com, gelitup.gr
  status       text not null default 'pending' check (status in ('pending', 'published', 'hidden', 'rejected')),
  approved_at  timestamptz,                      -- when an admin first published the look
  -- 1st prize: entrant states she uses GEL.IT.UP and has reviewed every tagged product;
  -- GEL.IT.UP confirms the reviews before 1st place is awarded.
  first_prize_claim boolean not null default false,
  reviews_verified  boolean not null default false,
  vote_count   int not null default 0,
  report_count int not null default 0
);

create index if not exists world_entries_round_idx on public.world_entries (round_id, status, vote_count desc);
create index if not exists world_entries_country_idx on public.world_entries (round_id, country, vote_count desc);
create index if not exists world_entries_user_idx on public.world_entries (user_id);

alter table public.world_entries enable row level security;

drop policy if exists world_entries_read on public.world_entries;
create policy world_entries_read on public.world_entries
  for select to anon, authenticated
  using (status = 'published' or user_id = auth.uid() or public.world_is_admin());

drop policy if exists world_entries_insert_own on public.world_entries;
create policy world_entries_insert_own on public.world_entries
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists world_entries_update on public.world_entries;
create policy world_entries_update on public.world_entries
  for update to authenticated
  using (user_id = auth.uid() or public.world_is_admin())
  with check (user_id = auth.uid() or public.world_is_admin());

drop policy if exists world_entries_delete on public.world_entries;
create policy world_entries_delete on public.world_entries
  for delete to authenticated
  using (user_id = auth.uid() or public.world_is_admin());

-- Insert rules: round must be open, entry limit per round, country from profile,
-- counters start at zero, banned accounts can't post.
create or replace function public.world_entries_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.world_rounds;
  p public.world_profiles;
  n int;
begin
  select * into r from public.world_rounds where id = new.round_id;
  if r.id is null or not r.is_published or now() < r.starts_at or now() >= r.ends_at then
    raise exception 'ROUND_CLOSED';
  end if;
  select * into p from public.world_profiles where user_id = new.user_id;
  if p.user_id is null then raise exception 'PROFILE_REQUIRED'; end if;
  if p.is_banned then raise exception 'ACCOUNT_BLOCKED'; end if;
  if cardinality(r.eligible_countries) > 0 and not (p.country = any(r.eligible_countries)) then
    raise exception 'COUNTRY_NOT_ELIGIBLE';
  end if;
  select count(*) into n from public.world_entries where round_id = new.round_id and user_id = new.user_id;
  if n >= r.max_entries_per_user then raise exception 'ENTRY_LIMIT'; end if;
  if new.image_path not like new.user_id::text || '/%' then raise exception 'BAD_IMAGE_PATH'; end if;
  new.country := p.country;
  new.reviews_verified := false;
  if new.first_prize_claim and jsonb_array_length(coalesce(new.products, '[]'::jsonb)) = 0 then
    raise exception 'PRODUCTS_REQUIRED';
  end if;
  new.vote_count := 0;
  new.report_count := 0;
  new.status := 'pending';      -- every look waits for admin approval
  new.approved_at := null;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists world_entries_before_insert on public.world_entries;
create trigger world_entries_before_insert before insert on public.world_entries
  for each row execute function public.world_entries_before_insert();

-- Owners may edit caption/products only; admins may change status.
create or replace function public.world_entries_before_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('world.counter_update', true) = 'on' then
    return new;  -- vote/report counter maintenance
  end if;
  if not public.world_is_admin() then
    new.status := old.status;
    new.approved_at := old.approved_at;
    new.reviews_verified := old.reviews_verified;
    -- The entrant may claim 1st-prize eligibility after posting (reviews take time
    -- to appear), only while the round is open and only with products tagged.
    if new.first_prize_claim and not old.first_prize_claim then
      if jsonb_array_length(coalesce(new.products, '[]'::jsonb)) = 0
         or not exists (select 1 from public.world_rounds r where r.id = old.round_id and now() < r.ends_at) then
        new.first_prize_claim := old.first_prize_claim;
      end if;
    end if;
  end if;
  if new.products is distinct from old.products then
    new.reviews_verified := false;  -- changed products need checking again
  end if;
  if new.status = 'published' and old.status <> 'published' and old.approved_at is null then
    new.approved_at := now();       -- first approval (used for the "your look is live" email)
  elsif new.approved_at is distinct from old.approved_at and new.approved_at is not null then
    new.approved_at := old.approved_at;
  end if;
  new.id := old.id;
  new.round_id := old.round_id;
  new.user_id := old.user_id;
  new.country := old.country;
  new.image_path := old.image_path;
  new.vote_count := old.vote_count;
  new.report_count := old.report_count;
  new.created_at := old.created_at;
  return new;
end $$;

drop trigger if exists world_entries_before_update on public.world_entries;
create trigger world_entries_before_update before update on public.world_entries
  for each row execute function public.world_entries_before_update();

-- ── Votes ───────────────────────────────────────────────────────────────────
create table if not exists public.world_votes (
  entry_id    uuid not null references public.world_entries(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  source_site text,
  primary key (entry_id, user_id)
);

create index if not exists world_votes_user_idx on public.world_votes (user_id);

alter table public.world_votes enable row level security;

-- People only see their own votes (to show "you voted"); totals live on world_entries.vote_count
drop policy if exists world_votes_read_own on public.world_votes;
create policy world_votes_read_own on public.world_votes
  for select to authenticated
  using (user_id = auth.uid() or public.world_is_admin());

drop policy if exists world_votes_insert_own on public.world_votes;
create policy world_votes_insert_own on public.world_votes
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists world_votes_delete_own on public.world_votes;
create policy world_votes_delete_own on public.world_votes
  for delete to authenticated
  using (user_id = auth.uid());

create or replace function public.world_votes_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  e public.world_entries;
  r public.world_rounds;
  recent int;
begin
  select * into e from public.world_entries where id = new.entry_id;
  if e.id is null or e.status <> 'published' then raise exception 'ENTRY_UNAVAILABLE'; end if;
  -- Only registered people (profile with accepted rules and consents) can vote
  if not exists (select 1 from public.world_profiles where user_id = new.user_id and not is_banned) then
    raise exception 'PROFILE_REQUIRED';
  end if;
  select * into r from public.world_rounds where id = e.round_id;
  if now() >= r.ends_at then raise exception 'ROUND_CLOSED'; end if;
  -- Light anti-abuse: max 60 hearts per account per hour
  select count(*) into recent from public.world_votes
    where user_id = new.user_id and created_at > now() - interval '1 hour';
  if recent >= 60 then raise exception 'VOTE_RATE_LIMIT'; end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists world_votes_before_insert on public.world_votes;
create trigger world_votes_before_insert before insert on public.world_votes
  for each row execute function public.world_votes_before_insert();

-- Votes can only be withdrawn while the round is open
create or replace function public.world_votes_before_delete()
returns trigger language plpgsql security definer set search_path = public as $$
declare r_end timestamptz;
begin
  select r.ends_at into r_end from public.world_entries e join public.world_rounds r on r.id = e.round_id
    where e.id = old.entry_id;
  if r_end is not null and now() >= r_end and not public.world_is_admin() then
    raise exception 'ROUND_CLOSED';
  end if;
  return old;
end $$;

drop trigger if exists world_votes_before_delete on public.world_votes;
create trigger world_votes_before_delete before delete on public.world_votes
  for each row execute function public.world_votes_before_delete();

-- Keep world_entries.vote_count in sync
create or replace function public.world_votes_count_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('world.counter_update', 'on', true);
  if tg_op = 'INSERT' then
    update public.world_entries set vote_count = vote_count + 1 where id = new.entry_id;
  elsif tg_op = 'DELETE' then
    update public.world_entries set vote_count = greatest(vote_count - 1, 0) where id = old.entry_id;
  end if;
  perform set_config('world.counter_update', 'off', true);
  return null;
end $$;

drop trigger if exists world_votes_count_sync on public.world_votes;
create trigger world_votes_count_sync after insert or delete on public.world_votes
  for each row execute function public.world_votes_count_sync();

-- ── Reports ─────────────────────────────────────────────────────────────────
create table if not exists public.world_reports (
  id         bigint generated by default as identity primary key,
  created_at timestamptz not null default now(),
  entry_id   uuid not null references public.world_entries(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete set null,
  reason     text check (reason is null or char_length(reason) <= 300),
  unique (entry_id, user_id)
);

alter table public.world_reports enable row level security;

drop policy if exists world_reports_insert on public.world_reports;
create policy world_reports_insert on public.world_reports
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists world_reports_admin_read on public.world_reports;
create policy world_reports_admin_read on public.world_reports
  for select to authenticated
  using (public.world_is_admin());

drop policy if exists world_reports_admin_delete on public.world_reports;
create policy world_reports_admin_delete on public.world_reports
  for delete to authenticated
  using (public.world_is_admin());

-- Count reports; auto-hide an entry after 5 reports until an admin reviews it
create or replace function public.world_reports_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('world.counter_update', 'on', true);
  update public.world_entries
     set report_count = report_count + 1,
         status = case when report_count + 1 >= 5 then 'hidden' else status end
   where id = new.entry_id;
  perform set_config('world.counter_update', 'off', true);
  return null;
end $$;

drop trigger if exists world_reports_after_insert on public.world_reports;
create trigger world_reports_after_insert after insert on public.world_reports
  for each row execute function public.world_reports_after_insert();

-- ── Jury: wildcards and placings ────────────────────────────────────────────
create table if not exists public.world_wildcards (
  entry_id   uuid primary key references public.world_entries(id) on delete cascade,
  round_id   uuid not null references public.world_rounds(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.world_placements (
  round_id   uuid not null references public.world_rounds(id) on delete cascade,
  place      smallint not null check (place between 1 and 3),
  entry_id   uuid not null unique references public.world_entries(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (round_id, place)
);

alter table public.world_wildcards enable row level security;
alter table public.world_placements enable row level security;

drop policy if exists world_wildcards_read on public.world_wildcards;
create policy world_wildcards_read on public.world_wildcards
  for select to anon, authenticated
  using (public.world_is_admin() or exists (
    select 1 from public.world_rounds r where r.id = round_id and (r.wildcards_published or r.results_published)));

drop policy if exists world_wildcards_admin_write on public.world_wildcards;
create policy world_wildcards_admin_write on public.world_wildcards
  for all to authenticated
  using (public.world_is_admin())
  with check (public.world_is_admin());

drop policy if exists world_placements_read on public.world_placements;
create policy world_placements_read on public.world_placements
  for select to anon, authenticated
  using (public.world_is_admin() or exists (
    select 1 from public.world_rounds r where r.id = round_id and r.results_published));

drop policy if exists world_placements_admin_write on public.world_placements;
create policy world_placements_admin_write on public.world_placements
  for all to authenticated
  using (public.world_is_admin())
  with check (public.world_is_admin());

-- Wildcards and placings must be approved looks from the same round;
-- 1st place needs the 1st-prize claim with verified reviews; wildcards are capped per round.
create or replace function public.world_jury_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  e public.world_entries;
  r public.world_rounds;
  n int;
begin
  select * into e from public.world_entries where id = new.entry_id;
  if e.id is null or e.round_id <> new.round_id then raise exception 'WRONG_ROUND'; end if;
  if e.status <> 'published' then raise exception 'ENTRY_NOT_APPROVED'; end if;
  if tg_table_name = 'world_placements' then
    if new.place = 1 and not (e.first_prize_claim and e.reviews_verified) then
      raise exception 'FIRST_PRIZE_NOT_QUALIFIED';
    end if;
  else
    select * into r from public.world_rounds where id = new.round_id;
    select count(*) into n from public.world_wildcards where round_id = new.round_id and entry_id <> new.entry_id;
    if n >= r.max_wildcards then raise exception 'WILDCARD_LIMIT'; end if;
  end if;
  return new;
end $$;

drop trigger if exists world_placements_check on public.world_placements;
create trigger world_placements_check before insert or update on public.world_placements
  for each row execute function public.world_jury_check();

drop trigger if exists world_wildcards_check on public.world_wildcards;
create trigger world_wildcards_check before insert or update on public.world_wildcards
  for each row execute function public.world_jury_check();

-- ── Automatic email log (written only by the scheduled sender, service role) ─
-- kind: entry_live | progress | final_call | results | new_round
create table if not exists public.world_email_log (
  id       bigint generated by default as identity primary key,
  sent_at  timestamptz not null default now(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  kind     text not null,
  ref      text not null,
  unique (user_id, kind, ref)
);

alter table public.world_email_log enable row level security;

drop policy if exists world_email_log_admin_read on public.world_email_log;
create policy world_email_log_admin_read on public.world_email_log
  for select to authenticated
  using (public.world_is_admin());

-- Admin summary numbers (admins only)
create or replace function public.world_admin_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.world_is_admin() then raise exception 'NOT_ADMIN'; end if;
  return json_build_object(
    'profiles', (select count(*) from public.world_profiles),
    'competition_emails_opt_in', (select count(*) from public.world_profiles where competition_emails_opt_in),
    'marketing_opt_in', (select count(*) from public.world_profiles where marketing_opt_in),
    'entries', (select count(*) from public.world_entries),
    'pending', (select count(*) from public.world_entries where status = 'pending'),
    'votes', (select count(*) from public.world_votes),
    'profiles_by_source', (select coalesce(json_object_agg(src, n), '{}'::json) from (
        select coalesce(signup_source, 'unknown') src, count(*) n from public.world_profiles group by 1) s),
    'votes_by_source', (select coalesce(json_object_agg(src, n), '{}'::json) from (
        select coalesce(source_site, 'unknown') src, count(*) n from public.world_votes group by 1) s),
    'emails_sent', (select coalesce(json_object_agg(kind, n), '{}'::json) from (
        select kind, count(*) n from public.world_email_log group by 1) s)
  );
end $$;
revoke all on function public.world_admin_stats() from public, anon;
grant execute on function public.world_admin_stats() to authenticated;

-- ── Storage bucket for photos ───────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('world-entries', 'world-entries', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 8388608, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists world_entries_upload_own on storage.objects;
create policy world_entries_upload_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'world-entries' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists world_entries_delete_own on storage.objects;
create policy world_entries_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'world-entries' and ((storage.foldername(name))[1] = auth.uid()::text or public.world_is_admin()));

-- ── First round: Anything Autumn (26 Oct – 14 Nov 2026, Icons of November 2026)
insert into public.world_rounds (slug, theme, title, description, starts_at, ends_at, icon_month, max_entries_per_user)
values (
  '2026-11-anything-autumn',
  'autumn',
  '{"en": "Anything Autumn"}',
  '{"en": "Burnt oranges, deep berries, cosy nudes, falling-leaf art: show us your autumn in nails."}',
  '2026-10-26 00:00:00+02',
  '2026-11-15 00:00:00+02',
  '2026-11-01',
  1
)
on conflict (slug) do nothing;
