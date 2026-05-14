#!/usr/bin/env node
/**
 * generate-meta-product-feed.mjs
 *
 * Builds a Facebook / Meta Product Catalog XML feed from:
 *   - public/gelitup-content/b2b-price-list.json   (SKU + price)
 *   - public/gelitup-content/product-image-map.json (product → image)
 *
 * Output: dist/meta-product-feed.xml  (or public/ at dev time)
 *
 * Usage:  node scripts/generate-meta-product-feed.mjs [--out public]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

/* ── CLI flag: output directory ─────────────────────────────────────────────── */
const outDir = process.argv.includes('--out')
  ? resolve(ROOT, process.argv[process.argv.indexOf('--out') + 1])
  : resolve(ROOT, 'dist')

/* ── Load data ──────────────────────────────────────────────────────────────── */
const priceList = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/b2b-price-list.json'), 'utf8'))
const imageMap  = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/product-image-map.json'), 'utf8'))
const hiddenProducts = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/hidden-products.json'), 'utf8'))
const outOfStockProducts = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/out-of-stock.json'), 'utf8'))
const productStatusCsv = readFileSync(resolve(ROOT, 'public/gelitup-content/product-status.csv'), 'utf8')

const SITE = 'https://gelitup.com'
const BRAND = 'GEL.IT.UP'
const CURRENCY = 'EUR'
const B2B_MULTIPLIER = 1.2

/* ── Helpers ────────────────────────────────────────────────────────────────── */

/** Derive a google_product_category-style label from the image path */
function categoryFromImagePath(imgPath) {
  if (!imgPath) return 'Nail Care'
  const parts = imgPath.split('/')
  // image paths look like /gelitup-content/product-images/CATEGORY/SUBCATEGORY/file.webp
  const cat = (parts[3] || '').toUpperCase()
  const map = {
    'COLORS': 'Gel Polish',
    'SOLID GEL POLISH': 'Gel Polish',
    'BASES': 'Base Coat',
    'TOPS': 'Top Coat',
    'BUILDER GEL': 'Builder Gel',
    'MULTIMIX': 'Builder Gel',
    'CREME DE LA CREME': 'Builder Gel',
    'ACRYLIC': 'Acrylic',
    'TOOLS': 'Nail Tools',
    'BRUSHES': 'Nail Brushes',
    'EQUIPMENT': 'Nail Equipment',
    'CONSUMABLES': 'Nail Consumables',
    'NAIL ART': 'Nail Art',
    'COBWEB': 'Nail Art',
    'LINE-IT-UP': 'Nail Art',
    'NAIL HAND & FOOT CARE': 'Nail Care',
    'NAIL PREPARATIONS': 'Nail Preparations',
    'BY THE OCEAN': 'Gel Polish',
  }
  return map[cat] || 'Nail Care'
}

/* ── Normalization helpers (mirrored from App.jsx) ──────────────────────────── */
function normalizeSkuCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function normalizeProductName(value) {
  return normalizeSkuCode(value)
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseProductStatusCsv(csvText) {
  const discontinued = new Set()
  if (!csvText) return discontinued

  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length <= 1) return discontinued

  for (const line of lines.slice(1)) {
    const parts = line.split(',')
    if (parts.length < 2) continue
    const code = String(parts[0] || '').trim()
    const name = String(parts[1] || '').trim()
    const status = String(parts[parts.length - 1] || '').trim().toLowerCase()
    if (status !== 'discontinued') continue
    if (code) discontinued.add(code)
    if (name) discontinued.add(name)
  }

  return discontinued
}

function buildVisibilitySet(values) {
  const set = new Set()
  for (const value of values || []) {
    const raw = String(value || '').trim()
    if (!raw) continue
    set.add(raw)
    set.add(normalizeSkuCode(raw))
    set.add(normalizeProductName(raw))
  }
  return set
}

function buildAliasIndexes() {
  const codeToTarget = new Map()
  const targetToCodes = new Map()

  for (const group of Array.isArray(PRODUCT_ALIAS_GROUPS) ? PRODUCT_ALIAS_GROUPS : []) {
    const target = String(group?.target || '').trim()
    if (!target) continue
    const codes = Array.isArray(group?.codes) ? group.codes : []
    for (const code of codes) {
      const normalizedCode = normalizeSkuCode(code)
      if (!normalizedCode) continue
      codeToTarget.set(normalizedCode, target)
      const codeSet = targetToCodes.get(target) || new Set()
      codeSet.add(code)
      targetToCodes.set(target, codeSet)
    }
  }

  return { codeToTarget, targetToCodes }
}

function expandVisibilityValues(values, aliasIndexes) {
  const expanded = new Set()
  const { codeToTarget, targetToCodes } = aliasIndexes

  for (const raw of values || []) {
    const value = String(raw || '').trim()
    if (!value) continue
    expanded.add(value)

    const normalized = normalizeSkuCode(value)
    const aliasTarget = codeToTarget.get(normalized)
    if (aliasTarget) {
      expanded.add(aliasTarget)
    }

    const targetCodes = targetToCodes.get(value)
    if (targetCodes) {
      for (const code of targetCodes) expanded.add(code)
    }
  }

  return [...expanded]
}

function inVisibilitySet(set, sku, name) {
  const rawSku = String(sku || '').trim()
  const rawName = String(name || '').trim()
  return (
    set.has(rawSku)
    || set.has(rawName)
    || set.has(normalizeSkuCode(rawSku))
    || set.has(normalizeSkuCode(rawName))
    || set.has(normalizeProductName(rawSku))
    || set.has(normalizeProductName(rawName))
  )
}

/* ── Build a normalized image lookup (same as App.jsx normalizeImageMap) ───── */
const normalizedImageMap = new Map()
for (const [rawKey, rawValue] of Object.entries(imageMap)) {
  const url = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!url) continue
  const nSku = normalizeSkuCode(rawKey)
  const nName = normalizeProductName(rawKey)
  if (nSku && !normalizedImageMap.has(nSku)) normalizedImageMap.set(nSku, url)
  if (nName && !normalizedImageMap.has(nName)) normalizedImageMap.set(nName, url)
}

const aliasIndexes = buildAliasIndexes()
const hiddenSet = buildVisibilitySet(expandVisibilityValues(hiddenProducts, aliasIndexes))
const outOfStockSet = buildVisibilitySet(expandVisibilityValues(outOfStockProducts, aliasIndexes))
const discontinuedSet = buildVisibilitySet(expandVisibilityValues(Array.from(parseProductStatusCsv(productStatusCsv)), aliasIndexes))

// Also index by GIUP + number aliases (the app uses buildColorAliases)
for (const [rawKey, rawValue] of Object.entries(imageMap)) {
  const url = typeof rawValue === 'string' ? rawValue.trim() : ''
  if (!url) continue
  const norm = normalizeSkuCode(rawKey)
  // Extract numeric code from "GIUP 01", "GIUP-2037", "GIUP N001" etc.
  const giupMatch = norm.match(/^GIUP[\s-]*(.+)$/)
  if (giupMatch) {
    const code = giupMatch[1].replace(/[\s-]+/g, ' ').trim()
    if (!normalizedImageMap.has(code)) normalizedImageMap.set(code, url)
    // For numeric codes, add zero-padded variants
    const numMatch = code.match(/^(\d{1,4})([A-Z]?)$/)
    if (numMatch) {
      const num = parseInt(numMatch[1], 10)
      const suffix = numMatch[2] || ''
      for (const pad of [String(num), String(num).padStart(2, '0'), String(num).padStart(3, '0')]) {
        const alias = `${pad}${suffix}`
        if (!normalizedImageMap.has(alias)) normalizedImageMap.set(alias, url)
      }
    }
  }
}

/** Find the best matching image for a product name */
function findImage(name) {
  // Strip -HTF / - HTF suffix
  const clean = name.replace(/\s*-\s*HTF$/i, '').trim()

  // ── Strategy 1: Exact normalized lookups (same as resolveCatalogImageUrl in App.jsx)
  const lookups = [
    normalizeSkuCode(name),
    normalizeSkuCode(clean),
    normalizeProductName(name),
    normalizeProductName(clean),
  ]
  for (const key of lookups) {
    if (key && normalizedImageMap.has(key)) return normalizedImageMap.get(key)
  }

  // ── Strategy 2: Extract leading alphanumeric code (e.g. "01 Ice Ice Baby" → "01")
  const leadMatch = clean.match(/^([A-Z]*\d+[A-Z]*)\b/i)
  if (leadMatch) {
    const code = normalizeSkuCode(leadMatch[1])
    if (normalizedImageMap.has(code)) return normalizedImageMap.get(code)
    // Try with GIUP prefix
    const giup = `GIUP ${code}`
    if (normalizedImageMap.has(giup)) return normalizedImageMap.get(giup)
  }

  // ── Strategy 3: Extract trailing code (e.g. "Autumn 2021 OTA01" → "OTA01")
  const parts = clean.split(/[\s#]+/)
  const lastWord = normalizeSkuCode(parts[parts.length - 1])
  if (/[A-Z]*\d+/i.test(lastWord) && lastWord !== (leadMatch && normalizeSkuCode(leadMatch[1]))) {
    if (normalizedImageMap.has(lastWord)) return normalizedImageMap.get(lastWord)
    const giup = `GIUP ${lastWord}`
    if (normalizedImageMap.has(giup)) return normalizedImageMap.get(giup)
  }

  // ── Strategy 4: Fuzzy substring match on normalized names
  const nName = normalizeProductName(clean)
  if (nName && nName.length >= 4) {
    for (const [key, url] of normalizedImageMap) {
      if (key.includes(nName) || nName.includes(key)) return url
    }
  }

  // ── Strategy 5: Word-overlap match (all significant words must appear)
  //    e.g. "LINE IT UP APRICOT" matches "line it UP 0017 Apricot"
  const STOP_WORDS = new Set(['GEL', 'PRO', 'NEW', 'THE', 'AND', 'FOR', 'HTF', 'GIUP', 'BY'])
  if (nName) {
    const words = nName.split(' ').filter(w => w.length >= 3 && !STOP_WORDS.has(w))
    if (words.length >= 2) {
      for (const [key, url] of normalizedImageMap) {
        if (words.every(w => key.includes(w))) return url
      }
    }
    // Try with just 1 significant word if product name is short
    if (words.length === 1 && words[0].length >= 5) {
      for (const [key, url] of normalizedImageMap) {
        if (key.includes(words[0])) return url
      }
    }
  }

  return null
}

/** Clean product name for display */
function cleanName(name) {
  return name
    .replace(/\s*-HTF$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** XML-escape a string */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** URL-encode path segments (spaces, special chars) but keep slashes */
function encodeImageUrl(path) {
  return path
    .split('/')
    .map((seg, i) => i === 0 ? seg : encodeURIComponent(seg))
    .join('/')
}

/* ── Build items ────────────────────────────────────────────────────────────── */
const items = []
let skipped = 0

for (const product of priceList.items) {
  if (inVisibilitySet(hiddenSet, product.sku, product.name)) continue
  if (inVisibilitySet(discontinuedSet, product.sku, product.name)) continue

  const img = findImage(product.name)
  if (!img) { skipped++; continue } // Meta requires an image

  const title = cleanName(product.name)
  const price = (product.price * B2B_MULTIPLIER).toFixed(2)
  const category = categoryFromImagePath(img)
  const imageUrl = `${SITE}${encodeImageUrl(img)}`

  items.push(`    <item>
      <g:id>${esc(product.sku)}</g:id>
      <g:title>${esc(title)}</g:title>
      <g:description>${esc(`${title} — Professional ${category} by ${BRAND}. EU certified, vegan, HEMA-free.`)}</g:description>
      <g:link>${SITE}/full-catalogue</g:link>
      <g:image_link>${esc(imageUrl)}</g:image_link>
      <g:brand>${BRAND}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${inVisibilitySet(outOfStockSet, product.sku, product.name) ? 'out of stock' : 'in stock'}</g:availability>
      <g:price>${price} ${CURRENCY}</g:price>
      <g:product_type>${esc(category)}</g:product_type>
      <g:google_product_category>Health &amp; Beauty &gt; Personal Care &gt; Cosmetics &gt; Nail Care</g:google_product_category>
    </item>`)
}

/* ── Compose XML ────────────────────────────────────────────────────────────── */
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>GEL.IT.UP B2B Product Catalog</title>
    <link>${SITE}</link>
    <description>Professional nail products by GEL.IT.UP — EU certified, vegan, HEMA-free</description>
${items.join('\n')}
  </channel>
</rss>
`

/* ── Write ──────────────────────────────────────────────────────────────────── */
mkdirSync(outDir, { recursive: true })
const outPath = resolve(outDir, 'meta-product-feed.xml')
writeFileSync(outPath, xml, 'utf8')

console.log(`✅  Meta product feed: ${items.length} products exported (${skipped} skipped — no image)`)
console.log(`    → ${outPath}`)
