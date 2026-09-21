# zoho-sync-order (Supabase Edge Function)

Receives B2B portal order payloads and creates a Zoho Books Sales Order securely server-side.

## Deploy

1. Link Supabase project:
   - `supabase link --project-ref <your-project-ref>`
2. Set required secrets:
   - `supabase secrets set ZOHO_BOOKS_ORGANIZATION_ID=<org_id>`
   - `supabase secrets set ZOHO_BOOKS_ITEM_MAP_JSON='{"GIUP-COL-01":"123456789000000111","5IN1_CLR":"123456789000000222"}'`

3. Set auth method (one option):

- Static access token:
  - `supabase secrets set ZOHO_BOOKS_ACCESS_TOKEN=<access_token>`

- OR refresh-token flow:
  - `supabase secrets set ZOHO_BOOKS_REFRESH_TOKEN=<refresh_token>`
  - `supabase secrets set ZOHO_BOOKS_CLIENT_ID=<client_id>`
  - `supabase secrets set ZOHO_BOOKS_CLIENT_SECRET=<client_secret>`

4. Optional hardening secrets:
   - `supabase secrets set ZOHO_SYNC_SHARED_SECRET=<random-long-string>`
   - `supabase secrets set ZOHO_BOOKS_BASE_URL=https://www.zohoapis.com/books/v3`
   - `supabase secrets set ZOHO_ACCOUNTS_BASE_URL=https://accounts.zoho.com`
   - `supabase secrets set ZOHO_ALLOW_PARTIAL_ITEM_MAP=false`

5. Deploy function:
   - `supabase functions deploy zoho-sync-order --no-verify-jwt`

## Frontend env

Set in local `.env`:

- `VITE_ENABLE_ZOHO_SYNC=true`
- `VITE_ZOHO_SYNC_WEBHOOK_URL=https://<your-project-ref>.functions.supabase.co/zoho-sync-order`
- `VITE_ZOHO_SYNC_AUTH_TOKEN=<same as ZOHO_SYNC_SHARED_SECRET>` (if shared secret is enabled)
- `VITE_ZOHO_SYNC_TARGET=books`
- `VITE_ZOHO_SYNC_TIMEOUT_MS=12000`

## Notes

- SKU matching is based on exact normalized SKU text from payload (example: `GIUP-COL-01`, `5IN1_CLR`).
- Any unmapped SKUs are returned in response as `unmappedSkus`.
- By default, if **any** SKU is unmapped, function returns HTTP 422 to prevent partial orders in Zoho.
- Set `ZOHO_ALLOW_PARTIAL_ITEM_MAP=true` only if you intentionally want partial sync behavior.
