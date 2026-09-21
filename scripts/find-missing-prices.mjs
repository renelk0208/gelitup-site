#!/usr/bin/env node
/**
 * find-missing-prices.mjs
 *
 * Fetches all B2B orders from Supabase and reports every item that the
 * AdminDashboard price-resolution logic cannot price.  Run this to
 * identify SKUs / names that need entries in src/data/productAliases.js
 * or SKU_OVERRIDE_MAP.
 *
 * Usage:
 *   node scripts/find-missing-prices.mjs
 *
 * Reads .env for VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
 * If you have SUPABASE_SERVICE_ROLE_KEY set it will use that instead
 * (bypasses RLS so all orders are visible).
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Load .env / .env.local ────────────────────────────────────────────────
function loadEnvFile(filename) {
  try {
    const content = readFileSync(resolve(__dirname, '..', filename), 'utf8')
    for (const raw of content.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* file not found */ }
}
loadEnvFile('.env')
loadEnvFile('.env.local')

const supabaseUrl  = process.env.VITE_SUPABASE_URL  || process.env.SUPABASE_URL  || ''
const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.VITE_SUPABASE_ANON_KEY
                  || process.env.SUPABASE_ANON_KEY
                  || ''
const ordersTable  = process.env.VITE_B2B_ORDERS_TABLE || 'b2b_orders'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌  Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

// ── SKU_OVERRIDE_MAP (mirror of AdminDashboard) ────────────────────────────
const SKU_OVERRIDE_MAP = {
  'NWTP':              { name: 'Non Wipe Top Coat Milky 15ml -HTF', price: 11.54 },
  'NWMT15':            { name: 'Non Wipe Top Coat Milky 15ml -HTF', price: 11.54 },
  'BRED0001':          { name: 'B2B Red 01',    price: 7.41 },
  'BYELLOW0002':       { name: 'B2B Yellow 02', price: 7.41 },
  'GIUPSB':            { name: 'Superbond Nail Dehydrator 11ml - Acid Free -HTF', price: 6.78 },
  'GIUP SB':           { name: 'Superbond Nail Dehydrator 11ml - Acid Free -HTF', price: 6.78 },
  'GIUPSBPS':          { name: '5-in-1 Superior Base 15ml Peach Serenity -HTF',   price: 12.84 },
  'GIUP SBPS':         { name: '5-in-1 Superior Base 15ml Peach Serenity -HTF',   price: 12.84 },
  'GIUPSBBLUE':        { name: '5-in-1 Superior Base 15ml Blue Serenity -HTF',    price: 12.84 },
  'GIUP SBBLUE':       { name: '5-in-1 Superior Base 15ml Blue Serenity -HTF',    price: 12.84 },
  'GIUPSBLS':          { name: '5-in-1 Superior Base 15ml Lemon Serenity -HTF',   price: 12.84 },
  'GIUP SBLS':         { name: '5-in-1 Superior Base 15ml Lemon Serenity -HTF',   price: 12.84 },
  'GIUPSBMS':          { name: '5-in-1 Superior Base 15ml Mint Serenity -HTF',    price: 12.84 },
  'GIUP SBMS':         { name: '5-in-1 Superior Base 15ml Mint Serenity -HTF',    price: 12.84 },
  'GIUPSBPURS':        { name: '5-in-1 Superior Base 15ml Purple Serenity -HTF',  price: 12.84 },
  'GIUP SBPURS':       { name: '5-in-1 Superior Base 15ml Purple Serenity -HTF',  price: 12.84 },
  'GIUPSBCCLR':        { name: '5-in-1 Superior Base 15ml Clear -HTF',            price: 12.84 },
  'GIUP SBCCLR':       { name: '5-in-1 Superior Base 15ml Clear -HTF',            price: 12.84 },
  'GIUPSBCBP':         { name: '5-in-1 Superior Base 15ml Baby Pink -HTF',        price: 12.84 },
  'GIUP SBCBP':        { name: '5-in-1 Superior Base 15ml Baby Pink -HTF',        price: 12.84 },
  'GIUPSBCN':          { name: '5-in-1 Superior Base 15ml Nude -HTF',             price: 12.84 },
  'GIUP SBCN':         { name: '5-in-1 Superior Base 15ml Nude -HTF',             price: 12.84 },
  'GIUPFBCLR':         { name: 'Flexi Base Clear -HTF', price: 11.94 },
  'GIUP FBCLR':        { name: 'Flexi Base Clear -HTF', price: 11.94 },
  'FBCLR':             { name: 'Flexi Base Clear -HTF', price: 11.94 },
  'POLYGELCLR':        { name: 'MultiMix Synthogel 30gr Clear -HTF', price: 12.19 },
  'POLYGEL CLR':       { name: 'MultiMix Synthogel 30gr Clear -HTF', price: 12.19 },
  'CLEAR POLYGEL':     { name: 'MultiMix Synthogel 30gr Clear -HTF', price: 12.19 },
  'MMSSPC':            { name: 'MultiMix Synthogel 30gr Super Soft Pink -HTF', price: 12.19 },
  'MMLNC':             { name: 'Multimix Synthogel 30g Light Nude -HTF',       price: 12.19 },
  'WSCOILM':                           { name: 'Chilled Melon Cuticle Oil 100ml -HTF',   price: 7.2 },
  'WHITE SATIN CUTICLE OIL MELON':     { name: 'Chilled Melon Cuticle Oil 100ml -HTF',   price: 7.2 },
  'WSCOILP':                           { name: 'Perky Peach Cuticle Oil 100ml -HTF',     price: 7.2 },
  'WHITE SATIN CUTICLE OIL PEACH':     { name: 'Perky Peach Cuticle Oil 100ml -HTF',     price: 7.2 },
  'WSCOILC':                           { name: 'Cooling Coconut Cuticle Oil 100ml -HTF', price: 7.2 },
  'WHITE SATIN CUTICLE OIL COCONUT OIL': { name: 'Cooling Coconut Cuticle Oil 100ml -HTF', price: 7.2 },
  'MIRRORCLEAR':       { name: 'SP8001 Mirror Clear Powder', price: 5.15 },
  'MIRROR CLEAR':      { name: 'SP8001 Mirror Clear Powder', price: 5.15 },
  'CLASSICBC':         { name: 'Base Coat 15ml -HTF', price: 10.48 },
  'CLASSIC BASE COAT': { name: 'Base Coat 15ml -HTF', price: 10.48 },
}

// ── Normalisation helpers (mirrors AdminDashboard) ────────────────────────
function normalizeAdminSkuToken(v) {
  return String(v || '').toUpperCase().replace(/\s+/g, ' ').trim()
}
function normalizeAdminNameToken(name) {
  return String(name || '')
    .replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function simplifyProductNameForIndex(name) {
  const upper = normalizeAdminSkuToken(name)
  return upper
    .replace(/\s*-?\s*(HTF|HTE|HEMA[- ]FREE|NEW|-2025|2025)\s*$/i, '')
    .replace(/\b\d+\s*(ML|GR|G|MG|KG|L|S)\b/g, '')
    .replace(/\b(BRUSH|SPATULA|PIGMENT|SYNTHOGEL|SYNTHOLIQUID|AND|OF|COLOR|COLOUR)\b/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Mirror of AdminDashboard.extractOrderItemSkuToken (full version)
function extractOrderItemSkuToken(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  const normalized = normalizeAdminSkuToken(text)

  const giupMatch = normalized.match(/\bGIUP[-\s]*[A-Z0-9]+(?:[-\s]*[A-Z0-9]+)*\b/)
  if (giupMatch) return normalizeAdminSkuToken(giupMatch[0].replace(/-/g, ' '))

  const seriesMatch = normalized.match(/\b([A-Z]{2,6})\s*(\d{1,4}[A-Z]?)\b/)
  if (seriesMatch) return `${seriesMatch[1]} ${seriesMatch[2]}`

  const numericMatch = normalized.match(/^\d{1,4}[A-Z]?$/)
  if (numericMatch) return numericMatch[0]

  return ''
}

// Mirror of AdminDashboard.parseOrderItemEntry
function parseOrderItemEntry(rawItem, index = 0) {
  if (rawItem && typeof rawItem === 'object') {
    const qty = Math.max(1, Number(rawItem.qty ?? rawItem.quantity ?? 1) || 1)
    const explicitSku = normalizeAdminSkuToken(rawItem.sku || rawItem.code || '')
    const name = String(rawItem.name || rawItem.displayName || rawItem.description || explicitSku || `Item ${index + 1}`).trim()
    const sku = explicitSku || extractOrderItemSkuToken(name)
    return { sku, name, qty }
  }
  // String item format: "GIUP 01 x50"
  const raw = String(rawItem || '').trim()
  const qtyMatch = raw.match(/\s+x(\d+)$/i)
  const qty = qtyMatch ? Math.max(1, Number(qtyMatch[1]) || 1) : 1
  const label = qtyMatch ? raw.replace(/\s+x\d+$/i, '').trim() : raw
  const sku = extractOrderItemSkuToken(label)
  return { sku, name: label || `Item ${index + 1}`, qty }
}

// ── Build price map (mirrors AdminDashboard.buildOrderPriceLookupMap) ─────
function buildPriceLookupMap(items = []) {
  const map = new Map()
  const setIfMissing = (key, entry) => { if (!key || map.has(key)) return; map.set(key, entry) }

  for (const { name, sku, price } of items) {
    if (price == null) continue
    const numeric = Number(price)
    if (!Number.isFinite(numeric) || numeric <= 0) continue

    const unitPrice = Math.ceil(numeric * 1.2 * 10) / 10
    const entry = { name: String(name || '').trim(), unitPrice }

    setIfMissing(normalizeAdminSkuToken(sku), entry)
    setIfMissing(normalizeAdminSkuToken(name), entry)
    setIfMissing(normalizeAdminNameToken(name), entry)

    const numberPrefix = String(name || '').trim().match(/^(\d+[A-Z]?)\s/)
    if (numberPrefix) {
      const n = numberPrefix[1]
      setIfMissing(normalizeAdminSkuToken(n), entry)
      setIfMissing(normalizeAdminSkuToken(n.replace(/^0+(\d)/, '$1')), entry)
      setIfMissing(normalizeAdminSkuToken(n.padStart(2, '0')), entry)
    }

    const shortToken = extractOrderItemSkuToken(name)
    if (shortToken) {
      setIfMissing(shortToken, entry)
      const compact = normalizeAdminSkuToken(shortToken.replace(/\s+/g, ''))
      if (compact !== shortToken) setIfMissing(compact, entry)
    }

    const wordNumPrefix = normalizeAdminSkuToken(name).match(/^([A-Z][A-Z0-9]{1,})\s+(\d{1,4})\b/)
    if (wordNumPrefix) setIfMissing(`${wordNumPrefix[1]} ${wordNumPrefix[2]}`, entry)

    const simplified = simplifyProductNameForIndex(name)
    if (simplified && simplified !== normalizeAdminSkuToken(name)) {
      setIfMissing(simplified, entry)
      const nSeriesMatch = simplified.match(/^([A-Z]\d{3,4})\b/)
      if (nSeriesMatch) setIfMissing(nSeriesMatch[1], entry)
      const withoutLeadingCode = simplified.replace(/^[A-Z]{1,4}\d{3,5}\s*/, '').trim()
      if (withoutLeadingCode && withoutLeadingCode !== simplified) setIfMissing(withoutLeadingCode, entry)
    }

    if (simplified.includes('CUTICLE') && simplified.includes('OIL')) {
      const flavorWord = simplified
        .replace(/\bCUTICLE\b/g, '').replace(/\bOIL\b/g, '')
        .replace(/\b(COOLING|CHILLED|PERKY|SATIN|WHITE|RICH)\b/g, '')
        .replace(/\s+/g, ' ').trim()
      if (flavorWord) setIfMissing(`CUTICLE OIL ${flavorWord}`, entry)
    }
  }

  // Apply shared alias table
  for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
    const entry = map.get(normalizeAdminSkuToken(target)) || map.get(normalizeAdminNameToken(target))
    if (!entry) continue
    for (const c of codes) setIfMissing(normalizeAdminSkuToken(c), entry)
  }

  return map
}

// ── Resolve one item (mirrors AdminDashboard.resolveOrderItemPriceEntry) ──
function resolvePrice(item, map) {
  const sku      = normalizeAdminSkuToken(item?.sku)
  const name     = String(item?.name || '').trim()
  const nameNorm = normalizeAdminSkuToken(name)

  for (const key of [sku, nameNorm]) {
    if (!key) continue
    const ov = SKU_OVERRIDE_MAP[key]
    if (ov) return ov.price != null ? Math.ceil(ov.price * 1.2 * 10) / 10 : null
  }

  if (!map?.size) return null

  const candidates = [
    sku,
    nameNorm,
    normalizeAdminNameToken(name),
    sku.replace(/^GIUP\s*/i, '').trim(),
    simplifyProductNameForIndex(name),
    nameNorm.replace(/\b\d{3,5}\b/g, '').replace(/\s+/g, ' ').trim(),
  ].filter(Boolean)

  const seen = new Set()
  for (const key of candidates) {
    if (seen.has(key)) continue; seen.add(key)
    const hit = map.get(key)
    if (hit?.unitPrice != null) return hit.unitPrice
  }

  const compactSkuMatch = sku.match(/^([A-Z]{2,6})\s*(\d{1,4}[A-Z]?)$/)
  if (compactSkuMatch) {
    const hit = map.get(`${compactSkuMatch[1]} ${compactSkuMatch[2]}`)
    if (hit?.unitPrice != null) return hit.unitPrice
  }

  return null
}

// ── Main ──────────────────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(resolve(__dirname, '../public/gelitup-content/b2b-price-list.json'), 'utf8'))
const priceListItems = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : Object.values(raw))
const priceLookupMap = buildPriceLookupMap(priceListItems)

console.log(`Price list: ${priceListItems.length} items → map: ${priceLookupMap.size} keys\n`)

const { data: orders, error } = await supabase
  .from(ordersTable)
  .select('id, customer_email, created_at, distributor_tier, items, status')
  .order('created_at', { ascending: false })

if (error) {
  console.error('❌  Supabase query failed:', error.message)
  process.exit(1)
}

console.log(`Fetched ${orders.length} orders.\n`)

const missingByToken = new Map()   // token → { skus, names, orders }

let totalMissingOrders = 0

for (const order of orders) {
  const rawItems = Array.isArray(order.items)
    ? order.items
    : (typeof order.items === 'string' ? JSON.parse(order.items) : [])

  const items = rawItems.map((entry, i) => parseOrderItemEntry(entry, i))

  const missing = items.filter(item => resolvePrice(item, priceLookupMap) == null)
  if (!missing.length) continue

  totalMissingOrders++
  const date = order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : '?'
  console.log(`Order #${order.id}  [${order.status}]  ${order.customer_email}  ${date}  — ${missing.length} unresolved:`)

  for (const item of missing) {
    const sku  = String(item?.sku  || '').trim()
    const name = String(item?.name || '').trim()
    const qty  = item?.qty ?? item?.quantity ?? '?'
    const token = `${normalizeAdminSkuToken(sku)}||${normalizeAdminSkuToken(name)}`

    console.log(`    sku=${JSON.stringify(sku)}  name=${JSON.stringify(name)}  qty=${qty}`)

    if (!missingByToken.has(token)) {
      missingByToken.set(token, { sku, name, count: 0, orderIds: [] })
    }
    const rec = missingByToken.get(token)
    rec.count++
    rec.orderIds.push(order.id)
  }
  console.log()
}

if (missingByToken.size === 0) {
  console.log('✅  No missing prices found across all orders.')
} else {
  console.log('─'.repeat(60))
  console.log(`\nSummary — ${missingByToken.size} distinct unresolved item(s) across ${totalMissingOrders} order(s):\n`)
  const sorted = [...missingByToken.values()].sort((a, b) => b.count - a.count)
  for (const { sku, name, count, orderIds } of sorted) {
    const uniq = [...new Set(orderIds)]
    console.log(`  sku=${JSON.stringify(sku)}  name=${JSON.stringify(name)}`)
    console.log(`    → appears ${count}× in orders: ${uniq.join(', ')}`)
    console.log()
  }

  console.log('─'.repeat(60))
  console.log('\nTo fix each item, add to src/data/productAliases.js:')
  console.log('  { codes: [\'SKU_HERE\'], target: \'Exact Name in b2b-price-list.json\' }')
  console.log('\nIf the product is NOT in b2b-price-list.json, also add to SKU_OVERRIDE_MAP')
  console.log('in src/pages/AdminDashboard.jsx with a hardcoded base price.\n')
}
