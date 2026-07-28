-- Captures the applicant's site language at submission so approval emails and
-- courtesy contract translations can be sent in their language.
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists language text;
