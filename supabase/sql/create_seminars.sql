-- Online seminars portal (gelitup.com/seminars)
-- Attendees sign in with their email + the personal access code they receive
-- after buying a seat on shop.gelitup.com. No website account is created, so
-- seminar buyers never get access to the B2B portal.
-- The stream / replay links are never readable directly: they are only handed
-- out by seminar_room() to the one device currently signed in with a valid code,
-- inside the live window or the replay window.

create extension if not exists pgcrypto;

-- ── Helper: is the signed-in website user a GEL.IT.UP admin? ────────────────
create or replace function public.seminar_is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.b2b_admins where lower(email) = lower(auth.email()));
$$;

-- ── Seminars ────────────────────────────────────────────────────────────────
create table if not exists public.seminars (
  id               uuid primary key default gen_random_uuid(),
  kind             text not null default 'group' check (kind in ('group', 'private')),
  status           text not null default 'draft' check (status in ('draft', 'scheduled', 'ended', 'cancelled')),
  title            text not null,
  description      text,
  trainer_name     text,
  starts_at        timestamptz not null,
  duration_minutes integer not null default 90 check (duration_minutes between 15 and 600),
  seats            integer not null default 20 check (seats > 0),
  replay_days      integer not null default 10 check (replay_days between 0 and 365),
  shopify_sku      text unique,            -- SKU of the seminar date in Shopify, links orders to this seminar
  shop_url         text,                   -- booking page on shop.gelitup.com
  kit_url          text,                   -- seminar kit page on shop.gelitup.com
  image_url        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Stream links live in their own table that nobody can read directly.
create table if not exists public.seminar_media (
  seminar_id     uuid primary key references public.seminars(id) on delete cascade,
  live_embed_url text,   -- Vimeo live event embed (player)
  chat_embed_url text,   -- Vimeo live event chat / Q&A embed
  replay_embed_url text, -- Vimeo recording embed (shown after the seminar)
  updated_at     timestamptz not null default now()
);

-- ── Access codes (one per seat) ─────────────────────────────────────────────
create table if not exists public.seminar_access_codes (
  code               text primary key,
  seminar_id         uuid not null references public.seminars(id) on delete cascade,
  source             text not null default 'shopify' check (source in ('shopify', 'manual')),
  order_ref          text,
  order_line_key     text unique,          -- shopify order id : line item id : seat number (prevents duplicates on webhook retries)
  buyer_email        text,
  buyer_name         text,
  attendee_email     text,                 -- locked on first sign-in
  first_used_at      timestamptz,
  session_token      text,                 -- only the most recent device stays signed in
  session_started_at timestamptz,
  last_seen_at       timestamptz,
  revoked            boolean not null default false,
  emailed_at         timestamptz,
  note               text,
  created_at         timestamptz not null default now()
);
create index if not exists seminar_access_codes_seminar_idx on public.seminar_access_codes (seminar_id);
create index if not exists seminar_access_codes_token_idx on public.seminar_access_codes (session_token);

-- ── Private seminar requests ────────────────────────────────────────────────
create table if not exists public.seminar_private_requests (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text not null,
  phone           text,
  country         text,
  timezone        text,
  preferred_slots jsonb not null default '[]'::jsonb,  -- [{date, time}]
  topic           text not null,
  attendees       integer not null default 1 check (attendees between 1 and 100),
  wants_kit       boolean not null default false,
  notes           text,
  status          text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'declined')),
  seminar_id      uuid references public.seminars(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ── Row level security ──────────────────────────────────────────────────────
alter table public.seminars                 enable row level security;
alter table public.seminar_media            enable row level security;
alter table public.seminar_access_codes     enable row level security;
alter table public.seminar_private_requests enable row level security;

drop policy if exists seminars_public_read on public.seminars;
create policy seminars_public_read on public.seminars
  for select using (kind = 'group' and status in ('scheduled', 'ended') or public.seminar_is_admin());

drop policy if exists seminars_admin_write on public.seminars;
create policy seminars_admin_write on public.seminars
  for all using (public.seminar_is_admin()) with check (public.seminar_is_admin());

drop policy if exists seminar_media_admin on public.seminar_media;
create policy seminar_media_admin on public.seminar_media
  for all using (public.seminar_is_admin()) with check (public.seminar_is_admin());

drop policy if exists seminar_codes_admin on public.seminar_access_codes;
create policy seminar_codes_admin on public.seminar_access_codes
  for all using (public.seminar_is_admin()) with check (public.seminar_is_admin());

drop policy if exists seminar_requests_insert on public.seminar_private_requests;
create policy seminar_requests_insert on public.seminar_private_requests
  for insert with check (status = 'new' and seminar_id is null);

drop policy if exists seminar_requests_admin on public.seminar_private_requests;
create policy seminar_requests_admin on public.seminar_private_requests
  for all using (public.seminar_is_admin()) with check (public.seminar_is_admin());

-- ── Code generation ─────────────────────────────────────────────────────────
-- SEM-XXXX-XXXX-XXXX from an alphabet without look-alike characters (no 0/O, 1/I/L).
create or replace function public.seminar_new_code()
returns text
language plpgsql volatile
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  v_out text;
  i int;
begin
  loop
    bytes := gen_random_bytes(12);
    v_out := 'SEM-';
    for i in 0..11 loop
      v_out := v_out || substr(alphabet, (get_byte(bytes, i) % length(alphabet)) + 1, 1);
      if i in (3, 7) then v_out := v_out || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.seminar_access_codes where code = v_out);
  end loop;
  return v_out;
end;
$$;

-- Admin: issue codes by hand (comps, ambassadors, private seminars).
create or replace function public.admin_issue_seminar_codes(
  p_seminar_id uuid, p_email text, p_name text default null, p_count int default 1, p_note text default null
)
returns setof text
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  c text;
  i int;
begin
  if not public.seminar_is_admin() then raise exception 'not allowed'; end if;
  if p_count < 1 or p_count > 50 then raise exception 'count must be 1-50'; end if;
  for i in 1..p_count loop
    c := public.seminar_new_code();
    insert into public.seminar_access_codes (code, seminar_id, source, buyer_email, buyer_name, note)
    values (c, p_seminar_id, 'manual', lower(trim(p_email)), p_name, p_note);
    return next c;
  end loop;
end;
$$;

-- ── Attendee sign-in: email + code ──────────────────────────────────────────
-- First sign-in locks the code to that email. Each sign-in starts a new session
-- for that email and signs out any other device (one device per attendee).
create or replace function public.seminar_claim_code(p_email text, p_code text, p_token text)
returns text   -- null when ok, otherwise an error key
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
  r public.seminar_access_codes;
begin
  if v_code !~ '^SEM-' then v_code := 'SEM-' || v_code; end if;
  select * into r from public.seminar_access_codes where code = v_code for update;
  if not found or r.revoked then
    perform pg_sleep(0.6);  -- slow down guessing
    return 'invalid_code';
  end if;
  if r.attendee_email is not null and r.attendee_email <> p_email then
    perform pg_sleep(0.6);
    return 'code_in_use';
  end if;
  update public.seminar_access_codes
     set attendee_email = p_email,
         first_used_at = coalesce(first_used_at, now())
   where code = v_code;
  return null;
end;
$$;

create or replace function public.seminar_sign_in(p_email text, p_code text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, extensions
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_err text;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;
  v_err := public.seminar_claim_code(v_email, p_code, v_token);
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;

  update public.seminar_access_codes
     set session_token = v_token, session_started_at = now(), last_seen_at = now()
   where attendee_email = v_email and not revoked;

  return jsonb_build_object('ok', true, 'token', v_token, 'email', v_email);
end;
$$;

-- Add another code while signed in (e.g. she booked a second seminar).
create or replace function public.seminar_add_code(p_token text, p_code text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_email text;
  v_err text;
begin
  if coalesce(p_token, '') = '' then return jsonb_build_object('ok', false, 'error', 'signed_out'); end if;
  select attendee_email into v_email from public.seminar_access_codes where session_token = p_token and not revoked limit 1;
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'signed_out'); end if;
  v_err := public.seminar_claim_code(v_email, p_code, p_token);
  if v_err is not null then return jsonb_build_object('ok', false, 'error', v_err); end if;
  update public.seminar_access_codes set session_token = p_token where attendee_email = v_email and not revoked;
  return jsonb_build_object('ok', true);
end;
$$;

-- ── Attendee: "My seminars" + the room ─────────────────────────────────────
-- Stream links are attached only while a seminar is open (live or replay window).
create or replace function public.seminar_room(p_token text)
returns jsonb
language plpgsql volatile security definer
set search_path = public
as $$
declare
  v_email text;
  result jsonb;
begin
  if coalesce(p_token, '') = '' then return jsonb_build_object('ok', false, 'error', 'signed_out'); end if;
  select attendee_email into v_email from public.seminar_access_codes where session_token = p_token and not revoked limit 1;
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'signed_out'); end if;

  update public.seminar_access_codes set last_seen_at = now() where session_token = p_token;

  select coalesce(jsonb_agg(
           case x.phase
             when 'live'   then to_jsonb(x) || jsonb_build_object('live_embed_url', m.live_embed_url, 'chat_embed_url', m.chat_embed_url)
             when 'replay' then to_jsonb(x) || jsonb_build_object('replay_embed_url', m.replay_embed_url)
             else to_jsonb(x)
           end order by x.starts_at), '[]'::jsonb)
    into result
  from (
    select distinct on (s.id)
           s.id, s.title, s.description, s.trainer_name, s.starts_at, s.duration_minutes, s.status, s.kind,
           s.kit_url, s.image_url, s.replay_days,
           s.starts_at + make_interval(mins => s.duration_minutes) as ends_at,
           s.starts_at + make_interval(mins => s.duration_minutes) + make_interval(days => s.replay_days) as replay_until,
           case
             when s.status = 'cancelled' then 'cancelled'
             when now() < s.starts_at - interval '30 minutes' then 'upcoming'
             when s.status <> 'ended' and now() < s.starts_at + make_interval(mins => s.duration_minutes) + interval '60 minutes' then 'live'
             when now() < s.starts_at + make_interval(mins => s.duration_minutes) + make_interval(days => s.replay_days) then
               case when mm.replay_embed_url is not null then 'replay' else 'replay_pending' end
             else 'expired'
           end as phase
    from public.seminar_access_codes c
    join public.seminars s on s.id = c.seminar_id
    left join public.seminar_media mm on mm.seminar_id = s.id
    where c.session_token = p_token and not c.revoked
    order by s.id
  ) x
  left join public.seminar_media m on m.seminar_id = x.id;

  return jsonb_build_object('ok', true, 'email', v_email, 'seminars', result);
end;
$$;

create or replace function public.seminar_sign_out(p_token text)
returns void
language sql volatile security definer
set search_path = public
as $$
  update public.seminar_access_codes set session_token = null where session_token = p_token and coalesce(p_token, '') <> '';
$$;

-- Public: seats left per seminar (from codes issued), for the booking list.
create or replace function public.seminar_seats_taken(p_seminar_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select count(*)::int from public.seminar_access_codes where seminar_id = p_seminar_id and not revoked;
$$;

revoke all on function public.seminar_new_code() from public, anon, authenticated;
revoke all on function public.seminar_claim_code(text, text, text) from public, anon, authenticated;
grant execute on function public.seminar_sign_in(text, text)      to anon, authenticated;
grant execute on function public.seminar_room(text)               to anon, authenticated;
grant execute on function public.seminar_add_code(text, text)     to anon, authenticated;
grant execute on function public.seminar_sign_out(text)           to anon, authenticated;
grant execute on function public.seminar_seats_taken(uuid)        to anon, authenticated;
grant execute on function public.admin_issue_seminar_codes(uuid, text, text, int, text) to authenticated;
grant execute on function public.seminar_is_admin()               to anon, authenticated;
