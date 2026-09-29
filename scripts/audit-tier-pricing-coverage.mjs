#!/usr/bin/env node
/**
 * audit-tier-pricing-coverage.mjs
 *
 * Checks EVERY product in the live B2B catalog (public/gelitup-content/b2b-price-list.json)
 * AND the distributor "package"/pod catalog (public/gelitup-content/package-pods.json, used
 * to build Silver/Gold/Platinum bulk colour packages) against the tier pricing spreadsheet
 * (src/data/tierPricingOverrides.json), using the exact same resolution logic
 * (src/lib/tierPricingResolver.js) that the app uses to price real distributor orders for
 * every tier (Authority, Professional, Sales Representative, Level 2 Country).
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

// The distributor "package" builder (Silver/Gold/Platinum bulk colour packages) draws
// items from a SEPARATE catalog file that uses short display names (e.g. "Ice Ice Baby"
// instead of the sheet's "01 Ice Ice Baby -HTF") and GIUP-COL-prefixed SKUs — check this
// source too, since it is resolved through the same tier lookup but with different
// name/sku shapes than the main b2b-price-list.json catalog.
let podCatalogItems = []
try {
  const podCatalog = loadJson('public/gelitup-content/package-pods.json')
  const podGroups = ['pod_1', 'pod_2', 'pod_3', 'pod_4', 'pod_seasonal']
  podCatalogItems = podGroups.flatMap((key) => (Array.isArray(podCatalog?.[key]) ? podCatalog[key] : []))
} catch {
  console.log('(package-pods.json not found — skipping distributor package/pod catalog check)\n')
}

const tierLookup = buildTierPricingLookup(tierPricingOverrides, PRODUCT_ALIAS_GROUPS)

console.log(`Loaded ${tierPricingOverrides.length} tier pricing sheet rows (${tierLookup.size} lookup keys).\n`)

function checkCatalog(label, items) {
  const missing = []
  const zeroOrInvalidTier = []
  let resolved = 0

  for (const item of items) {
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

  console.log(`── ${label} (${items.length} products) ──────────────────────────`)
  console.log(`✅  Resolved: ${resolved} / ${items.length}`)
  console.log(`${missing.length ? '❌' : '✅'}  Missing (falls back to B2B price for every tier): ${missing.length}`)
  console.log(`${zeroOrInvalidTier.length ? '⚠️ ' : '✅'}  Resolved but with an invalid/zero tier value: ${zeroOrInvalidTier.length}`)

  if (missing.length) {
    console.log('\nProducts NOT found in the tier pricing sheet:')
    for (const item of missing) {
      console.log(`  • ${item.name}  (sku: ${item.sku || '-'}, b2b price: ${item.price ?? '-'})`)
    }
  }

  if (zeroOrInvalidTier.length) {
    console.log('\nProducts resolved, but with a missing/zero tier price:')
    for (const { item, invalidTiers } of zeroOrInvalidTier) {
      console.log(`  • ${item.name}  — invalid tiers: ${invalidTiers.join(', ')}`)
    }
  }

  console.log('')
  return missing.length > 0 || zeroOrInvalidTier.length > 0
}

let hasIssues = checkCatalog('b2b-price-list.json (main catalog)', catalogItems)
if (podCatalogItems.length) {
  hasIssues = checkCatalog('package-pods.json (distributor package/pod catalog)', podCatalogItems) || hasIssues
}

if (hasIssues) {
  console.log('Fix by adding/correcting rows in the tier pricing sheet (or its JSON conversion),')
  console.log('or by adding an alias in src/data/productAliases.js if the sheet already has the')
  console.log('product under a differently-worded name.')
  process.exit(1)
}

console.log('All catalog products resolve to a valid tier price for every distributor tier.')
