/**
 * export-stock-status.mjs
 *
 * Generates stock-status.xlsx — one row per product from the B2B price list,
 * pre-filled with current in/out-of-stock status from out-of-stock.json.
 *
 * Factory fills in the "In Stock" column (YES / NO), then run:
 *   node scripts/import-stock-status.mjs
 * to update out-of-stock.json automatically.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import * as XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const priceList = JSON.parse(readFileSync(join(root, 'public/gelitup-content/b2b-price-list.json'), 'utf8'))
const outOfStock = JSON.parse(readFileSync(join(root, 'public/gelitup-content/out-of-stock.json'), 'utf8'))

// out-of-stock.json now uses exact price list names — simple Set lookup
const oosSet = new Set(outOfStock.map(s => s.trim()))
const isOOS = name => oosSet.has(name.trim())

const data = [['SKU', 'Product Name', 'Price (EUR)', 'In Stock (YES/NO)']]
for (const item of priceList.items) {
  data.push([item.sku, item.name, item.price, isOOS(item.name) ? 'NO' : 'YES'])
}

const wb = XLSX.utils.book_new()
const ws = XLSX.utils.aoa_to_sheet(data)

// Column widths
ws['!cols'] = [{ wch: 40 }, { wch: 60 }, { wch: 14 }, { wch: 20 }]

// Freeze header row
ws['!freeze'] = { xSplit: 0, ySplit: 1 }

XLSX.utils.book_append_sheet(wb, ws, 'Stock Status')

const outPath = join(root, 'stock-status.xlsx')
XLSX.writeFile(wb, outPath)

const oosCount = data.slice(1).filter(r => r[3] === 'NO').length
console.log(`Written ${data.length - 1} products → stock-status.xlsx`)
console.log(`Currently out of stock: ${oosCount}`)


const inPriceList = new Set(priceList.items.map(i => i.name))
const unmatchedOos = outOfStock.filter(e => !inPriceList.has(e.trim()))
if (unmatchedOos.length) {
  console.warn(`\nWARNING: OOS entries not found in price list:`)  
  unmatchedOos.forEach(e => console.warn(' ', e))
}

