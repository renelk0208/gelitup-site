-- Ambassador admin, step 3: the next package is due 4 weeks after the last one
-- was sent, automatically.
--
-- Whenever a package is recorded (or its sent date changes, or it is deleted),
-- the ambassador's next_package_due becomes  last sent date + 28 days.
-- The old [SHIPMENT_NEXT_REMINDER_AT:…] tag is kept in step so every part of
-- the admin shows the same date.
--
-- Also records Anastogianni Eirini's second package (Geniki 5513756603, sent
-- 14 Sep 2026), which was never entered.
--
-- Run once in the Supabase SQL Editor. Safe to re-run; it never changes
-- existing dates.

-- ── 1. One function that works out the date for one ambassador ─────────────
create or replace function public.refresh_ambassador_next_package_due(p_application_id bigint)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_sent timestamptz;
  v_due date;
  v_tag text;
begin
  select max(sent_at) into v_last_sent
    from public.ambassador_shipments
   where application_id = p_application_id
     and status = 'sent'
     and sent_at is not null;

  if v_last_sent is null then
    return null;  -- nothing sent yet: no date
  end if;

  v_due := (v_last_sent at time zone 'Europe/Athens')::date + 28;
  v_tag := '[SHIPMENT_NEXT_REMINDER_AT:' || to_char(v_due, 'YYYY-MM-DD') || 'T10:00:00.000Z]';

  update public.ambassador_applications app
     set next_package_due = v_due,
         admin_comment = case
           when coalesce(app.admin_comment, '') ~ '\[SHIPMENT_NEXT_REMINDER_AT:[^\]]*\]'
             then regexp_replace(app.admin_comment, '\[SHIPMENT_NEXT_REMINDER_AT:[^\]]*\]', v_tag, 'g')
           when coalesce(app.admin_comment, '') = '' then v_tag
           else app.admin_comment || E'\n' || v_tag
         end
   where app.id = p_application_id
     and app.paused_at is null;  -- paused ambassadors keep no date

  return v_due;
end;
$$;

revoke all on function public.refresh_ambassador_next_package_due(bigint) from public;

-- ── 2. Run it every time a package is added, changed or removed ────────────
create or replace function public.trg_ambassador_shipment_next_due()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_ambassador_next_package_due(old.application_id);
    return old;
  end if;
  perform public.refresh_ambassador_next_package_due(new.application_id);
  return new;
end;
$$;

drop trigger if exists trg_ambassador_shipment_next_due on public.ambassador_shipments;
create trigger trg_ambassador_shipment_next_due
  after insert or delete or update of sent_at, status, application_id
  on public.ambassador_shipments
  for each row execute function public.trg_ambassador_shipment_next_due();

-- ── 3. Anastogianni Eirini (id 4): second package, Geniki, 14 Sep 2026 ──────
insert into public.ambassador_shipments
  (application_id, status, ambassador_type, items, method, tracking_number, tracking_url,
   sent_at, carrier, expected_delivery, created_by, legacy_source)
select 4, 'sent', app.ambassador_type, '{}', 'courier', '5513756603',
       'https://www.taxydromiki.com/en/tracking',
       timestamptz '2026-09-14 12:00:00+03', 'geniki', date '2026-09-17',
       'René Krallis', 'Added 12 Oct 2026: second package confirmed by René'
  from public.ambassador_applications app
 where app.id = 4
   and not exists (
     select 1 from public.ambassador_shipments s
      where s.application_id = 4 and s.tracking_number = '5513756603'
   );

-- (Existing dates are NOT recalculated: the rule applies from the next package
-- sent. An earlier version of this file recalculated everyone; those dates were
-- put back on 12 Oct 2026.)
