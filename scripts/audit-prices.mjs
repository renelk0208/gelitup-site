// scripts/audit-prices.mjs
// Run: node scripts/audit-prices.mjs
// Shows every product in the image map that has NO price — using the same
// lookup logic as the app (alias groups, normalisation, synonym keys).

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

function load(relPath) {
  const full = resolve(root, 'public', relPath)
  if (!existsSync(full)) { console.error(`Missing: ${full}`); process.exit(1) }
  return JSON.parse(readFileSync(full, 'utf-8'))
}

const imageMap  = load('gelitup-content/product-image-map.json')
const priceList = load('gelitup-content/b2b-price-list.json')
const overrides = existsSync(resolve(root, 'public/gelitup-content/price-overrides.json'))
  ? load('gelitup-content/price-overrides.json')
  : {}

const discontinuedRaw = existsSync(resolve(root, 'public/gelitup-content/discontinued.json'))
  ? load('gelitup-content/discontinued.json')
  : []
const discontinuedSet = new Set(discontinuedRaw.map(k => String(k).trim().toUpperCase()))

// ── normalisation (mirrors App.jsx) ────────────────────────────────────────
function normalizeSkuCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}
function normalizeProductName(value) {
  return normalizeSkuCode(value)
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
    .replace(/(\d)(ML|GR|G)\b/gi, '$1 $2')
    .replace(/\b(HTF|HTE|HEMA\s*FREE|HEMAFREE)\b/gi, ' ')
    .replace(/\bGR\b/gi, 'G')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── synonym key derivation (mirrors deriveSpreadsheetSynonymKeys) ───────────
function deriveSpreadsheetSynonymKeys(name) {
  const normalized = normalizeProductName(name)
  if (!normalized) return []
  const keys = new Set()
  const add = (...values) => values.forEach(v => { const k = normalizeSkuCode(v); if (k) keys.add(k) })

  const classicBuilderMatch = normalized.match(/^3 IN 1 BUILDER GEL\s+(.+?)\s+40 G$/)
  if (classicBuilderMatch) {
    const shade = classicBuilderMatch[1]
    add(`3 IN 1 ${shade}`, `3IN1${shade.replace(/\s+/g, '')}`, `3 IN 1 BUILDER GEL ${shade}`)
  }
  const shimmeryBuilderMatch = normalized.match(/^3 IN 1 SHIMMERY BUILDER GEL\s+40 G\s+(.+)$/)
  if (shimmeryBuilderMatch) {
    const shade = shimmeryBuilderMatch[1]
    const legacyShadeMap = {
      'CLEAR IRIDESCENT': 'IRIDESCENT SHIMMER CLEAR',
      'COVER': 'SHIMMER COVER',
      'LIGHT LILAC': 'SHIMMER LILAC',
      'PINK MARMALADE': 'MARMELADE SHIMMER PINK',
    }
    const legacyShade = legacyShadeMap[shade]
    if (legacyShade) add(`3 IN 1 BUILDER GEL ${legacyShade}`, `3 IN 1 BUILDER GEL ${legacyShade} B`)
  }
  const premiumBuilderMatch = normalized.match(/^PREMIUM BUILDER GEL\s+(.+?)\s+40 GR$/)
  if (premiumBuilderMatch) {
    const shade = premiumBuilderMatch[1]
    add(`3 IN 1 GELITUP PREMIUM BUILDER GEL ${shade}`, `3 IN 1 GELITUP PREMIUM BUILDER GEL ${shade} B`)
  }
  if (normalized === 'PREMIUM PLUS FIBER GLASS BUILDER GEL 40 GR') {
    add('3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR PLUS', '3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR PLUS B', '3 IN 1 PREMIUM PLUS')
  }
  const brushOnBuilderMatch = normalized.match(/^BRUSH ON BUILDER GEL\s+(.+?)\s+15 ML$/)
  if (brushOnBuilderMatch) {
    const shade = brushOnBuilderMatch[1]
    add(`BRUSH ON BUILDER BIAB ${shade}`)
  }
  if (normalized === 'ACRYLIC COMPETE POWDER COVER 35 G')          add('ACRYLICS COVER')
  if (normalized === 'ACRYLIC COMPETE POWDER EXTREME WHITE 35 G')   add('ACRYLICS EXTREME WHITE')
  if (normalized === 'ACRYLIC COMPETE POWDER PINK 35 G')            add('ACRYLICS PINK')
  if (normalized === 'ACRYLIC CLASSIC POWDER WHITE 35 G' || normalized === 'ACRYLIC COMPETE POWDER MILKY WHITE 35 G') add('ACRYLICS WHITE')
  if (/^2113\b/.test(normalized)) add('SFT 2113')

  const multimixMatch = normalized.match(/^MULTIMIX SYNTHOGEL (30|60) G (.+)$/)
  if (multimixMatch) {
    const size = multimixMatch[1], shade = multimixMatch[2]
    const multimixAliasMap = {
      '30:BABY BLUE': ['MULTIMIX BABY BLUE COLOR'],
      '30:BABY PINK GLITTER': ['MULTIMIX BABY PINK GLITTER COLOR'],
      '30:BLUE GLITTER': ['MULTIMIX BLUE GLITTER COLOR'],
      '30:BUBBLE GUM GLITTER': ['MULTIMIX BUBBLE GUM GLITTER COLOR', 'MULTIMIX BUBBLEGUM GLITTER COLOR'],
      '30:CLEAR': ['MULTIMIX CLEAR COLOR'],
      '30:GLITSY GREEN': ['MULTIMIX GLITSY GREEN COLOR'],
      '30:LIGHT NUDE': ['MULTIMIX LIGHT NUDE COLOR'],
      '30:MINTY GREEN': ['MULTIMIX MINT GREEN COLOR'],
      '30:PINK III': ['MULTIMIX PINKIII COLOR'],
      '30:SUPER SOFT PINK': ['MULTIMIX SUPER SOFT PINK COLOR'],
      '60:BLACK': ['MULTIMIX BLACK COLOR'],
      '60:CLEAR': ['MULTIMIX CLEAR COLOR'],
      '60:CLEAR GLITTER': ['MULTIMIX GLITTERS CLEAR'],
      '60:COVER': ['MULTIMIX COVER COLOR'],
      '60:COVER II': ['MULTIMIX COVER II COLOR'],
      '60:CRYSTAL CLEAR': ['MULTIMIX CRYSTAL CLEAR COLOR'],
      '60:GLITTER GOLD': ['MULTIMIX GLITTERS GOLD'],
      '60:GLITTER NUDE': ['MULTIMIX GLITTERS NUDE'],
      '60:GLITTER PINK': ['MULTIMIX GLITTERS PINK', 'MULTIMIX GLITTERPINK COLOR'],
      '60:GLITTER PINK II': ['MULTIMIX PINK II COLOR'],
      '60:GLITTER WHITE': ['MULTIMIX GLITTERS WHITE'],
      '60:LIGHT LILAC': ['MULTIMIX LILAC COLOR'],
      '60:LIGHT PINK': ['MULTIMIX LIGHT PINK COLOR'],
      '60:MILKY WHITE': ['MULTIMIX MILKY WHITE COLOR'],
      '60:NUDE': ['MULTIMIX NUDE COLOR'],
      '60:PINK': ['MULTIMIX PINK COLOR'],
      '60:PINK II': ['MULTIMIX PINK II COLOR'],
      '60:SUPER MILKY': ['MULTIMIX SUPER MILKY COLOR'],
      '60:WHITE': ['MULTIMIX WHITE COLOR', 'MULTIMIX WHITE 60ML 60G'],
    }
    const aliases = multimixAliasMap[`${size}:${shade}`] || []
    aliases.forEach(alias => add(alias, `${alias} ${size}G`, `${alias} ${size} G`, `${alias} B ${size}G`, `${alias} B ${size} G`, `${alias} C ${size}G`, `${alias} C ${size} G`))
  }

  return [...keys]
}

// ── build price map (mirrors App.jsx price-list loading) ───────────────────
const priceMap = new Map()
function setKey(k, entry) { if (k && !priceMap.has(k)) priceMap.set(k, entry) }

const items = Array.isArray(priceList?.items) ? priceList.items : []
for (const { name, sku, price } of items) {
  const cleanName = String(name || '').replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '').trim()
  const entry = { name, price }

  setKey(normalizeSkuCode(sku), entry)
  setKey(normalizeSkuCode(cleanName), entry)
  setKey(normalizeProductName(name), entry)
  setKey(normalizeProductName(cleanName), entry)

  // Leading number extraction
  const numMatch = cleanName.match(/^(\d+[A-Z]?)\s/)
  if (numMatch) {
    setKey(numMatch[1].replace(/^(\d+)/, n => n.padStart(2, '0')), entry)
    setKey(numMatch[1].replace(/^0+(\d)/, '$1'), entry)
    setKey(numMatch[1], entry)
  }

  // Series #N patterns
  const seriesNumMatch = cleanName.match(/^([A-Z]+)\s*#\s*(\d+[A-Z]?)\b/i)
  if (seriesNumMatch) {
    const s = seriesNumMatch[1].toUpperCase(), n = seriesNumMatch[2]
    ;[`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`].forEach(k => setKey(k, entry))
  }

  // Embedded #CODE patterns
  const embeddedCodeMatch = cleanName.match(/#([A-Z]+)\s*(\d+[A-Z]?)\b/i)
  if (embeddedCodeMatch) {
    const s = embeddedCodeMatch[1].toUpperCase(), n = embeddedCodeMatch[2]
    ;[`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`].forEach(k => setKey(k, entry))
  }

  // LETTERS+DIGITS token matches
  for (const tm of [...cleanName.matchAll(/\b([A-Z]{1,5})(\d{1,3}[A-Z]?)\b/gi)]) {
    const s = tm[1].toUpperCase(), n = tm[2]
    ;[`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`].forEach(k => setKey(k, entry))
  }

  // Synonym keys (multimix aliases, builder gel variants, etc.)
  for (const k of deriveSpreadsheetSynonymKeys(name)) {
    setKey(k, entry)
    setKey(normalizeProductName(k), entry)
  }
}

// Apply PRODUCT_ALIAS_GROUPS (same as applyProductAliasGroupsToPriceMap)
for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
  const entry = priceMap.get(normalizeProductName(target)) || priceMap.get(normalizeSkuCode(target))
  if (!entry) continue
  for (const code of codes) {
    setKey(normalizeSkuCode(code), entry)
    setKey(normalizeProductName(code), entry)
  }
}

// Apply price-overrides.json
for (const [k, price] of Object.entries(overrides)) {
  const entry = { name: k, price }
  setKey(normalizeSkuCode(k), entry)
  setKey(normalizeProductName(k), entry)
}

// ── check every image map key ──────────────────────────────────────────────
function resolves(key) {
  // Skip discontinued products
  if (discontinuedSet.has(String(key).trim().toUpperCase())) return true

  if (priceMap.has(normalizeSkuCode(key))) return true
  if (priceMap.has(normalizeProductName(key))) return true
  // giupNumMatch: GIUP-2050 → strip prefix → '2050' → look up bare number
  const pn = normalizeProductName(key)
  const giupNum = pn.match(/^(\d+[A-Z]?)$/)
  if (giupNum) {
    if (priceMap.has(giupNum[1])) return true
    if (priceMap.has(giupNum[1].padStart(2, '0'))) return true
  }
  // Strip '2026-NEW-' or '2026 NEW ' prefix and retry (mirrors app's 2026-NEW stripping)
  const stripped = normalizeSkuCode(key).replace(/^2026[-\s]+NEW[-\s]+/i, '').trim()
  if (stripped && stripped !== normalizeSkuCode(key)) {
    if (priceMap.has(stripped)) return true
    if (priceMap.has(normalizeProductName(stripped))) return true
  }
  // B/C variant fallback: strip trailing _B, _C, -B, -C, " B", " C" suffix and retry on base key
  const bcStripped = normalizeSkuCode(key).replace(/[-_\s][BC](-\d+G?)?$/i, '').trim()
  if (bcStripped && bcStripped !== normalizeSkuCode(key)) {
    if (priceMap.has(bcStripped)) return true
    if (priceMap.has(normalizeProductName(bcStripped))) return true
  }
  return false
}

// Build path→keys index for sibling resolution
const byPath = {}
for (const [key, value] of Object.entries(imageMap)) {
  if (typeof value !== 'string' || !value.includes('/gelitup-content/product-images/')) continue
  if (!byPath[value]) byPath[value] = []
  byPath[value].push(key)
}

const missing = []
for (const [key, value] of Object.entries(imageMap)) {
  if (typeof value !== 'string' || !value.includes('/gelitup-content/product-images/')) continue
  // Skip decorative hero/section images — they have no price and are not orderable products
  if (/\.hero\.image$/i.test(key) || /hero\.image$/i.test(key)) continue
  if (resolves(key)) continue
  // Allow if another key pointing to the same image has a price (alias key)
  const hasPricedSibling = (byPath[value] || []).some(s => resolves(s))
  if (!hasPricedSibling) missing.push({ key, imageUrl: value })
}

if (missing.length === 0) {
  console.log('✓ All products have prices — no gaps found.')
  process.exit(0)
}

console.log(`\n⚠️  ${missing.length} products have no price mapping:\n`)
for (const { key } of missing) {
  console.log(`  "${key}"`)
}
console.log(`\nFix: add these keys to public/gelitup-content/price-overrides.json`)
console.log(`Format: { "KEY_EXACTLY_AS_ABOVE": 4.90, ... }\n`)
process.exit(1)
