-- Add distributor_tier to b2b_orders so each order records what pricing tier was active.
-- Run this once in the Supabase SQL editor.

alter table public.b2b_orders
  add column if not exists distributor_tier text;
