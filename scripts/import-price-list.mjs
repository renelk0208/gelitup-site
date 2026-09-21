/**
 * import-price-list.mjs
 * Converts a Zoho Books item export (.xlsx or .csv) into
 * public/gelitup-content/b2b-price-list.json
 *
 * Accepts Zoho's native export format directly — no column renaming needed.
 * Discontinued / inactive items (Status column = "Inactive") are skipped
 * automatically, so just download fresh from Zoho and run.
 *
 * Usage:
 *   node scripts/import-price-list.mjs <path-to-file.xlsx>
 *   node scripts/import-price-list.mjs <path-to-file.csv>
 *
 * Recognised column names (case-insensitive, any order):
 *   Item Name   — "Item Name", "Product Name", "Name"
 *   SKU         — "SKU", "Item Code", "Item SKU"
 *   Price       — "Sales Rate", "Rate", "Selling Price", "Sales Price",
 *                 "Unit Price", "Item Price", "Price",
 *                 "Item Cost", "Purchase Rate", "Cost Price"  (fallback)
 *   Status      — "Status"  →  rows where value is "Inactive" are skipped
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import XLSX from 'xlsx'

const [,, inputPath] = process.argv

if (!inputPath) {
  console.error('Usage: node scripts/import-price-list.mjs <path-to-file.xlsx|csv>')
  process.exit(1)
}

const absInput = resolve(inputPath)
const outputPath = resolve('public/gelitup-content/b2b-price-list.json')

console.log(`Reading: ${absInput}`)
const workbook = XLSX.readFile(absInput)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// ── Locate header row ─────────────────────────────────────────────────────────
const headerRowIndex = rows.findIndex(row =>
  row.some(cell => typeof cell === 'string' && /item.?name|product.?name|^name$/i.test(cell))
)

if (headerRowIndex === -1) {
  console.error('ERROR: Could not find a header row containing "Item Name" / "Product Name" / "Name".')
  console.error('Headers in row 1:', rows[0])
  process.exit(1)
}

const headers = rows[headerRowIndex].map(h => String(h).trim())

// ── Column detection (first match wins in priority order) ─────────────────────
function findCol(patterns) {
  for (const pat of patterns) {
    const idx = headers.findIndex(h => pat.test(h))
    if (idx !== -1) return idx
  }
  return -1
}

const colItemName = findCol([/item.?name/i, /product.?name/i, /^name$/i])
const colSku      = findCol([/^sku$/i, /item.?code/i, /item.?sku/i, /^barcode$/i])
// Prefer selling/sales price; fall back to cost/purchase price
const colPrice    = findCol([
  /^sales.?rate$/i, /^rate$/i, /selling.?price/i, /sales.?price/i,
  /unit.?price/i,   /item.?price/i, /^price$/i,
  /item.?cost/i,    /purchase.?rate/i, /cost.?price/i,
])
const colStatus   = findCol([/^status$/i])

console.log(`Header row: ${headerRowIndex + 1}`)
console.log(`  Item Name [${colItemName}]  SKU [${colSku}]  Price [${colPrice}]  Status [${colStatus}]`)

if (colItemName === -1) { console.error('ERROR: "Item Name" column not found.'); process.exit(1) }
if (colSku === -1)      { console.error('ERROR: "SKU" column not found.');       process.exit(1) }
if (colPrice === -1)    { console.error('ERROR: No price column found. Expected one of: Sales Rate, Rate, Selling Price, Item Cost, etc.'); process.exit(1) }

// ── Parse rows ────────────────────────────────────────────────────────────────
const dataRows = rows.slice(headerRowIndex + 1)
const entries  = []
let skippedInactive = 0
let skippedNoPrice  = 0

for (const row of dataRows) {
  const name   = String(row[colItemName] ?? '').trim()
  const sku    = String(row[colSku]      ?? '').trim()
  const status = colStatus !== -1 ? String(row[colStatus] ?? '').trim().toLowerCase() : ''
  const raw    = row[colPrice]
  const price  = raw !== '' && raw != null ? Number(raw) : null

  if (!sku && !name) continue                 // fully empty row

  if (status === 'inactive') {                // skip discontinued items
    skippedInactive++
    continue
  }

  if (price == null || isNaN(price)) {        // skip rows with no price
    skippedNoPrice++
    continue
  }

  entries.push({ name, sku, price })
}

console.log(`\nParsed ${entries.length} active priced products.`)
if (skippedInactive) console.log(`  Skipped inactive/discontinued: ${skippedInactive}`)
if (skippedNoPrice)  console.log(`  Skipped (no price): ${skippedNoPrice}`)

// ── Write output ──────────────────────────────────────────────────────────────
const output = {
  _meta: {
    source: absInput.split(/[\\/]/).pop(),
    generated: new Date().toISOString(),
    count: entries.length,
  },
  items: entries,
}

writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')
console.log(`\nWritten: ${outputPath}`)
