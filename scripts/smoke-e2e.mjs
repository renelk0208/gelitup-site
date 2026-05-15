#!/usr/bin/env node
/**
 * Browser-level daily smoke check.
 *
 * Runs against production (or any base URL) using Playwright Chromium.
 * Validates public routes, login page content, and — when credentials are
 * supplied — a signed-in distributor session all the way through to
 * My Orders.
 *
 * Required env vars for the distributor sign-in check:
 *   SMOKE_DISTRIBUTOR_EMAIL
 *   SMOKE_DISTRIBUTOR_PASSWORD
 *
 * Optional:
 *   SMOKE_BASE_URL   (defaults to https://gelitup.com)
 */

import { chromium } from 'playwright'

const baseUrl = String(process.env.SMOKE_BASE_URL || 'https://gelitup.com').replace(/\/$/, '')
const distributorEmail = String(process.env.SMOKE_DISTRIBUTOR_EMAIL || '').trim().toLowerCase()
const distributorPassword = String(process.env.SMOKE_DISTRIBUTOR_PASSWORD || '')

const failures = []
const notes = []

function pass(message) {
  console.log(`✅ ${message}`)
}

function note(message) {
  notes.push(message)
  console.log(`ℹ️  ${message}`)
}

function fail(message) {
  failures.push(message)
  console.error(`❌ ${message}`)
}

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
  if (!bodyText.trim()) {
    fail(`Homepage: blank body at ${url}`)
  } else {
    pass(`Homepage: loaded at ${url}`)
  }
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

  // Buyer registration
  await goto(page, '/portal/register')
  const regText = await page.locator('body').innerText().catch(() => '')
  if (!regText.trim()) {
    fail('Registration page: blank body')
  } else {
    pass('Registration page: loaded')
  }
  consumeErrors(clientErrors, 'Registration page')

  // Distributor coverage page
  await goto(page, '/distributors')
  const distText = await page.locator('body').innerText().catch(() => '')
  if (!distText.trim()) {
    fail('Distributors page: blank body')
  } else {
    pass('Distributors page: loaded')
  }
  consumeErrors(clientErrors, 'Distributors page')
}

async function checkDistributorPortal(page, clientErrors) {
  if (!distributorEmail || !distributorPassword) {
    note('Skipping signed-in distributor checks — set SMOKE_DISTRIBUTOR_EMAIL and SMOKE_DISTRIBUTOR_PASSWORD to enable.')
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

  // Check overview is not blank
  const overviewText = await page.locator('body').innerText().catch(() => '')
  if (!overviewText.trim()) {
    fail('Distributor overview: blank page after sign-in')
  } else {
    pass('Distributor overview: not blank')
  }

  // Navigate to My Orders
  await page.goto(`${baseUrl}/portal/dashboard/orders`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'Distributor navigation to orders')

  await expectText(page, 'My Orders', 'Distributor My Orders heading')

  const ordersBody = await page.locator('body').innerText().catch(() => '')
  if (!ordersBody.trim()) {
    fail('Distributor My Orders: blank page')
  } else {
    pass('Distributor My Orders: not blank')
  }
  consumeErrors(clientErrors, 'Distributor My Orders')

  // Expand first order if one exists
  const viewBtn = page.getByRole('button', { name: /View Items/i }).first()
  if (await viewBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await viewBtn.click()
    await expectText(page, 'Order Contents', 'Distributor order detail expand')
    consumeErrors(clientErrors, 'Distributor order detail')
  } else {
    note('No expandable orders found for smoke account — login and orders page passed, detail expand skipped.')
  }

  // Navigate to Shop (products module)
  await page.goto(`${baseUrl}/portal/dashboard/products`, { waitUntil: 'networkidle', timeout: 45000 })
  consumeErrors(clientErrors, 'Distributor navigation to shop')

  const shopBody = await page.locator('body').innerText().catch(() => '')
  if (!shopBody.trim()) {
    fail('Distributor Shop: blank page')
  } else {
    pass('Distributor Shop: not blank')
  }
  consumeErrors(clientErrors, 'Distributor Shop')
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
    await checkDistributorPortal(page, clientErrors)
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
