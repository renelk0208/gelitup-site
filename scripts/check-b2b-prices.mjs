/**
 * check-b2b-prices.mjs
 * Simulates the B2B portal price map and checks every product image path
 * in product-image-map.json for a resolvable price.
 *
 * Products are derived from the image map keys/paths exactly as App.jsx does,
 * and the shared PRODUCT_ALIAS_GROUPS source file is imported directly so it
 * stays in sync with the app.
 *
 * Usage: node scripts/check-b2b-prices.mjs
 */

import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'
import { readFileSync } from 'fs'

// ---------- helpers (mirror App.jsx) ----------

const FUZZY_PRICE_SKIP = new Set(['COLOR', 'COLOUR', 'COAT', 'CARE', 'FORM', 'SIZE', 'NAIL'])

function normalizeSkuCode(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
}
function normalizeProductName(v) {
  return String(v || '')
    .replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}
function formatCatalogueItemName(rawPath) {
  const fileName = rawPath.split('/').pop() || ''
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '')
  return withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}
function extractProductCode(name) {
  const cleaned = String(name || '').trim()
  const m = cleaned.match(/[A-Z]{2,8}\s*-?\s*\d+[A-Z0-9-]*/i)
  if (m) return m[0].toUpperCase()
  return normalizeSkuCode(cleaned).replace(/[^A-Z0-9]+/g, ' ').trim() || 'ITEM'
}

// ---------- load price list ----------

const raw = JSON.parse(readFileSync('public/gelitup-content/b2b-price-list.json', 'utf8'))
const plItems = Array.isArray(raw) ? raw : (Array.isArray(raw.items) ? raw.items : Object.values(raw))

const B2B_PRICE_MULTIPLIER = 1.2

// ---------- build price map (mirrors App.jsx) ----------

const map = new Map()
const wordIndex = []
const stripSuffix = s => String(s || '').replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '').trim()
const isMultimix30g = n => /multimix/i.test(n) && /\b30\s*g/i.test(n)

for (const { name, sku, price } of plItems) {
  const cleanName = stripSuffix(name)
  const surcharge = isMultimix30g(name) ? 1.1 : 1
  const entry = {
    name,
    price: price != null ? Math.ceil(Number(price) * B2B_PRICE_MULTIPLIER * surcharge * 10) / 10 : null,
  }
  const keys = [
    normalizeSkuCode(sku),
    normalizeSkuCode(stripSuffix(sku)),
    normalizeProductName(name),
    normalizeProductName(cleanName),
  ]
  const numMatch = cleanName.match(/^(\d+[A-Z]?)\s/)
  if (numMatch) {
    keys.push(
      numMatch[1].replace(/^(\d+)/, n => n.padStart(2, '0')),
      numMatch[1].replace(/^0+(\d)/, '$1'),
      numMatch[1],
    )
  }
  const seriesNumMatch = cleanName.match(/^([A-Z]+)\s*#\s*(\d+[A-Z]?)\b/i)
  if (seriesNumMatch) {
    const s = seriesNumMatch[1].toUpperCase(), n = seriesNumMatch[2]
    keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
  }
  const embeddedCodeMatch = cleanName.match(/#([A-Z]+)\s*(\d+[A-Z]?)\b/i)
  if (embeddedCodeMatch) {
    const s = embeddedCodeMatch[1].toUpperCase(), n = embeddedCodeMatch[2]
    keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
  }
  const tokenMatches = [...cleanName.matchAll(/\b([A-Z]{1,5})(\d{1,3}[A-Z]?)\b/gi)]
  for (const tm of tokenMatches) {
    const s = tm[1].toUpperCase(), n = tm[2]
    keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
  }
  for (const k of keys) {
    if (k && !map.has(k)) map.set(k, entry)
  }
  wordIndex.push({ words: new Set(normalizeSkuCode(name).split(/\s+/)), entry })
}

// ---------- parse shared alias groups ----------

const aliasGroups = Array.isArray(PRODUCT_ALIAS_GROUPS) ? PRODUCT_ALIAS_GROUPS : []

const pnLookup = t => map.get(normalizeProductName(t))
for (const { codes, target } of aliasGroups) {
  const entry = pnLookup(target)
  if (entry) {
    for (const c of codes) {
      if (!map.has(c)) map.set(c, entry)
    }
  }
}
console.log(`Loaded ${aliasGroups.length} aliasGroups from src/data/productAliases.js`)

// ---------- fuzzy fallback ----------

function fuzzyLookup(code, name) {
  for (const cand of [code, name].filter(Boolean)) {
    const qWords = normalizeSkuCode(cand)
      .split(/\s+/)
      .filter(w => w.length >= 4 && !FUZZY_PRICE_SKIP.has(w))
      .map(w => w.length >= 6 ? w.replace(/S$/, '') : w)
    if (qWords.length < 2) continue
    const match = wordIndex.find(({ words }) =>
      qWords.every(w => words.has(w) || words.has(w + 'S'))
    )
    if (match) return match.entry
  }
  return null
}

// ---------- full lookup (mirrors lookupCataloguePrice) ----------

function lookupPrice(itemName, itemCode) {
  let hit = map.get(normalizeProductName(itemName))
  if (hit?.price != null) return hit

  hit = map.get(normalizeSkuCode(itemCode))
  if (hit?.price != null) return hit

  hit = map.get(itemCode)  // raw alias key (App.jsx stores aliases un-normalized)
  if (hit?.price != null) return hit

  const giupNumMatch = normalizeSkuCode(itemCode).match(/^(?:GIUP\s+)?(\d+[A-Z]?)$/)
  if (giupNumMatch) {
    const n = giupNumMatch[1]
    hit = map.get(n.padStart(2, '0')) || map.get(n)
    if (hit?.price != null) return hit
  }
  const giupSeriesMatch = normalizeSkuCode(itemCode).match(/^(?:GIUP[-\s]+)?([A-Z]+)(\d+[A-Z]?)$/)
  if (giupSeriesMatch) {
    const s = giupSeriesMatch[1], n = giupSeriesMatch[2]
    hit = map.get(`${s} ${n}`) || map.get(`${s} ${n.padStart(2, '0')}`) ||
          map.get(`${s}${n}`) || map.get(`${s}${n.padStart(2, '0')}`) ||
          map.get(`${s} ${n.replace(/^0+(\d)/, '$1')}`)
    if (hit?.price != null) return hit
  }
  const giupLooseSeriesMatch = !giupSeriesMatch &&
    normalizeSkuCode(itemCode).match(/^(?:GIUP[-\s]+)?([A-Z]{2,5})(\d{1,3})(?=[A-Z])/)
  if (giupLooseSeriesMatch) {
    const s = giupLooseSeriesMatch[1], n = giupLooseSeriesMatch[2]
    hit = map.get(`${s} ${n}`) || map.get(`${s} ${n.padStart(2, '0')}`)
    if (hit?.price != null) return hit
  }
  hit = map.get(normalizeSkuCode(itemName))
  if (hit?.price != null) return hit

  return fuzzyLookup(itemCode, itemName)
}

// ---------- collect products from product-image-map ----------

const imgMap = JSON.parse(readFileSync('public/gelitup-content/product-image-map.json', 'utf8'))

const isHero = p => /hero\.image/i.test((p || '').split('/').pop() || '')
const blockedTokens = ['CRACK', 'THERMO', 'CREME DE LA CREME']
const isBlocked = p => {
  const up = (p || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ')
  return blockedTokens.some(t => up.includes(t))
}

const allItems = []
for (const [, val] of Object.entries(imgMap)) {
  if (typeof val !== 'string') continue
  const imgPath = val.trim()
  if (!imgPath.includes('/gelitup-content/product-images/')) continue
  if (isHero(imgPath)) continue
  if (isBlocked(imgPath)) continue
  const afterRoot = imgPath.split('/gelitup-content/product-images/')[1] || ''
  const name = formatCatalogueItemName(afterRoot)
  const code = extractProductCode(name)
  allItems.push({ name, code, imgPath })
}

// Deduplicate by name
const seenNames = new Set()
const products = []
for (const p of allItems) {
  if (!seenNames.has(p.name)) { seenNames.add(p.name); products.push(p) }
}

// ---------- check prices ----------

const missing = []
const found = []
for (const { name, code, imgPath } of products) {
  const hit = lookupPrice(name, code)
  if (!hit || hit.price == null) {
    missing.push({ name, code, imgPath })
  } else {
    found.push({ name, code, price: hit.price })
  }
}

console.log(`\nPrice list items:   ${plItems.length}`)
console.log(`Catalogue products: ${products.length} (from ${allItems.length} image paths, deduped by name)`)
console.log(`With price:         ${found.length}`)
console.log(`MISSING price:      ${missing.length}\n`)

if (missing.length) {
  console.log('--- Items with no price ---')
  missing.forEach(p => console.log(`  name="${p.name}"  code="${p.code}"\n    ${p.imgPath}`))
} else {
  console.log('All catalogue products have a price. ✓')
}
