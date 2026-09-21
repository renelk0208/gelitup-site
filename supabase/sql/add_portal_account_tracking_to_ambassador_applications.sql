-- Track when ambassador portal accounts are created and when a reminder was sent.
-- Safe to run multiple times.

alter table public.ambassador_applications
  add column if not exists portal_account_created_at timestamptz,
  add column if not exists portal_account_reminder_sent_at timestamptz;

create or replace function public.mark_ambassador_portal_account_created()
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_timestamp timestamptz;
begin
  update public.ambassador_applications
     set portal_account_created_at = coalesce(portal_account_created_at, now())
   where lower(email) = lower(auth.email())
   returning portal_account_created_at into v_timestamp;

  return v_timestamp;
end;
$$;

grant execute on function public.mark_ambassador_portal_account_created() to authenticated;
