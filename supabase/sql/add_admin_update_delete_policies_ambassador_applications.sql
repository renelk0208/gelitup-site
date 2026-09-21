-- Admin UPDATE + DELETE row-level-security policies for ambassador_applications.
-- Without these, the admin approve/decline/follow-up writes were silently blocked
-- by RLS (0 rows changed, no error) — statuses never persisted and the approval
-- email re-sent on every click. Run once in the Supabase SQL Editor.

drop policy if exists "ambassador_applications_update_admin" on public.ambassador_applications;
create policy "ambassador_applications_update_admin"
  on public.ambassador_applications
  for update
  to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())))
  with check (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));

drop policy if exists "ambassador_applications_delete_admin" on public.ambassador_applications;
create policy "ambassador_applications_delete_admin"
  on public.ambassador_applications
  for delete
  to authenticated
  using (exists (select 1 from public.b2b_admins a where lower(a.email) = lower(auth.email())));
