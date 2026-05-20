/**
 * sync-stock-status.mjs
 * Reads stock-status.xlsx and writes public/gelitup-content/out-of-stock.json
 * with all product names where "In Stock (YES/NO)" column = NO.
 *
 * Usage: node scripts/sync-stock-status.mjs
 */

import ExcelJS from 'exceljs'
import { writeFileSync } from 'fs'

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile('stock-status.xlsx')

const ws = wb.worksheets[0]
const outOfStock = []

ws.eachRow((row, rn) => {
  if (rn === 1) return // skip header
  const vals = row.values
  const inStock = String(vals[vals.length - 1] ?? '').trim().toUpperCase()
  if (inStock === 'NO') {
    // Column B = Product Name
    const name = String(vals[2] ?? vals[1] ?? '').trim()
    if (name) outOfStock.push(name)
  }
})

writeFileSync(
  'public/gelitup-content/out-of-stock.json',
  JSON.stringify(outOfStock, null, 2) + '\n',
  'utf8'
)

console.log(`✅ out-of-stock.json updated — ${outOfStock.length} items marked out of stock`)
outOfStock.forEach(n => console.log(' -', n))
