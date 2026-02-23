# Netlify Env Import with Correct Scopes

Use two files so each variable lands in the right Netlify scope.

## Files in this repo

- `.env.netlify.builds.example` → frontend `VITE_*` variables (Builds scope)
- `.env.netlify.functions.example` → server-only variables (Functions scope)

Copy each example to a real local file and fill values:

1. `.env.netlify.builds`
2. `.env.netlify.functions`

## Build and Functions settings

From `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node version: `20`
- Functions bundler: `esbuild`
- SPA redirect: `/* -> /index.html`

## Netlify CLI import (recommended)

1) Login and link site:

```powershell
npx netlify-cli login
npx netlify-cli link
```

2) Import Build variables:

```powershell
npx netlify-cli env:import ./.env.netlify.builds
```

3) Import Function variables:

```powershell
npx netlify-cli env:import ./.env.netlify.functions
```

4) Trigger deploy:

```powershell
npx netlify-cli deploy --prod
```

## Manual dashboard setup (if not using CLI)

In Netlify Site settings → Environment variables:

- Put all `VITE_*` in scope: **Builds**
- Put `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` in scope: **Functions**
- Context: use **All** unless you intentionally want different Production/Preview values

## Security rule

Do not put secrets in `VITE_*` variables. `VITE_*` values are exposed to browser clients after build.
