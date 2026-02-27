# Pre-Deploy Smoke Checklist (Portal + Auth)

Run this before every push/deploy to avoid auth/login regressions.

## 1) Automated smoke checks

### Local (after `npm run dev`)

- `npm run smoke:local`

### Production

- `npm run smoke:prod`

The script validates:

- Homepage route is live
- Client login page renders expected content
- Admin login page renders expected content
- Admin forgot-password page renders
- Registration page renders
- Optional DB checks (if service role env vars are provided)

Optional DB checks require these env vars in your shell:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2) Manual auth sanity checks (2 minutes)

### Client

1. Open `/portal/login`
2. Confirm both links exist:
   - `First time here? Create password`
   - `Forgot password?`
3. Attempt login with known account
4. Ensure no stale `Invalid credentials` appears before submit

### Admin

1. Open `/portal/admin-login`
2. Confirm links exist:
   - `Create password`
   - `Forgot password`
3. Open admin forgot-password and send reset link
4. Verify reset email arrives (inbox/spam)

## 3) DB preflight checks (SQL)

Run in Supabase SQL editor:

```sql
select id, email from auth.users where lower(email)=lower('your-admin@email.com');
select email from public.b2b_admins where lower(email)=lower('your-admin@email.com');
select id, contact_email, status, created_at from public.b2b_registrations order by created_at desc limit 20;
```

## 4) Release gate

Do **not** deploy if any of these fail:

- `smoke:*` script fails
- Admin login returns `Invalid credentials` for known-good user
- Reset-password flow does not send email
- Portal route unexpectedly redirects to home

## 5) Fast rollback

If production breaks after deploy:

1. Re-deploy previous successful Netlify deploy
2. Re-run `npm run smoke:prod`
3. Open issue with exact failing route + screenshot + timestamp
