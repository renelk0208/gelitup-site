-- Receipt confirmation rule: an ambassador must confirm she received her
-- package; until she does, her next package is on hold.
--   - Profile banner: get_my_unconfirmed_ambassador_shipment()
--   - One reminder email (send-ambassador-receipt-reminders): receipt_reminder_at
-- Safe to re-run.

alter table public.ambassador_shipments
  add column if not exists receipt_reminder_at timestamptz;

-- Her most recent package that is not lost and not yet confirmed (or none).
create or replace function public.get_my_unconfirmed_ambassador_shipment()
returns table (id bigint, items text[], sent_at timestamptz, expected_delivery date, carrier text, tracking_number text, tracking_url text)
language sql
stable
security definer
set search_path = public
as $$
  with latest as (
    select s.*
      from public.ambassador_shipments s
      join public.ambassador_applications app on app.id = s.application_id
     where s.status = 'sent'
       and s.lost_at is null
       and auth.email() is not null
       and lower(trim(app.email)) = lower(trim(auth.email()))
     order by s.sent_at desc nulls last
     limit 1
  )
  select id, items, sent_at, expected_delivery, carrier, tracking_number, tracking_url
    from latest
   where delivered_at is null
     -- The banner only shows once reminders are switched on in admin.
     and exists (select 1 from public.app_settings st where st.key = 'receipt_reminders_on' and st.value = 'true'::jsonb);
$$;

revoke all on function public.get_my_unconfirmed_ambassador_shipment() from public;
grant execute on function public.get_my_unconfirmed_ambassador_shipment() to authenticated;

-- Reminder emails start OFF; switched on in admin (Shipments view).
insert into public.app_settings (key, value, updated_by)
values ('receipt_reminders_on', 'false'::jsonb, 'setup')
on conflict (key) do nothing;
