-- Migration: add tracking and payment confirmation columns to b2b_orders
-- Run this once in the Supabase SQL Editor for your project.

alter table public.b2b_orders
  add column if not exists tracking_number  text,
  add column if not exists tracking_url     text,
  add column if not exists payment_confirmed boolean not null default false;
