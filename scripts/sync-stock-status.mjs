/**
 * sync-stock-status.mjs
 * Reads stock-status.xlsx and writes:
 *   public/gelitup-content/out-of-stock.json  — products where In Stock = NO
 *   public/gelitup-content/product-sizes.json  — map of product name → size label (e.g. "15ml", "200gr")
 *
 * Columns: A=SKU, B=Product Name, C=Price (EUR), D=In Stock (YES/NO), E=ml, F=gr
 *
 * Usage: node scripts/sync-stock-status.mjs
 */

import ExcelJS from 'exceljs'
import { writeFileSync } from 'fs'

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile('stock-status.xlsx')

const ws = wb.worksheets[0]
const outOfStock = []
const productSizes = {}

ws.eachRow((row, rn) => {
  if (rn === 1) return // skip header
  const vals = row.values
  // Column D (index 4) = In Stock (YES/NO)
  const inStock = String(vals[4] ?? '').trim().toUpperCase()
  // Column B (index 2) = Product Name
  const name = String(vals[2] ?? vals[1] ?? '').trim()
  if (!name) return

  if (inStock === 'NO') outOfStock.push(name)

  // Column E (index 5) = ml, Column F (index 6) = gr
  const ml = vals[5] != null ? String(vals[5]).trim() : ''
  const gr = vals[6] != null ? String(vals[6]).trim() : ''

  // Normalize key to match formatCatalogueDisplayKey output (replaces [_.-] with space)
  const normalizedName = name.replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (ml && ml !== '0') productSizes[normalizedName] = `${ml}ml`
  else if (gr && gr !== '0') productSizes[normalizedName] = `${gr}gr`
})

writeFileSync(
  'public/gelitup-content/out-of-stock.json',
  JSON.stringify(outOfStock, null, 2) + '\n',
  'utf8'
)
writeFileSync(
  'public/gelitup-content/product-sizes.json',
  JSON.stringify(productSizes, null, 2) + '\n',
  'utf8'
)

console.log(`✅ out-of-stock.json  — ${outOfStock.length} items out of stock`)
console.log(`✅ product-sizes.json — ${Object.keys(productSizes).length} products with size data`)
outOfStock.forEach(n => console.log('  OOS:', n))
