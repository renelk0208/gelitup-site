-- Ambassador admin: Educators (4 Nov 2026)
--
-- An Educator stays fully live (portal, code and credit, review requests,
-- receipt confirmation, giveaways) but is outside the monthly package cycle:
-- no next package date, not in the 08:00 overdue/due-soon summary, no
-- automatic follow-up pack, no "choose 5 products".
-- Switched on or off per person from Shipments.
--
-- Already applied to the live database.

alter table public.ambassador_applications add column if not exists is_educator boolean not null default false;

-- The 4-week rule (step 3) now skips educators as well as paused ambassadors.
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
    return null;
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
     and app.paused_at is null      -- paused ambassadors keep no date
     and not app.is_educator;       -- educators get packages when needed, no date

  return v_due;
end;
$$;

revoke all on function public.refresh_ambassador_next_package_due(bigint) from public;
