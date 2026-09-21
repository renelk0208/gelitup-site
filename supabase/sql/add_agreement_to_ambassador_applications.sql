-- Records that an applicant accepted the Ambassador Agreement, and which
-- version of the terms they agreed to. created_at already stores the signed
-- date, and full_name is the electronic signature.
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists agreed_terms      boolean not null default false,
  add column if not exists agreement_version text;
