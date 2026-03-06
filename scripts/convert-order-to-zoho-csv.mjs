/**
 * convert-order-to-zoho-csv.mjs
 *
 * Converts a client-filled order CSV (output of generate-client-order-template.mjs)
 * into a Zoho Inventory Sales Order import CSV.
 *
 * Usage:
 *   node scripts/convert-order-to-zoho-csv.mjs <filled-order.csv> --customer "Client Name"
 *   node scripts/convert-order-to-zoho-csv.mjs <filled-order.csv> --customer "Client Name" --out zoho-import.csv
 *   node scripts/convert-order-to-zoho-csv.mjs <filled-order.csv> --customer "Client Name" --date 2026-03-10
 *
 * Required:
 *   <input>        Path to the client-filled CSV (must have SKU, Item Name, Unit Price, Qty columns)
 *   --customer     Customer name exactly as it appears in Zoho Inventory
 *
 * Optional:
 *   --out          Output file path (default: zoho-sales-order-<date>.csv)
 *   --date         Sales order date in YYYY-MM-DD format (default: today)
 *   --order-no     Sales order number (default: auto — Zoho assigns one)
 *
 * Output matches Zoho Inventory "Sales Orders" import format:
 *   SalesOrder#, Date, CustomerName, Item Name, SKU, Quantity, Rate, Item Total
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs'
import { resolve, dirname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Helpers ───────────────────────────────────────────────────────────────────
function getArg(name) {
  const i = process.argv.indexOf(name)
  return i !== -1 ? process.argv[i + 1] ?? null : null
}

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

function csvCell(value) {
  const str = String(value ?? '')
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

function formatDate(dateStr) {
  // Zoho Inventory accepts DD/MM/YYYY or MM/DD/YYYY depending on org settings.
  // We output YYYY-MM-DD which is unambiguous and accepted by Zoho.
  return dateStr
}

// ── Args ──────────────────────────────────────────────────────────────────────
const inputArg = process.argv[2]
if (!inputArg || inputArg.startsWith('--')) {
  fail('Missing input file. Usage: node scripts/convert-order-to-zoho-csv.mjs <filled-order.csv> --customer "Name"')
}

const customer = getArg('--customer')
if (!customer) {
  fail('Missing --customer argument. Example: --customer "Nail Loft Pretoria"')
}

const dateArg = getArg('--date') || new Date().toISOString().slice(0, 10)
const orderNo = getArg('--order-no') || ''
const inputPath = resolve(inputArg)

const defaultOutName = `zoho-sales-order-${dateArg}.csv`
const outArg = getArg('--out')
const outputPath = resolve(outArg || defaultOutName)

// ── Parse input CSV ───────────────────────────────────────────────────────────
let rawText
try {
  rawText = readFileSync(inputPath, 'utf8')
} catch (e) {
  fail(`Could not read input file: ${inputPath}\n${e.message}`)
}

// Simple but robust CSV parser (handles quoted fields with commas inside)
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  return lines
    .filter(l => l.trim() !== '')
    .map(line => {
      const cells = []
      let cur = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
          else { inQuotes = !inQuotes }
        } else if (ch === ',' && !inQuotes) {
          cells.push(cur); cur = ''
        } else {
          cur += ch
        }
      }
      cells.push(cur)
      return cells
    })
}

const allRows = parseCsv(rawText)
if (allRows.length < 2) fail('Input CSV appears empty or has no data rows.')

// Map headers (case-insensitive)
const headerRow = allRows[0].map(h => h.trim().toLowerCase())

function findCol(candidates) {
  for (const c of candidates) {
    const i = headerRow.findIndex(h => h.includes(c.toLowerCase()))
    if (i !== -1) return i
  }
  return -1
}

const colSku       = findCol(['sku'])
const colName      = findCol(['item name', 'name', 'product name'])
const colPrice     = findCol(['unit price', 'price', 'rate', 'item cost'])
const colQty       = findCol(['qty', 'quantity'])

if (colSku === -1)   fail('Could not find SKU column in input CSV.')
if (colName === -1)  fail('Could not find Item Name column in input CSV.')
if (colPrice === -1) fail('Could not find Unit Price column in input CSV.')
if (colQty === -1)   fail('Could not find Qty column in input CSV.')

// ── Filter rows with qty > 0 ──────────────────────────────────────────────────
const dataRows = allRows.slice(1)
const orderLines = []

for (let i = 0; i < dataRows.length; i++) {
  const row = dataRows[i]
  const qtyRaw = (row[colQty] ?? '').trim()
  if (qtyRaw === '' || qtyRaw === '0') continue

  const qty = Number(qtyRaw)
  if (!Number.isFinite(qty) || qty <= 0) {
    console.warn(`  Warning: Row ${i + 2} has invalid Qty "${qtyRaw}" — skipped.`)
    continue
  }

  const sku   = (row[colSku]   ?? '').trim()
  const name  = (row[colName]  ?? '').trim()
  const price = parseFloat((row[colPrice] ?? '0').trim().replace(/[^0-9.]/g, ''))

  if (!sku && !name) {
    console.warn(`  Warning: Row ${i + 2} has no SKU or Name — skipped.`)
    continue
  }

  orderLines.push({ sku, name, price, qty, total: +(price * qty).toFixed(2) })
}

if (orderLines.length === 0) {
  fail('No rows with Qty > 0 found in the input CSV. Did the client fill in quantities?')
}

// ── Build Zoho Sales Order CSV ────────────────────────────────────────────────
// Zoho Inventory Sales Order import columns:
// SalesOrder# | Date | CustomerName | Item Name | SKU | Quantity | Rate | Item Total
//
// For multi-line orders Zoho requires the header fields (SalesOrder#, Date, CustomerName)
// only on the FIRST line item row; subsequent rows leave them blank.

const zohoHeader = [
  'SalesOrder#',
  'Date',
  'CustomerName',
  'Item Name',
  'SKU',
  'Quantity',
  'Rate',
  'Item Total',
]

const zohoRows = orderLines.map((line, idx) => [
  csvCell(idx === 0 ? orderNo : ''),           // SalesOrder# — only on first line
  csvCell(idx === 0 ? formatDate(dateArg) : ''), // Date — only on first line
  csvCell(idx === 0 ? customer : ''),           // CustomerName — only on first line
  csvCell(line.name),
  csvCell(line.sku),
  csvCell(line.qty),
  csvCell(line.price.toFixed(2)),
  csvCell(line.total.toFixed(2)),
])

const totalUnits = orderLines.reduce((s, l) => s + l.qty, 0)
const totalValue = orderLines.reduce((s, l) => s + l.total, 0)

const csv = [
  zohoHeader.join(','),
  ...zohoRows.map(r => r.join(',')),
].join('\r\n')

// ── Write output ──────────────────────────────────────────────────────────────
try {
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, csv, 'utf8')
} catch (e) {
  fail(`Could not write output to ${outputPath}\n${e.message}`)
}

console.log(`✓ Zoho Sales Order CSV written to: ${outputPath}`)
console.log()
console.log(`  Customer  : ${customer}`)
console.log(`  Date      : ${dateArg}`)
console.log(`  Line items: ${orderLines.length}`)
console.log(`  Total qty : ${totalUnits} units`)
console.log(`  Total value: R${totalValue.toFixed(2)}`)
console.log()
console.log('Import steps in Zoho Inventory:')
console.log('  1. Sales Orders → ⋮ (more) → Import Sales Orders')
console.log('  2. Upload this CSV file')
console.log('  3. Confirm column mapping and import')
