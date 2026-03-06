/**
 * generate-client-order-template.mjs
 *
 * Generates a client-facing order template CSV from b2b-price-list.json.
 * Clients fill in the Qty column and email it back.
 *
 * Usage:
 *   node scripts/generate-client-order-template.mjs
 *   node scripts/generate-client-order-template.mjs --out orders/my-client-template.csv
 *
 * Output columns (what the client sees):
 *   SKU | Item Name | Unit Price (excl. VAT) | Qty
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Args ─────────────────────────────────────────────────────────────────────
function getArg(name) {
  const i = process.argv.indexOf(name)
  return i !== -1 ? process.argv[i + 1] : null
}

const outArg = getArg('--out')
const outputPath = resolve(outArg || 'client-order-template.csv')
const priceListPath = resolve(__dirname, '../public/gelitup-content/b2b-price-list.json')

// ── Load price list ───────────────────────────────────────────────────────────
let priceList
try {
  priceList = JSON.parse(readFileSync(priceListPath, 'utf8'))
} catch (e) {
  console.error(`ERROR: Could not read b2b-price-list.json at ${priceListPath}`)
  console.error(e.message)
  process.exit(1)
}

const items = priceList?.items
if (!Array.isArray(items) || items.length === 0) {
  console.error('ERROR: b2b-price-list.json contains no items.')
  process.exit(1)
}

// ── Build CSV ─────────────────────────────────────────────────────────────────
function csvCell(value) {
  const str = String(value ?? '')
  // Wrap in quotes if the value contains a comma, quote, or newline
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const header = ['SKU', 'Item Name', 'Unit Price (excl. VAT)', 'Qty']
const rows = items.map(item => [
  csvCell(item.sku),
  csvCell(item.name),
  csvCell(item.price.toFixed(2)),
  '', // blank — client fills this in
])

const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\r\n')

// ── Write output ──────────────────────────────────────────────────────────────
try {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, csv, 'utf8')
} catch (e) {
  console.error(`ERROR: Could not write output to ${outputPath}`)
  console.error(e.message)
  process.exit(1)
}

console.log(`✓ Client order template written to: ${outputPath}`)
console.log(`  ${items.length} products | columns: ${header.join(', ')}`)
console.log()
console.log('Send this file to the client. They fill in the Qty column and email it back.')
console.log('Then run: node scripts/convert-order-to-zoho-csv.mjs <filled-in-file.csv> --customer "Client Name"')
