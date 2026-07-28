-- Lets an existing ambassador applicant self-serve their shipping details (for
-- sample & PR boxes) via the /ambassador-details page, without re-applying and
-- without an admin. SECURITY DEFINER so it can update the row under RLS; only
-- ever touches the shipping columns, matched by the email they applied with.
-- Run once in the Supabase SQL Editor.

create or replace function public.set_ambassador_shipping(
  p_email       text,
  p_phone       text,
  p_address     text,
  p_city        text,
  p_postal_code text,
  p_country     text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare updated int;
begin
  update public.ambassador_applications
     set phone       = coalesce(nullif(trim(p_phone), ''), phone),
         address     = coalesce(nullif(trim(p_address), ''), address),
         city        = coalesce(nullif(trim(p_city), ''), city),
         postal_code = coalesce(nullif(trim(p_postal_code), ''), postal_code),
         country     = coalesce(nullif(trim(p_country), ''), country)
   where lower(email) = lower(trim(p_email));
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

grant execute on function public.set_ambassador_shipping(text, text, text, text, text, text) to anon, authenticated;
