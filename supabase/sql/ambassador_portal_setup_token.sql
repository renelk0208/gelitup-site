-- Ambassador portal: create the login on approval, and let the ambassador set
-- her own password from the approval email.
--
-- The admin creates the ambassador's login as soon as she is approved, so the
-- usual "create password" page would answer "account already exists". The
-- approval email therefore carries a private, single-use token. With that
-- token (and her own email) the function below sets her password on the
-- existing login. Opening the link does nothing on its own (so email link
-- scanners cannot use it up); only submitting the password form does.

alter table public.ambassador_applications
  add column if not exists portal_setup_token uuid,
  add column if not exists portal_setup_token_created_at timestamptz,
  add column if not exists portal_password_set_at timestamptz;

create unique index if not exists ambassador_applications_portal_setup_token_key
  on public.ambassador_applications (portal_setup_token)
  where portal_setup_token is not null;

create or replace function public.ambassador_set_portal_password(
  p_email text,
  p_token uuid,
  p_password text
) returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_app_id bigint;
  v_user_id uuid;
begin
  if p_token is null or v_email = '' then
    return 'invalid_link';
  end if;
  if p_password is null or length(p_password) < 8 then
    return 'weak_password';
  end if;

  select a.id into v_app_id
  from public.ambassador_applications a
  where a.portal_setup_token = p_token
    and lower(trim(a.email)) = v_email
    and a.status in ('approved', 'paused')
    and coalesce(a.portal_setup_token_created_at, now()) > now() - interval '120 days'
  limit 1;

  if v_app_id is null then
    return 'invalid_link';
  end if;

  select u.id into v_user_id
  from auth.users u
  where lower(u.email) = v_email
  limit 1;

  if v_user_id is null then
    -- No login yet: the page falls back to the normal sign-up.
    return 'no_account';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)),
         email_confirmed_at = coalesce(email_confirmed_at, now()),
         updated_at = now()
   where id = v_user_id;

  update public.ambassador_applications
     set portal_password_set_at = now(),
         portal_setup_token = null,
         auth_user_id = coalesce(auth_user_id, v_user_id)
   where id = v_app_id;

  return 'ok';
end;
$$;

revoke all on function public.ambassador_set_portal_password(text, uuid, text) from public;
grant execute on function public.ambassador_set_portal_password(text, uuid, text) to anon, authenticated;
