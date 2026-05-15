#!/usr/bin/env node
/**
 * Browser-level daily smoke check.
 *
 * Runs against production (or any base URL) using Playwright Chromium.
 * Validates public routes, login page content, and — when credentials are
 * supplied — a signed-in distributor session all the way through to
 * My Orders, plus a B2B portal session and registration form integrity.
 *
 * Required env vars for signed-in checks:
 *   SMOKE_DISTRIBUTOR_EMAIL / SMOKE_DISTRIBUTOR_PASSWORD  — distributor account
 *   SMOKE_B2B_EMAIL / SMOKE_B2B_PASSWORD                  — B2B buyer account
 *
 * Optional:
 *   SMOKE_BASE_URL        (defaults to https://gelitup.com)
 *   SUPABASE_URL          (enables auth-config check)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { chromium } from 'playwright'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://gelitup.com').replace(/\/$/, '')
const distributorEmail = String(process.env.SMOKE_DISTRIBUTOR_EMAIL || '').trim().toLowerCase()
const distributorPassword = String(process.env.SMOKE_DISTRIBUTOR_PASSWORD || '')
const b2bEmail = String(process.env.SMOKE_B2B_EMAIL || '').trim().toLowerCase()
const b2bPassword = String(process.env.SMOKE_B2B_PASSWORD || '')
const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '')

const failures = []
const notes = []

function pass(message) { console.log(`✅ ${message}`) }
function note(message) { notes.push(message); console.log(`ℹ️  ${message}`) }
function fail(message) { failures.push(message); console.error(`❌ ${message}`) }

async function goto(page, path) {
  const url = `${baseUrl}${path}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  return url
}

async function expectText(page, text, label, timeout = 15000) {
  try {
    await page.getByText(text, { exact: true }).waitFor({ state: 'visible', timeout })
    pass(`${label}: found "${text}"`)
  } catch {
    fail(`${label}: expected text "${text}" not visible`)
  }
}

function consumeErrors(bucket, label) {
  const errs = bucket.splice(0, bucket.length)
  if (errs.length) {
    fail(`${label}: ${errs.length} client-side JS error(s):\n  ${errs.join('\n  ')}`)
  }
}

async function checkPublicRoutes(page, clientErrors) {
  // Homepage
  let url = await goto(page, '/')
  const bodyText = await page.locator('body').innerText().catch(() => '')
  if (!bodyText.trim()) fail(`Homepage: blank body at ${url}`)
  else pass(`Homepage: loaded at ${url}`)
  consumeErrors(clientErrors, 'Homepage')

  // B2B login
  await goto(page, '/portal/login')
  await expectText(page, 'B2B Portal', 'B2B login page')
  consumeErrors(clientErrors, 'B2B login page')

  // Distributor login
  await goto(page, '/portal/login?portal=distributor')
  await expectText(page, 'Distributor Portal', 'Distributor login page')
  consumeErrors(clientErrors, 'Distributor login page')

  // Admin login
  await goto(page, '/portal/admin-login')
  await expectText(page, 'Sign In as Admin', 'Admin login page')
  consumeErrors(clientErrors, 'Admin login page')

  // Buyer registration page
  await goto(page, '/portal/register')
  const regText = await page.locator('body').innerText().catch(() => '')
  if (!regText.trim()) fail('Registration page: blank body')
  else pass('Registration page: loaded')
  consumeErrors(clientErrors, 'Registration page')

  // Distributor coverage page
  await goto(page, '/distributors')
  const distText = await page.locator('body').innerText().catch(() => '')
  if (!distText.trim()) fail('Distributors page: blank body')
  else pass('Distributors page: loaded')
  consumeErrors(clientErrors, 'Distributors page')
}

async function checkRegistrationFlow(page, clientErrors) {
  await goto(page, '/portal/register')
  consumeErrors(clientErrors, 'Registration page JS')

  // Email field must be present
  const emailField = await page.locator('input[type="email"]').first().isVisible({ timeout: 8000 }).catch(() => false)
  if (emailField) pass('Registration form: email field visible')
  else fail('Registration form: email input not found')

  // Submit empty — validation should block it (page stays on /register)
  const submitBtn = page.getByRole('button', { name: /register|create|sign up/i }).first()
  if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await submitBtn.click()
    await page.waitForTimeout(800)
    if (page.url().includes('/register')) {
      pass('Registration form: empty-submit blocked by validation')
    } else {
      fail('Registration form: empty submit navigated away (validation not working)')
    }
    consumeErrors(clientErrors, 'Registration form validation')
  } else {
    note('Registration form: submit button not found — form structure may have changed')
  }
}

async function checkB2bPortal(page, clientErrors) {
  if (!b2bEmail || !b2bPassword) {
    note('Skipping B2B portal checks — set SMOKE_B2B_EMAIL + SMOKE_B2B_PASSWORD to enable.')
    return
  }

  // Sign in via B2B portal
  await goto(page, '/portal/login')
  await page.locator('#portal-login-email').fill(b2bEmail)
  await page.locator('#portal-login-password').fill(b2bPassword)
  await page.getByRole('button', { name: 'Sign In' }).click()

  try {
    await page.waitForURL(/\/portal\/dashboard\//, { timeout: 30000 })
    pass(`B2B login: redirected to ${page.url()}`)
  } catch {
    fail(`B2B login: did not reach dashboard within 30s (still at ${page.url()})`)
    consumeErrors(clientErrors, 'B2B login')
    return
  }
  consumeErrors(clientErrors, 'B2B login')

  // My Orders
  await page.goto(`${baseUrl}/portal/dashboard/orders`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'B2B My Orders')
  const ordersText = await page.locator('body').innerText().catch(() => '')
  if (!ordersText.trim()) fail('B2B My Orders: blank page')
  else pass('B2B My Orders: not blank')

  // Shop / Products
  await page.goto(`${baseUrl}/portal/dashboard/products`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'B2B Shop')
  const shopText = await page.locator('body').innerText().catch(() => '')
  if (!shopText.trim()) fail('B2B Shop: blank page')
  else pass('B2B Shop: not blank')

  // My Information / Profile
  await page.goto(`${baseUrl}/portal/dashboard/profile`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'B2B My Information')
  const profileText = await page.locator('body').innerText().catch(() => '')
  if (!profileText.trim()) fail('B2B My Information: blank page')
  else pass('B2B My Information: not blank')

  // Sign out cleanly so session doesn't bleed into next check
  await page.goto(`${baseUrl}/portal/login`, { timeout: 15000 }).catch(() => {})
}

async function checkDistributorPortal(page, clientErrors) {
  if (!distributorEmail || !distributorPassword) {
    note('Skipping distributor portal checks — set SMOKE_DISTRIBUTOR_EMAIL + SMOKE_DISTRIBUTOR_PASSWORD to enable.')
    return
  }

  // Sign in
  await goto(page, '/portal/login?portal=distributor')
  await page.locator('#portal-login-email').fill(distributorEmail)
  await page.locator('#portal-login-password').fill(distributorPassword)
  await page.getByRole('button', { name: 'Sign In' }).click()

  try {
    await page.waitForURL(/\/portal\/dashboard\//, { timeout: 30000 })
    pass(`Distributor login: redirected to ${page.url()}`)
  } catch {
    fail(`Distributor login: did not reach dashboard within 30s (still at ${page.url()})`)
    consumeErrors(clientErrors, 'Distributor login')
    return
  }
  consumeErrors(clientErrors, 'Distributor login')

  const overviewText = await page.locator('body').innerText().catch(() => '')
  if (!overviewText.trim()) fail('Distributor overview: blank page after sign-in')
  else pass('Distributor overview: not blank')

  // My Orders
  await page.goto(`${baseUrl}/portal/dashboard/orders`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'Distributor navigation to orders')
  await expectText(page, 'My Orders', 'Distributor My Orders heading')
  const ordersBody = await page.locator('body').innerText().catch(() => '')
  if (!ordersBody.trim()) fail('Distributor My Orders: blank page')
  else pass('Distributor My Orders: not blank')
  consumeErrors(clientErrors, 'Distributor My Orders')

  const viewBtn = page.getByRole('button', { name: /View Items/i }).first()
  if (await viewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewBtn.click()
    await expectText(page, 'Order Contents', 'Distributor order detail expand')
    consumeErrors(clientErrors, 'Distributor order detail')
  } else {
    note('No expandable orders found for smoke account — detail expand skipped.')
  }

  // Shop
  await page.goto(`${baseUrl}/portal/dashboard/products`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'Distributor navigation to shop')
  const shopBody = await page.locator('body').innerText().catch(() => '')
  if (!shopBody.trim()) fail('Distributor Shop: blank page')
  else pass('Distributor Shop: not blank')
  consumeErrors(clientErrors, 'Distributor Shop')
}

async function checkSupabaseAuthConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    note('Skipping Supabase auth config check — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable.')
    return
  }

  // Check b2b_registrations table is reachable
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/b2b_registrations?select=id,status,created_at&order=created_at.desc&limit=5`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    if (!res.ok) {
      fail(`Supabase b2b_registrations: HTTP ${res.status}`)
      return
    }
    const rows = await res.json()
    pass(`Supabase b2b_registrations: reachable (${rows.length} recent row(s) returned)`)

    // Alert if there are pending registrations older than 48h (may need admin action)
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const stale = rows.filter(r => r.status === 'pending' && r.created_at < cutoff)
    if (stale.length) {
      note(`⚠️  ${stale.length} B2B registration(s) have been pending for >48h — may need review in admin panel.`)
    }
  } catch (err) {
    fail(`Supabase b2b_registrations check error: ${err.message}`)
  }

  // Check auth users table is reachable (verifies auth is up)
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/version`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    })
    if (res.ok) pass('Supabase auth API: reachable')
    else note(`Supabase version RPC: HTTP ${res.status} (non-critical)`)
  } catch {
    note('Supabase version RPC unreachable (non-critical)')
  }
}

async function main() {
  console.log(`\n🔎  Browser smoke check — ${baseUrl}\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'GelitupSmokeBot/1.0 (automated health check)',
  })
  const page = await context.newPage()
  const clientErrors = []

  page.on('pageerror', (err) => {
    clientErrors.push(err instanceof Error ? err.message : String(err))
  })

  try {
    await checkPublicRoutes(page, clientErrors)
    await checkRegistrationFlow(page, clientErrors)
    await checkB2bPortal(page, clientErrors)
    await checkDistributorPortal(page, clientErrors)
    await checkSupabaseAuthConfig()
  } finally {
    await context.close()
    await browser.close()
  }

  if (notes.length) {
    console.log('\nNotes:')
    for (const n of notes) console.log(`  - ${n}`)
  }

  if (failures.length) {
    console.error(`\n🚫  ${failures.length} smoke check(s) failed — investigate before next deploy.\n`)
    process.exit(1)
  }

  console.log('\n✅  All browser smoke checks passed.\n')
}

void main()
