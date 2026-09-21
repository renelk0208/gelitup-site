# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Netlify Live Deployment

For the production migration checklist (build settings, env vars, Supabase SQL, smoke tests, and domain cutover), see:

- [docs/netlify-live-deployment.md](docs/netlify-live-deployment.md)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## B2B Checkout Setup (Supabase)

If checkout shows an error about `public.b2b_orders` not existing:

1. Open Supabase Dashboard → SQL Editor.
2. Run [supabase/sql/create_b2b_orders.sql](supabase/sql/create_b2b_orders.sql).
3. Keep `.env` configured:
	- `VITE_SUPABASE_URL`
	- `VITE_SUPABASE_ANON_KEY`
	- `VITE_B2B_ORDERS_TABLE=b2b_orders` (optional, default is `b2b_orders`).

After this, `Submit Order` writes directly to Supabase.

### Off-platform invoicing

B2B portal orders are received in the platform, then invoiced manually via a dedicated inbox.

Set:

- `VITE_B2B_ORDER_INBOX=distribution@gelitup.com`

Current default fallback is `distribution@gelitup.com`.

### Optional Zoho live sync

Zoho sync stays non-blocking for order intake. To enable live webhook sync:

- `VITE_ENABLE_ZOHO_SYNC=true`
- `VITE_ZOHO_SYNC_WEBHOOK_URL=https://<project-ref>.functions.supabase.co/zoho-sync-order`
- optional `VITE_ZOHO_SYNC_AUTH_TOKEN=<bearer-token>`
- optional `VITE_ZOHO_SYNC_TARGET=books` (or `inventory`)
- optional `VITE_ZOHO_SYNC_TIMEOUT_MS=12000`

If disabled or not configured, portal orders still submit and show a setup-status note.

Recommended backend implementation:

- [supabase/functions/zoho-sync-order/index.ts](supabase/functions/zoho-sync-order/index.ts)
- Deploy/setup guide: [supabase/functions/zoho-sync-order/README.md](supabase/functions/zoho-sync-order/README.md)

### Shipping metadata (packing accuracy)

Packing list calculations read from:

- [public/gelitup-content/shipping-metadata.json](public/gelitup-content/shipping-metadata.json)

This supports:

- `defaults` for generic SKUs
- `byPrefix` for SKU families (example: `GIUP-COL`)
- `bySku` for exact SKU overrides
- `packaging` carton/weight/volume limits

If this file is missing or invalid, the app falls back to embedded shipping defaults.

## B2B Registration + Approval Setup

To enable Leeukopf-style registration workflow (application submitted as `pending`, login only after `approved`):

1. In Supabase SQL Editor, run [supabase/sql/create_b2b_registrations.sql](supabase/sql/create_b2b_registrations.sql).
2. Ensure env vars are set:
	- `VITE_B2B_REGISTRATIONS_TABLE=b2b_registrations`
	- `VITE_REQUIRE_B2B_APPROVAL=true`
3. Review applications in `public.b2b_registrations` and set `status='approved'` for clients to unlock portal access.

### Enable Applications Review in Portal UI

To use the new `Applications` module with Approve/Reject buttons:

1. Insert at least one admin email in `public.b2b_admins`:
	- `insert into public.b2b_admins (email) values ('your-admin@email.com');`
2. Sign in with that admin email.
3. Open `/portal/dashboard/applications` to review pending client applications.

## Personalized B2B Emails

The portal now triggers email notifications for:

- Application received (after submit)
- Application approved/rejected (after admin review)

### Configure function endpoint

1. Deploy Edge Function from [supabase/functions/b2b-email-notifications/index.ts](supabase/functions/b2b-email-notifications/index.ts).
2. Set frontend env values:
	- `VITE_EMAIL_WEBHOOK_URL=https://<project-ref>.functions.supabase.co/b2b-email-notifications`
	- `VITE_EMAIL_FROM=distributors@gelitup.com`
	- `VITE_EMAIL_REPLY_TO=distribution@gelitup.com`
	- `VITE_B2B_ORDER_INBOX=distribution@gelitup.com`

### SPF/DKIM

Follow DNS setup guide in [docs/email-deliverability.md](docs/email-deliverability.md).

## Product Catalog (all GEL.IT.UP products)

The portal `Products` module now supports all product categories, not only solid colours.

### 1) Create catalog table

Run SQL in Supabase:

- [supabase/sql/create_b2b_products.sql](supabase/sql/create_b2b_products.sql)

### 2) Import product descriptions from gelitup.gr

1. Set import env vars locally:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- optional `GELITUP_PRODUCTS_API` (default: WooCommerce Store API URL)
2. Run:
	- `npm run sync:gelitup-products`

This script fetches products from gelitup.gr, maps SKU/name/description/category/price/stock/image, and upserts into `b2b_products` by SKU.

### 3) App product source

- If `VITE_PRODUCTS_URL` is set, portal reads that external feed.
- Otherwise, portal reads from Supabase `b2b_products` table (default `VITE_B2B_PRODUCTS_TABLE=b2b_products`).

### 4) Repository-based product images (manual upload)

If `gelitup.gr` feed images are unavailable, upload images directly into the repo and map them:

- Upload files to `public/gelitup-content/product-images/`
- Define mappings in `public/gelitup-content/product-image-map.json`

Example mapping:

```json
{
	"GIUP-COL-01": "/gelitup-content/product-images/giup-col-01.jpg",
	"Ice Ice Baby": "/gelitup-content/product-images/ice-ice-baby.jpg"
}
```

Keys can be SKU/code or product name. The portal now resolves local map entries before external feed values.

To auto-generate map entries from filenames in `public/gelitup-content/product-images/`:

- `npm run generate:product-image-map`

This command merges new keys into `public/gelitup-content/product-image-map.json` without overwriting existing manual mappings.

## Orders module shipping label copy

In `/portal/dashboard/orders`, each row now includes a `Copy Label` action that copies:

- consignee name
- consignee phone
- shipping address
- order number

This is intended for quick warehouse/courier handoff.

## Import Images/Videos from gelitup.com

To pull public media assets (images/videos) from key gelitup.com pages into this app:

1. Run:
	- `npm run import:gelitup-media`
2. Imported files are written to:
	- `public/gelitup-media/images`
	- `public/gelitup-media/videos`
	- `public/gelitup-media/manifest.json`

Optional environment controls:

- `GELITUP_SITE_ORIGIN` (default: `https://www.gelitup.com`)
- `GELITUP_PAGES` comma-separated paths (default: `/,/about-us,/contact-us`)
- `GELITUP_USE_SITEMAP` (`true`/`false`, default: `true`) to auto-discover pages from sitemap XMLs
- `GELITUP_USE_CRAWL` (`true`/`false`, default: `true`) to discover additional internal pages from links
- `GELITUP_PAGE_LIMIT` max pages to scan (default: `200`)
- `GELITUP_MEDIA_LIMIT` max files to download (default: `1200`)

For full baseline import page-by-page:

- `GELITUP_USE_SITEMAP=true`
- `GELITUP_PAGE_LIMIT=200`
- `GELITUP_MEDIA_LIMIT=1200`

The manifest includes `pageMediaMap`, so each source page can be redesigned later with its own media set.

## Snapshot Page Content from gelitup.com

To capture page-by-page text/content blocks for later reconstruction:

1. Run:
	- `npm run snapshot:gelitup-pages`
2. Output file:
	- `public/gelitup-content/pages.json`

Uses the same discovery environment controls:

- `GELITUP_SITE_ORIGIN`
- `GELITUP_PAGES`
- `GELITUP_USE_SITEMAP`
- `GELITUP_USE_CRAWL`
- `GELITUP_PAGE_LIMIT`

Each page entry includes title, headings (`h1/h2/h3`), paragraphs, list items, links, and media references.

## Generate Dedicated Page Files from Snapshot

After refreshing snapshot content, auto-generate editable page component files:

- `npm run generate:imported-pages`

Generated files are written under:

- `src/pages/imported/generated`

Routing supports these pages via:

- `/pages/:slug`

## Snapshot vs Custom Content Switch

Imported page routes support two sources:

- `Snapshot Source`: baseline from `public/gelitup-content/pages.json`
- `Custom Source`: page override from `public/gelitup-content/custom-pages.json`

For gradual replacement of imported copy, add entries by `slug` in:

- `public/gelitup-content/custom-pages.json`

If a slug has no custom entry, the page automatically uses Snapshot Source.

## One-command Baseline Refresh

To refresh everything in order (media + content snapshot + generated page files):

- `npm run refresh:gelitup-baseline`

## Literal Legacy Mirror Mode (Fast Copy/Paste Feel)

To display the existing gelitup.com pages directly inside this app routes:

- `VITE_ENABLE_LEGACY_MIRROR=true`
- optional `VITE_LEGACY_SITE_ORIGIN=https://www.gelitup.com`

When enabled, these routes use live embedded legacy pages:

- `/`
- `/about-us`
- `/our-products`
- `/distributors`
- `/contact-us`

Turn it off to return to migrated React-rendered pages.
