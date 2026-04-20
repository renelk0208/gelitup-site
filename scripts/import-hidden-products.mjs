/**
 * import-hidden-products.mjs
 * Reads an Excel/CSV with SKUs to hide from the catalogue and writes
 * public/gelitup-content/hidden-products.json
 *
 * The spreadsheet needs one column (case-insensitive header):
 *   SKU — the image-map key to hide, e.g. "GIUP 2611", "SH07", "SCE01"
 *
 * Recognised header names: "SKU", "Item Code", "Product Code", "Code", "Key", "Hide"
 *
 * Usage:
 *   node scripts/import-hidden-products.mjs <file.xlsx|csv>
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import XLSX from 'xlsx'

const [,, inputPath] = process.argv

if (!inputPath) {
  console.error('Usage: node scripts/import-hidden-products.mjs <file.xlsx|csv>')
  process.exit(1)
}

const absInput = resolve(inputPath)
const outputPath = resolve('public/gelitup-content/hidden-products.json')

console.log(`Reading: ${absInput}`)
const workbook = XLSX.readFile(absInput)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// ── Locate header row ─────────────────────────────────────────────────────────
const headerRowIndex = rows.findIndex(row =>
  row.some(cell => typeof cell === 'string' && /^sku$|item.?code|product.?code|^code$|^key$|^hide$/i.test(cell))
)

if (headerRowIndex === -1) {
  console.error('ERROR: Could not find a header row with a SKU column.')
  console.error('Expected one of: SKU, Item Code, Product Code, Code, Key, Hide')
  process.exit(1)
}

const headers = rows[headerRowIndex].map(h => String(h).trim())
const colSku = headers.findIndex(h => /^sku$|item.?code|product.?code|^code$|^key$|^hide$/i.test(h))

if (colSku === -1) { console.error('ERROR: SKU column not found.'); process.exit(1) }

// ── Parse rows ────────────────────────────────────────────────────────────────
const dataRows = rows.slice(headerRowIndex + 1)
const hidden = []

for (const row of dataRows) {
  const sku = String(row[colSku] ?? '').trim()
  if (sku) hidden.push(sku)
}

// Sort and deduplicate
const unique = [...new Set(hidden)].sort((a, b) =>
  a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
)

writeFileSync(outputPath, JSON.stringify(unique, null, 2) + '\n', 'utf-8')

console.log(`\nDone! hidden-products.json updated.`)
console.log(`  Hidden products: ${unique.length}`)
console.log(`\nThese products will be removed from the catalogue on next deploy.`)
