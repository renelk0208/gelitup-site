-- Admin follow-up workflow: decline reason (emailed to the applicant on decline),
-- and PR box / shipment tracking + comments for approved ambassadors.
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists decline_reason   text,
  add column if not exists shipment_details text,
  add column if not exists tracking_number  text,
  add column if not exists tracking_url     text,
  add column if not exists admin_comment    text;
