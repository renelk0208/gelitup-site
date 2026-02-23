# Netlify Live Deployment Guide

This project is ready for Netlify with SPA routing and Netlify Functions.

## 1) Connect repository

1. Open Netlify → **Add new site** → **Import from Git**.
2. Select this repository.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

`netlify.toml` already contains these defaults.

## 2) Set production environment variables

In Netlify site settings → **Environment variables**, add:

### Required core

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ENABLE_PORTAL=true`
- `VITE_REQUIRE_B2B_APPROVAL=true`

### Recommended table names

- `VITE_B2B_PRODUCTS_TABLE=b2b_products`
- `VITE_B2B_ORDERS_TABLE=b2b_orders`
- `VITE_B2B_REGISTRATIONS_TABLE=b2b_registrations`
- `VITE_B2B_ORDER_INBOX=distribution@gelitup.com`

### Email/notification flow

- `VITE_EMAIL_WEBHOOK_URL=https://<your-project-ref>.functions.supabase.co/b2b-email-notifications`
- `VITE_EMAIL_FROM=distributors@gelitup.com`
- `VITE_EMAIL_REPLY_TO=distribution@gelitup.com`

### Optional integrations

- `VITE_ENABLE_ZOHO_SYNC=true`
- `VITE_ZOHO_SYNC_WEBHOOK_URL=https://<your-project-ref>.functions.supabase.co/zoho-sync-order`
- `VITE_ZOHO_SYNC_AUTH_TOKEN=<token>`
- `VITE_ZOHO_SYNC_TARGET=books`
- `VITE_ZOHO_SYNC_TIMEOUT_MS=12000`

## 3) Prepare production Supabase DB

Run these scripts in Supabase SQL editor for the production project:

- `supabase/sql/create_b2b_products.sql`
- `supabase/sql/create_b2b_orders.sql`
- `supabase/sql/create_b2b_registrations.sql`

Also add at least one admin reviewer:

```sql
insert into public.b2b_admins (email) values ('your-admin@email.com');
```

## 4) Deploy and smoke-test

After first deploy, verify:

1. Public homepage loads.
2. `/full-catalogue` loads images and category heroes.
3. Registration submit works and creates `pending` row in `b2b_registrations`.
4. Admin account can open `/portal/dashboard/applications`, approve, and send notification.
5. Approved user can login and submit order.

## 5) Domain cutover

1. Add custom domain in Netlify.
2. Update DNS at your registrar to Netlify target.
3. Wait for SSL to issue.
4. Keep old site live during propagation, then switch traffic.

## Notes

- SPA routing is handled by redirect rule in `netlify.toml` (`/*` → `/index.html`).
- Netlify Functions are served under `/.netlify/functions/*` (e.g. `get-upsell-price`).
