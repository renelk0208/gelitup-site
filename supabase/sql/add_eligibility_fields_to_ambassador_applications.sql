-- Eligibility confirmations captured on the public application form. Since the
-- form now hard-blocks submission unless all three are answered "yes", these are
-- always true for a stored row — kept as an explicit, per-applicant audit trail
-- of what each ambassador confirmed at the moment they signed.
--   • is_qualified_tech      — holds a recognised nail qualification / certification
--   • work_shown_on_profile  — shows their own nail work on their public profiles
--   • followers_over_500     — has more than 500 followers where they post that work
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists is_qualified_tech     boolean not null default false,
  add column if not exists work_shown_on_profile boolean not null default false,
  add column if not exists followers_over_500    boolean not null default false;
