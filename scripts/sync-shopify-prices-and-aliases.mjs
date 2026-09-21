#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import XLSX from 'xlsx'

const projectRoot = process.cwd()
const shopifyExportPath = path.join(projectRoot, 'products_export_1.csv')
const priceListPath = path.join(projectRoot, 'public', 'gelitup-content', 'b2b-price-list.json')
const priceListExportPath = path.join(projectRoot, 'price-list-export.csv')
const generatedAliasesPath = path.join(projectRoot, 'src', 'data', 'productAliases.generated.js')

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function normalize(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function basenameFromUrl(url) {
  const fileName = String(url || '').split('/').pop() || ''
  return fileName.replace(/\.[^.]+$/, '')
}

function getHeaderIndex(headers, patterns) {
  for (const pattern of patterns) {
    const index = headers.findIndex((header) => pattern.test(header))
    if (index !== -1) return index
  }
  return -1
}

const shopifyRows = parseCsv(fs.readFileSync(shopifyExportPath, 'utf8'))
const headers = shopifyRows[0].map((value) => String(value || '').trim())
const titleIdx = getHeaderIndex(headers, [/^title$/i])
const skuIdx = getHeaderIndex(headers, [/^variant sku$/i, /^sku$/i])
const priceIdx = getHeaderIndex(headers, [/^variant price$/i, /^price$/i])
const statusIdx = getHeaderIndex(headers, [/^status$/i])
const imageIdx = getHeaderIndex(headers, [/^image src$/i])

if (titleIdx === -1 || skuIdx === -1 || priceIdx === -1 || statusIdx === -1 || imageIdx === -1) {
  throw new Error(`Could not detect required Shopify export columns. title=${titleIdx}, sku=${skuIdx}, price=${priceIdx}, status=${statusIdx}, image=${imageIdx}`)
}

const priceList = JSON.parse(fs.readFileSync(priceListPath, 'utf8'))
const existingItems = Array.isArray(priceList?.items) ? priceList.items : []
const existingTargetSet = new Set(existingItems.map((item) => normalize(item?.name || item?.sku || '')).filter(Boolean))
const existingTargetLookup = new Map(existingItems.map((item) => [normalize(item?.name || item?.sku || ''), item]))
const manualAliasSource = fs.readFileSync(path.join(projectRoot, 'src', 'data', 'productAliases.js'), 'utf8')

const manualAliasCodes = new Set()
for (const match of manualAliasSource.matchAll(/codes:\s*\[([^\]]*)\]/g)) {
  const codeList = match[1]
  for (const codeMatch of codeList.matchAll(/['"]([^'"]+)['"]/g)) {
    const normalizedCode = normalizeCode(codeMatch[1])
    if (normalizedCode) manualAliasCodes.add(normalizedCode)
  }
}

const baseCounts = new Map()
for (const row of shopifyRows.slice(1)) {
  const status = String(row[statusIdx] || '').trim().toLowerCase()
  const title = String(row[titleIdx] || '').trim()
  const priceRaw = row[priceIdx]
  const imageSrc = String(row[imageIdx] || '').trim()

  if (!title || status === 'inactive') continue
  if (priceRaw === '' || priceRaw == null) continue

  const normalizedBase = normalizeCode(basenameFromUrl(imageSrc))
  if (!normalizedBase) continue
  baseCounts.set(normalizedBase, (baseCounts.get(normalizedBase) || 0) + 1)
}

const mergedItems = existingItems.map((item) => ({
  name: String(item.name || '').trim(),
  sku: String(item.sku || item.name || '').trim(),
  price: Number(item.price),
}))

const aliasGroups = []
const aliasSeen = new Set()

for (const row of shopifyRows.slice(1)) {
  const status = String(row[statusIdx] || '').trim().toLowerCase()
  const title = String(row[titleIdx] || '').trim()
  const sku = String(row[skuIdx] || '').trim()
  const priceRaw = row[priceIdx]
  const imageSrc = String(row[imageIdx] || '').trim()

  if (!title || status === 'inactive') continue
  if (priceRaw === '' || priceRaw == null) continue

  const price = Number(priceRaw)
  if (!Number.isFinite(price)) continue

  const normalizedTitle = normalize(title)
  const normalizedBase = normalizeCode(basenameFromUrl(imageSrc))

  if (!existingTargetSet.has(normalizedTitle)) {
    mergedItems.push({
      name: title,
      sku: sku || title,
      price,
    })
    existingTargetSet.add(normalizedTitle)
    existingTargetLookup.set(normalizedTitle, { name: title, sku: sku || title, price })
  }

  if (
    normalizedBase &&
    normalizedBase !== normalizedTitle &&
    !manualAliasCodes.has(normalizedBase) &&
    (baseCounts.get(normalizedBase) || 0) === 1
  ) {
    const code = normalizedBase
    const target = title
    const key = `${code}=>${normalize(target)}`
    if (!aliasSeen.has(key)) {
      aliasGroups.push({ codes: [code], target })
      aliasSeen.add(key)
    }
  }
}

mergedItems.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'en', { sensitivity: 'base' }))
aliasGroups.sort((a, b) => normalize(a.target).localeCompare(normalize(b.target), 'en', { sensitivity: 'base' }))

const mergedPayload = {
  _meta: {
    source: 'price-list-export.csv + products_export_1.csv',
    generated: new Date().toISOString(),
    count: mergedItems.length,
  },
  items: mergedItems,
}

fs.writeFileSync(priceListPath, `${JSON.stringify(mergedPayload, null, 2)}\n`, 'utf8')

const priceListCsv = [
  ['Item Name', 'SKU', 'Sales Rate'].join(','),
  ...mergedItems.map((item) => [csvCell(item.name), csvCell(item.sku), csvCell(item.price.toFixed(2))].join(',')),
].join('\r\n')
fs.writeFileSync(priceListExportPath, `${priceListCsv}\r\n`, 'utf8')

const generatedAliasesJs = [
  '// Auto-generated from products_export_1.csv and the B2B price list.',
  '// Do not edit by hand; run scripts/sync-shopify-prices-and-aliases.mjs instead.',
  'export const GENERATED_PRODUCT_ALIAS_GROUPS = [',
  ...aliasGroups.map((group) => `  { codes: [${group.codes.map((code) => JSON.stringify(code)).join(', ')}], target: ${JSON.stringify(group.target)} },`),
  ']',
  '',
].join('\n')
fs.writeFileSync(generatedAliasesPath, generatedAliasesJs, 'utf8')

console.log(`Merged price list items: ${mergedItems.length}`)
console.log(`Generated alias groups: ${aliasGroups.length}`)
console.log(`Updated: ${path.relative(projectRoot, priceListPath)}`)
console.log(`Updated: ${path.relative(projectRoot, priceListExportPath)}`)
console.log(`Updated: ${path.relative(projectRoot, generatedAliasesPath)}`)
