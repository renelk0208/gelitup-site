-- Contact + shipping details needed to send sample and PR boxes to ambassadors,
-- plus optional Facebook handle. Collected on the public application form.
-- Run once in the Supabase SQL Editor.

alter table public.ambassador_applications
  add column if not exists phone       text,
  add column if not exists address     text,
  add column if not exists city        text,
  add column if not exists postal_code text,
  add column if not exists facebook    text;
