-- Outbound message trail for ambassador applicants.
-- Every email the team sends an applicant (welcome, decline, free-form message,
-- shipment/tracking) is appended here so ALL admins can see the full
-- communication history. Kept separate from admin_comment, which stays as the
-- editable/deletable internal-notes field.
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists message_log text;
