-- Track customer responses from abandoned-cart reminder emails.
-- Safe to run multiple times.

alter table public.b2b_draft_carts
  add column if not exists customer_action text,
  add column if not exists customer_action_at timestamptz,
  add column if not exists customer_action_note text;
