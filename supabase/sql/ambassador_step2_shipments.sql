-- Ambassador admin, step 2: carrier, expected delivery and "received" for
-- every package, so the Shipments screen can show what was sent, how, when it
-- should arrive and whether it did.
--
-- Run once in the Supabase SQL Editor after ambassador_step1_structured_data.sql.
-- Safe to re-run: only fills empty fields.

alter table public.ambassador_shipments
  add column if not exists carrier           text,
  add column if not exists expected_delivery date,
  add column if not exists delivered_at      timestamptz,
  add column if not exists delivered_by      text;

-- ── Carrier for packages already sent (same rules as src/lib/ambassadorShipping.js)
update public.ambassador_shipments
   set carrier = case
     when tracking_url ilike '%taxydromiki%' or tracking_url ilike '%geniki%' or upper(tracking_number) ~ '^GEN[EI]KI' then 'geniki'
     when tracking_url ilike '%speedy%' then 'speedy'
     when tracking_url ilike '%gls%' then 'gls'
     when tracking_url ilike '%bgpost%' or upper(tracking_number) ~ '^[A-Z]{2}[0-9]{9}BG$' then 'bgpost'
     when tracking_number ~ '^[0-9]{13}$' then 'gls'
     when tracking_number ~ '^55[0-9]{8}$' then 'geniki'
     when coalesce(tracking_number, tracking_url) is not null then 'other'
   end
 where carrier is null;

-- ── Expected delivery: sent date + estimated days by carrier and country
with c as (
  select s.id,
         s.carrier,
         case
           when lower(trim(trailing '''' from trim(a.country))) in ('greece', 'ελλάδα', 'ελλαδα', 'hellas') then 'greece'
           when lower(trim(a.country)) in ('romania', 'românia') then 'romania'
           when lower(trim(a.country)) in ('bulgaria', 'българия') then 'bulgaria'
           else lower(trim(a.country))
         end as country_key,
         lower(trim(a.country)) in (
           'austria','belgium','belgië','bulgaria','croatia','cyprus','czech republic','denmark','estonia','finland',
           'france','germany','deutschland','greece','ελλάδα','hungary','ireland','italy','italia','latvia','lithuania',
           'luxembourg','malta','netherlands','poland','polska','portugal','portugal açores','romania','românia',
           'slovakia','slovenia','spain','españa','sweden'
         ) or lower(trim(trailing '''' from trim(a.country))) = 'greece' as in_eu,
         s.sent_at
    from public.ambassador_shipments s
    join public.ambassador_applications a on a.id = s.application_id
   where s.expected_delivery is null and s.sent_at is not null
)
update public.ambassador_shipments s
   set expected_delivery = ((c.sent_at at time zone 'Europe/Athens')::date + case c.carrier
       when 'geniki' then case when c.country_key = 'greece' then 3 else 7 end
       when 'speedy' then case when c.country_key = 'bulgaria' then 2
                               when c.country_key in ('greece', 'romania') then 4 else 6 end
       when 'gls'    then case when c.in_eu then 6 else 10 end
       when 'bgpost' then case when c.in_eu then 14 else 21 end
       else 10 end)
  from c
 where c.id = s.id;

-- ── The ambassador confirms receipt from the portal
create or replace function public.confirm_my_ambassador_shipment(p_shipment_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  update public.ambassador_shipments s
     set delivered_at = now(),
         delivered_by = 'ambassador'
   where s.id = p_shipment_id
     and s.delivered_at is null
     and s.status = 'sent'
     and auth.email() is not null
     and exists (
       select 1 from public.ambassador_applications app
        where app.id = s.application_id
          and lower(trim(app.email)) = lower(trim(auth.email()))
     );
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.confirm_my_ambassador_shipment(bigint) from public;
grant execute on function public.confirm_my_ambassador_shipment(bigint) to authenticated;

-- ── Portal list now also returns carrier, expected delivery and received
drop function if exists public.get_my_ambassador_shipments();
create function public.get_my_ambassador_shipments()
returns table (
  id bigint,
  items text[],
  method text,
  tracking_number text,
  tracking_url text,
  sent_at timestamptz,
  carrier text,
  expected_delivery date,
  delivered_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.items, s.method, s.tracking_number, s.tracking_url, s.sent_at,
         s.carrier, s.expected_delivery, s.delivered_at
    from public.ambassador_shipments s
    join public.ambassador_applications app on app.id = s.application_id
   where s.status = 'sent'
     and auth.email() is not null
     and lower(trim(app.email)) = lower(trim(auth.email()))
   order by s.sent_at desc nulls last
   limit 24;
$$;

revoke all on function public.get_my_ambassador_shipments() from public;
grant execute on function public.get_my_ambassador_shipments() to authenticated;
