#!/usr/bin/env node
/**
 * fetch-zoho-item-map.mjs
 *
 * Fetches all Items from Zoho Books and builds the ZOHO_BOOKS_ITEM_MAP_JSON
 * secret value (SKU → item_id) needed by the zoho-sync-order Edge Function.
 *
 * Usage:
 *   node scripts/fetch-zoho-item-map.mjs
 *   node scripts/fetch-zoho-item-map.mjs --output zoho-item-map.json
 *   node scripts/fetch-zoho-item-map.mjs --verbose
 *
 * Required env vars (add to .env or export before running):
 *   ZOHO_BOOKS_ORGANIZATION_ID
 *   ZOHO_BOOKS_ACCESS_TOKEN        — static token (short-lived, easiest for a one-off run)
 *   OR all three refresh-token creds:
 *     ZOHO_BOOKS_REFRESH_TOKEN
 *     ZOHO_BOOKS_CLIENT_ID
 *     ZOHO_BOOKS_CLIENT_SECRET
 *
 * Optional:
 *   ZOHO_BOOKS_BASE_URL            — default: https://www.zohoapis.com/books/v3
 *   ZOHO_ACCOUNTS_BASE_URL         — default: https://accounts.zoho.com
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── .env loader ────────────────────────────────────────────────────────────────
function loadDotEnv() {
  try {
    const envPath = resolve(__dirname, '../.env')
    const content = readFileSync(envPath, 'utf8')
    for (const raw of content.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // no .env — rely on environment
  }
}

// ── Zoho OAuth ─────────────────────────────────────────────────────────────────
async function resolveAccessToken() {
  const staticToken = process.env.ZOHO_BOOKS_ACCESS_TOKEN
  if (staticToken) return staticToken

  const refreshToken = process.env.ZOHO_BOOKS_REFRESH_TOKEN
  const clientId = process.env.ZOHO_BOOKS_CLIENT_ID
  const clientSecret = process.env.ZOHO_BOOKS_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      'Set ZOHO_BOOKS_ACCESS_TOKEN, or all three: ZOHO_BOOKS_REFRESH_TOKEN, ZOHO_BOOKS_CLIENT_ID, ZOHO_BOOKS_CLIENT_SECRET',
    )
  }

  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com'
  const url = new URL('/oauth/v2/token', accountsBase)
  url.searchParams.set('refresh_token', refreshToken)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('grant_type', 'refresh_token')

  const res = await fetch(url.toString(), { method: 'POST' })
  const data = await res.json().catch(() => null)

  if (!res.ok || !data?.access_token) {
    throw new Error(`Token refresh failed: ${data?.error || res.status}`)
  }

  return data.access_token
}

// ── Zoho Books Items API ────────────────────────────────────────────────────────
async function fetchAllItems(accessToken, orgId) {
  const booksBase = process.env.ZOHO_BOOKS_BASE_URL || 'https://www.zohoapis.com/books/v3'
  const allItems = []
  let page = 1

  while (true) {
    const url = new URL('/items', booksBase)
    url.searchParams.set('organization_id', orgId)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', '200')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.message || `Zoho Items API error (HTTP ${res.status})`)
    }

    const pageItems = Array.isArray(data?.items) ? data.items : []
    allItems.push(...pageItems)

    process.stdout.write(`  page ${page}: ${pageItems.length} items\n`)

    const hasMore = data?.page_context?.has_more_page === true
    if (!hasMore || pageItems.length === 0) break
    page++
  }

  return allItems
}

// ── Cross-check against local catalogue ──────────────────────────────────────
function checkCoverage(itemMap) {
  try {
    const podsPath = resolve(__dirname, '../public/gelitup-content/package-pods.json')
    const pods = JSON.parse(readFileSync(podsPath, 'utf8'))
    const allProducts = [
      ...(pods.pod_1 ?? []),
      ...(pods.pod_2 ?? []),
      ...(pods.pod_3 ?? []),
      ...(pods.pod_4 ?? []),
    ]

    const localSkus = allProducts.map((p) => (p.sku || '').trim())
    const mapped = localSkus.filter((s) => itemMap[s])
    const unmapped = localSkus.filter((s) => s && !itemMap[s])
    const blank = localSkus.filter((s) => !s)

    console.log('\nCatalogue SKU coverage:')
    console.log(`  Local products total : ${allProducts.length}`)
    console.log(`  SKUs present         : ${localSkus.length - blank.length}`)
    console.log(`  Mapped in Zoho       : ${mapped.length}`)
    if (blank.length) console.log(`  Missing SKU field    : ${blank.length}`)
    if (unmapped.length === 0) {
      console.log('  All catalogue SKUs found in Zoho ✓')
    } else {
      console.log(`  NOT found in Zoho (${unmapped.length}):`)
      unmapped.forEach((s) => console.log(`    - ${s}`))
    }
  } catch (e) {
    console.warn('Could not read package-pods.json for cross-check:', e.message)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  loadDotEnv()

  const args = process.argv.slice(2)
  const outputIdx = args.indexOf('--output')
  const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null
  const verbose = args.includes('--verbose') || args.includes('-v')

  const orgId = process.env.ZOHO_BOOKS_ORGANIZATION_ID
  if (!orgId) {
    console.error('ERROR: ZOHO_BOOKS_ORGANIZATION_ID not set')
    process.exit(1)
  }
  if (!process.env.ZOHO_BOOKS_ACCESS_TOKEN && !process.env.ZOHO_BOOKS_REFRESH_TOKEN) {
    console.error('ERROR: No Zoho credentials found. See script header for required env vars.')
    process.exit(1)
  }

  console.log('Authenticating with Zoho Books...')
  const accessToken = await resolveAccessToken()

  console.log('Fetching items...')
  const items = await fetchAllItems(accessToken, orgId)
  console.log(`Total items fetched: ${items.length}`)

  // Build SKU → item_id map (only items that have a SKU)
  const itemMap = {}
  const noSku = []

  for (const item of items) {
    const sku = (item.sku || '').trim()
    if (!sku) {
      noSku.push(item.name || item.item_id)
      continue
    }
    itemMap[sku] = item.item_id
  }

  if (verbose && noSku.length) {
    console.log(`\nItems without SKU (${noSku.length}):`)
    noSku.forEach((n) => console.log(`  - ${n}`))
  } else if (noSku.length) {
    console.log(`Items without SKU: ${noSku.length} (run --verbose to list them)`)
  }

  checkCoverage(itemMap)

  const prettyJson = JSON.stringify(itemMap, null, 2)
  const oneLineJson = JSON.stringify(itemMap)

  if (outputFile) {
    const outPath = resolve(process.cwd(), outputFile)
    writeFileSync(outPath, prettyJson + '\n')
    console.log(`\nSaved to: ${outPath}`)
    console.log(`Mapped SKUs: ${Object.keys(itemMap).length}`)
    console.log('\nSet as Supabase secret:')
    console.log(`  supabase secrets set ZOHO_BOOKS_ITEM_MAP_JSON='${oneLineJson}'`)
  } else {
    console.log('\n── ZOHO_BOOKS_ITEM_MAP_JSON ─────────────────────────────────────────────────')
    console.log(oneLineJson)
    console.log('─────────────────────────────────────────────────────────────────────────────')
    console.log(`Mapped SKUs: ${Object.keys(itemMap).length}`)
    console.log('\nTo set as Supabase secret, run:')
    console.log(`  supabase secrets set ZOHO_BOOKS_ITEM_MAP_JSON='<paste above JSON>'`)
    console.log('\nOr save to file first:')
    console.log('  node scripts/fetch-zoho-item-map.mjs --output zoho-item-map.json')
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
