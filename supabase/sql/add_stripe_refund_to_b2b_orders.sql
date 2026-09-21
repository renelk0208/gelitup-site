-- Migration: add Stripe refund tracking columns to b2b_orders
-- Run once in the Supabase SQL editor.

alter table public.b2b_orders
  add column if not exists stripe_payment_intent text,
  add column if not exists stripe_refund_id       text;
