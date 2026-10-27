-- "Pause or end my collaboration" in the ambassador profile.
-- Pause (1 month / 3 months / until ready) or End. Both set paused_at, so she
-- is skipped by packages and reminders; paused_by = 'ambassador'.
-- She can resume a pause herself (ambassador_resume); an End is for the admin.
-- New opt-outs are listed in the 08:00 email (opt_out_notified_at).
-- Safe to re-run.

alter table public.ambassador_applications
  add column if not exists opt_out_type text check (opt_out_type in ('pause', 'end')),
  add column if not exists opt_out_at timestamptz,
  add column if not exists opt_out_until date,
  add column if not exists opt_out_reason text,
  add column if not exists opt_out_notified_at timestamptz;

create or replace function public.get_my_ambassador_opt_out()
returns table (opt_out_type text, opt_out_at timestamptz, opt_out_until date, paused_by text)
language sql stable security definer set search_path = public as $$
  select a.opt_out_type, a.opt_out_at, a.opt_out_until, a.paused_by
    from public.ambassador_applications a
   where auth.email() is not null and lower(trim(a.email)) = lower(trim(auth.email()))
     and lower(a.status) = 'approved'
   order by a.created_at desc limit 1;
$$;
revoke all on function public.get_my_ambassador_opt_out() from public;
grant execute on function public.get_my_ambassador_opt_out() to authenticated;

create or replace function public.ambassador_opt_out(p_type text, p_months int, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id bigint; v_until date; v_reason text := nullif(left(trim(coalesce(p_reason, '')), 1000), '');
begin
  if auth.email() is null then return 'not_signed_in'; end if;
  if p_type not in ('pause', 'end') then return 'invalid'; end if;
  select a.id into v_id from public.ambassador_applications a
   where lower(trim(a.email)) = lower(trim(auth.email())) and lower(a.status) = 'approved'
   order by a.created_at desc limit 1;
  if v_id is null then return 'not_found'; end if;
  if p_type = 'pause' and p_months in (1, 3) then v_until := (now() at time zone 'Europe/Athens')::date + (p_months || ' months')::interval; end if;
  update public.ambassador_applications
     set opt_out_type = p_type, opt_out_at = now(), opt_out_until = v_until, opt_out_reason = v_reason, opt_out_notified_at = null,
         paused_at = coalesce(paused_at, now()), paused_by = 'ambassador',
         paused_reason = case when p_type = 'end' then 'Ambassador asked to END the collaboration' else 'Ambassador paused her collaboration' end
                         || case when v_until is not null then ' until ' || to_char(v_until, 'DD Mon YYYY') else '' end
                         || coalesce(': ' || v_reason, '')
   where id = v_id;
  return 'ok';
end; $$;
revoke all on function public.ambassador_opt_out(text, int, text) from public;
grant execute on function public.ambassador_opt_out(text, int, text) to authenticated;

create or replace function public.ambassador_resume()
returns text language plpgsql security definer set search_path = public as $$
declare v_rows int;
begin
  if auth.email() is null then return 'not_signed_in'; end if;
  update public.ambassador_applications
     set paused_at = null, paused_by = null, paused_reason = null,
         opt_out_type = null, opt_out_at = null, opt_out_until = null, opt_out_reason = null, opt_out_notified_at = null
   where lower(trim(email)) = lower(trim(auth.email())) and lower(status) = 'approved'
     and paused_by = 'ambassador' and opt_out_type = 'pause';
  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then 'ok' else 'not_allowed' end;
end; $$;
revoke all on function public.ambassador_resume() from public;
grant execute on function public.ambassador_resume() to authenticated;
