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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

/* ── CLI flag: output directory ─────────────────────────────────────────────── */
const outDir = process.argv.includes('--out')
  ? resolve(ROOT, process.argv[process.argv.indexOf('--out') + 1])
  : resolve(ROOT, 'dist')

/* ── Load data ──────────────────────────────────────────────────────────────── */
const priceList = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/b2b-price-list.json'), 'utf8'))
const imageMap  = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/product-image-map.json'), 'utf8'))

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

/** Find the best matching image for a product name */
function findImage(name) {
  // Exact match
  if (imageMap[name]) return imageMap[name]

  // Try without -HTF suffix
  const clean = name.replace(/\s*-HTF$/i, '').trim()
  if (imageMap[clean]) return imageMap[clean]

  // Try case-insensitive partial match
  const lower = clean.toLowerCase()
  for (const [key, val] of Object.entries(imageMap)) {
    if (key.toLowerCase() === lower) return val
    // Skip _B variants (back-of-product images)
    if (key.endsWith('_B') || key.endsWith(' B')) continue
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return val
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
      <g:availability>in stock</g:availability>
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
