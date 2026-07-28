-- Review metadata for the admin approval workflow. The Admin Dashboard's
-- Ambassador Applications panel writes reviewed_at on approve/reject; without
-- these columns the update fails and the status change (and applicant email)
-- silently never happen.
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text;
