/**
 * import-stock-status.mjs
 *
 * Reads the factory-filled stock-status.xlsx (or .csv) and updates out-of-stock.json.
 * Any product with "In Stock" = NO (case-insensitive) gets added;
 * everything else is removed from the OOS list.
 *
 * Usage:
 *   node scripts/import-stock-status.mjs
 *   node scripts/import-stock-status.mjs path/to/custom-file.xlsx
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const filePath = process.argv[2] ?? join(root, 'stock-status.xlsx')
const wb = XLSX.readFile(filePath)
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

const header = rows[0].map(h => String(h).trim().toLowerCase())
const skuIdx    = header.findIndex(h => h.includes('sku'))
const stockIdx  = header.findIndex(h => h.includes('in stock'))

if (skuIdx === -1 || stockIdx === -1) {
  console.error('CSV must have "SKU" and "In Stock (YES/NO)" columns.')
  process.exit(1)
}

// Write exact price list names — no duplicate variants needed
const oosNames = []
for (const row of rows.slice(1)) {
  const sku   = row[skuIdx]?.trim()
  const stock = row[stockIdx]?.trim().toUpperCase()
  if (!sku || stock !== 'NO') continue
  oosNames.push(sku)
}

const outPath = join(root, 'public/gelitup-content/out-of-stock.json')
writeFileSync(outPath, JSON.stringify(oosNames, null, 2))
console.log(`Updated out-of-stock.json — ${oosNames.length} products out of stock`)
