-- Add Zoho Books integration columns to b2b_orders
-- Run this migration once against your Supabase project.

alter table public.b2b_orders
  add column if not exists zoho_salesorder_id     text,
  add column if not exists zoho_salesorder_number text,
  add column if not exists zoho_invoice_id        text,
  add column if not exists zoho_invoice_number    text,
  add column if not exists zoho_invoice_total     numeric,
  add column if not exists zoho_invoice_currency  text,
  add column if not exists payment_status         text not null default 'pending';

-- Index for fast lookups by Zoho IDs (used by webhook receiver)
create index if not exists b2b_orders_zoho_salesorder_id_idx on public.b2b_orders (zoho_salesorder_id);
create index if not exists b2b_orders_zoho_invoice_id_idx    on public.b2b_orders (zoho_invoice_id);
create index if not exists b2b_orders_payment_status_idx     on public.b2b_orders (payment_status);
