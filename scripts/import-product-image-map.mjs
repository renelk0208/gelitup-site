/**
 * import-product-image-map.mjs
 * Merges new entries from an Excel/CSV file into
 * public/gelitup-content/product-image-map.json
 *
 * The spreadsheet needs two columns (any order, case-insensitive headers):
 *   SKU         — the lookup key, e.g. "GIUP 2611", "SH07", "SCE01"
 *   Image Path  — path relative to public/, e.g.
 *                  "/gelitup-content/product-images/COLORS/SOLID GEL POLISH/Coral Orange/2611.webp"
 *
 * Recognised header names:
 *   SKU column  — "SKU", "Item Code", "Product Code", "Code", "Key"
 *   Path column — "Image Path", "Path", "Image URL", "Image", "URL"
 *
 * Behaviour:
 *   • Existing entries are preserved (not overwritten) unless --force is passed
 *   • New entries are merged in and the full map is sorted alphabetically
 *   • A summary is printed showing added / skipped / total counts
 *
 * Usage:
 *   node scripts/import-product-image-map.mjs <file.xlsx|csv>
 *   node scripts/import-product-image-map.mjs <file.xlsx|csv> --force
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import XLSX from 'xlsx'

const args = process.argv.slice(2)
const force = args.includes('--force')
const inputPath = args.find(a => !a.startsWith('--'))

if (!inputPath) {
  console.error('Usage: node scripts/import-product-image-map.mjs <file.xlsx|csv> [--force]')
  process.exit(1)
}

const absInput = resolve(inputPath)
const mapPath = resolve('public/gelitup-content/product-image-map.json')

// ── Read existing map ─────────────────────────────────────────────────────────
let existing = {}
try {
  existing = JSON.parse(readFileSync(mapPath, 'utf-8'))
} catch {
  console.log('No existing product-image-map.json found — creating fresh.')
}

// ── Read spreadsheet ──────────────────────────────────────────────────────────
console.log(`Reading: ${absInput}`)
const workbook = XLSX.readFile(absInput)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// ── Locate header row ─────────────────────────────────────────────────────────
const headerRowIndex = rows.findIndex(row =>
  row.some(cell => typeof cell === 'string' && /^sku$|item.?code|product.?code|^code$|^key$/i.test(cell))
)

if (headerRowIndex === -1) {
  console.error('ERROR: Could not find a header row with a SKU column.')
  console.error('Expected one of: SKU, Item Code, Product Code, Code, Key')
  console.error('First row:', rows[0])
  process.exit(1)
}

const headers = rows[headerRowIndex].map(h => String(h).trim())

function findCol(patterns) {
  for (const pat of patterns) {
    const idx = headers.findIndex(h => pat.test(h))
    if (idx !== -1) return idx
  }
  return -1
}

const colSku = findCol([/^sku$/i, /item.?code/i, /product.?code/i, /^code$/i, /^key$/i])
const colPath = findCol([/image.?path/i, /^path$/i, /image.?url/i, /^image$/i, /^url$/i])

console.log(`Header row: ${headerRowIndex + 1}`)
console.log(`  SKU [${colSku}]  Image Path [${colPath}]`)

if (colSku === -1) { console.error('ERROR: SKU column not found.'); process.exit(1) }
if (colPath === -1) { console.error('ERROR: Image Path column not found.'); process.exit(1) }

// ── Parse and merge ───────────────────────────────────────────────────────────
const dataRows = rows.slice(headerRowIndex + 1)
let added = 0
let skipped = 0
let overwritten = 0

for (const row of dataRows) {
  const sku = String(row[colSku] ?? '').trim()
  const imgPath = String(row[colPath] ?? '').trim()

  if (!sku || !imgPath) continue

  if (existing[sku] && !force) {
    skipped++
    continue
  }

  if (existing[sku] && force) {
    overwritten++
  } else {
    added++
  }

  existing[sku] = imgPath
}

// ── Sort and write ────────────────────────────────────────────────────────────
const sorted = Object.fromEntries(
  Object.entries(existing).sort(([a], [b]) =>
    a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
  )
)

writeFileSync(mapPath, JSON.stringify(sorted, null, 2) + '\n', 'utf-8')

const total = Object.keys(sorted).length
console.log('')
console.log(`Done! product-image-map.json updated.`)
console.log(`  Added:       ${added}`)
if (force) console.log(`  Overwritten: ${overwritten}`)
console.log(`  Skipped:     ${skipped} (already existed)`)
console.log(`  Total:       ${total} entries`)
