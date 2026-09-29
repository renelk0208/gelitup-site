#!/usr/bin/env node
/**
 * audit-tier-pricing-coverage.mjs
 *
 * Checks EVERY product in the live B2B catalog (public/gelitup-content/b2b-price-list.json)
 * against the tier pricing spreadsheet (src/data/tierPricingOverrides.json), using the exact
 * same resolution logic (src/lib/tierPricingResolver.js) that the Admin Dashboard uses to
 * price real distributor orders for every tier (Authority, Professional, Sales
 * Representative, Level 2 Country).
 *
 * Run this any time you want to be sure tier pricing is correct catalogue-wide — not just
 * for one order that happened to surface a problem. Because it imports the SAME resolver
 * module the app uses, there is no risk of the audit and the live app drifting apart.
 *
 * Usage:
 *   npm run audit:tier-pricing
 *   node scripts/audit-tier-pricing-coverage.mjs
 *
 * Exits with code 1 if any catalog product fails to resolve a tier price, so it can also be
 * wired into CI/predeploy checks later if desired.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'
import {
  buildTierPricingLookup,
  buildItemCandidateKeys,
} from '../src/lib/tierPricingResolver.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const TIER_KEYS = ['authority', 'professional', 'sales', 'country']

function loadJson(relativePath) {
  const raw = readFileSync(resolve(repoRoot, relativePath), 'utf8')
  return JSON.parse(raw)
}

const tierPricingOverrides = loadJson('src/data/tierPricingOverrides.json')
const b2bPriceList = loadJson('public/gelitup-content/b2b-price-list.json')
const catalogItems = Array.isArray(b2bPriceList?.items) ? b2bPriceList.items : []

if (!catalogItems.length) {
  console.error('❌  public/gelitup-content/b2b-price-list.json has no items — aborting.')
  process.exit(1)
}

const tierLookup = buildTierPricingLookup(tierPricingOverrides, PRODUCT_ALIAS_GROUPS)

console.log(`Loaded ${tierPricingOverrides.length} tier pricing sheet rows (${tierLookup.size} lookup keys).`)
console.log(`Checking ${catalogItems.length} catalog products from b2b-price-list.json...\n`)

const missing = []
const zeroOrInvalidTier = []
let resolved = 0

for (const item of catalogItems) {
  const candidateKeys = buildItemCandidateKeys({ name: item.name, sku: item.sku })
  let entry = null
  for (const key of candidateKeys) {
    entry = tierLookup.get(key)
    if (entry) break
  }

  if (!entry) {
    missing.push(item)
    continue
  }

  resolved++

  const invalidTiers = TIER_KEYS.filter((t) => {
    const v = Number(entry[t])
    return !Number.isFinite(v) || v <= 0
  })
  if (invalidTiers.length) {
    zeroOrInvalidTier.push({ item, entry, invalidTiers })
  }
}

console.log(`✅  Resolved: ${resolved} / ${catalogItems.length}`)
console.log(`${missing.length ? '❌' : '✅'}  Missing (falls back to B2B price for every tier): ${missing.length}`)
console.log(`${zeroOrInvalidTier.length ? '⚠️ ' : '✅'}  Resolved but with an invalid/zero tier value: ${zeroOrInvalidTier.length}`)

if (missing.length) {
  console.log('\n── Products NOT found in the tier pricing sheet ──────────────────────────')
  for (const item of missing) {
    console.log(`  • ${item.name}  (sku: ${item.sku || '-'}, b2b price: ${item.price})`)
  }
}

if (zeroOrInvalidTier.length) {
  console.log('\n── Products resolved, but with a missing/zero tier price ─────────────────')
  for (const { item, invalidTiers } of zeroOrInvalidTier) {
    console.log(`  • ${item.name}  — invalid tiers: ${invalidTiers.join(', ')}`)
  }
}

if (missing.length || zeroOrInvalidTier.length) {
  console.log('\nFix by adding/correcting rows in the tier pricing sheet (or its JSON conversion),')
  console.log('or by adding an alias in src/data/productAliases.js if the sheet already has the')
  console.log('product under a differently-worded name.')
  process.exit(1)
}

console.log('\nAll catalog products resolve to a valid tier price for every distributor tier.')
