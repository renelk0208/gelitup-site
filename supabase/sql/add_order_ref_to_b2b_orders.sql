-- Adds a human-readable order reference column to b2b_orders.
-- Generated client-side as YY-XXXX (e.g. 26-4731) before each insert.
-- The internal `id` (bigint identity) is unchanged and still used for admin/Zoho.

ALTER TABLE public.b2b_orders
  ADD COLUMN IF NOT EXISTS order_ref text;
