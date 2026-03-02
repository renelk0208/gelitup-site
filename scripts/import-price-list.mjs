/**
 * import-price-list.mjs
 * Converts a Zoho/Excel price list (.xlsx) into
 * public/gelitup-content/b2b-price-list.json
 *
 * Usage:
 *   node scripts/import-price-list.mjs <path-to-file.xlsx>
 *
 * Expected columns (row 1 = headers):
 *   A: Item Name
 *   B: SKU
 *   C: Item cost
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import XLSX from 'xlsx'

const [,, inputPath] = process.argv

if (!inputPath) {
  console.error('Usage: node scripts/import-price-list.mjs <path-to-file.xlsx>')
  process.exit(1)
}

const absInput = resolve(inputPath)
const outputPath = resolve('public/gelitup-content/b2b-price-list.json')

console.log(`Reading: ${absInput}`)
const workbook = XLSX.readFile(absInput)
const sheet = workbook.Sheets[workbook.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

// Find header row (first row containing "Item Name" or "SKU")
const headerRowIndex = rows.findIndex(row =>
  row.some(cell => typeof cell === 'string' && /item.?name/i.test(cell))
)

if (headerRowIndex === -1) {
  console.error('Could not find a header row with "Item Name". Check the spreadsheet.')
  process.exit(1)
}

const headers = rows[headerRowIndex].map(h => String(h).trim())
const colItemName = headers.findIndex(h => /item.?name/i.test(h))
const colSku      = headers.findIndex(h => /^sku$/i.test(h))
const colPrice    = headers.findIndex(h => /item.?cost|price/i.test(h))

console.log(`Headers found at row ${headerRowIndex + 1}: Item Name[${colItemName}], SKU[${colSku}], Item cost[${colPrice}]`)

const dataRows = rows.slice(headerRowIndex + 1)

const entries = []

for (const row of dataRows) {
  const name  = String(row[colItemName] ?? '').trim()
  const sku   = String(row[colSku]      ?? '').trim()
  const raw   = row[colPrice]
  const price = raw !== '' && raw != null ? Number(raw) : null

  if (!sku && !name) continue   // skip fully empty rows
  if (price == null || isNaN(price)) continue  // skip rows with no price

  entries.push({ name, sku, price })
}

console.log(`Parsed ${entries.length} priced products.`)

const output = {
  _meta: {
    source: absInput.split(/[\\/]/).pop(),
    generated: new Date().toISOString(),
    count: entries.length,
  },
  items: entries,
}

writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')
console.log(`Written: ${outputPath}`)
