# b2b-email-notifications (Supabase Edge Function)

Sends B2B registration emails through Resend.

## One-command deploy (PowerShell)

From the project root, run:

- `powershell -ExecutionPolicy Bypass -File .\scripts\deploy-b2b.ps1`

This script will:

- link your Supabase project
- set `RESEND_API_KEY` as a Supabase secret
- deploy `b2b-email-notifications`
- update local `.env` keys:
   - `VITE_EMAIL_WEBHOOK_URL`
   - `VITE_EMAIL_FROM`
   - `VITE_EMAIL_REPLY_TO`

## Deploy

1. Authenticate with an access token in your current terminal session:
   - `$env:SUPABASE_ACCESS_TOKEN="<your_sbp_token>"`
2. Link to your project:
   - `npx --yes supabase@latest -- link --project-ref <your-project-ref>`
3. Set function secret:
   - `npx --yes supabase@latest -- secrets set RESEND_API_KEY=<your_resend_api_key>`
4. Deploy function:
   - `npx --yes supabase@latest -- functions deploy b2b-email-notifications --project-ref <your-project-ref> --use-api`

## Frontend env

Set in local `.env`:

- `VITE_EMAIL_WEBHOOK_URL=https://<your-project-ref>.functions.supabase.co/b2b-email-notifications`
- `VITE_EMAIL_FROM=distributors@gelitup.com`
- `VITE_EMAIL_REPLY_TO=distribution@gelitup.com`

Then restart your dev server.
