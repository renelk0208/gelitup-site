#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'

const projectRoot = process.cwd()
const shopifyExportPath = path.join(projectRoot, 'products_export_1.csv')
const priceListPath = path.join(projectRoot, 'public', 'gelitup-content', 'b2b-price-list.json')
const missingReportPath =
  'c:/Users/renek/AppData/Roaming/Code/User/workspaceStorage/dcf183a1e44db4197f0f2b5fb30cca19/GitHub.copilot-chat/chat-session-resources/7f35a7ba-3d06-4b5a-97d4-2314b78595e7/call_wZmUiC90JQXUBGoac9h82Tl8__vscode-1778739954529/content.txt'
const outputPath = path.join(projectRoot, 'src', 'data', 'productAliases.missing.generated.js')

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

function getHeaderIndex(headers, patterns) {
  for (const pattern of patterns) {
    const index = headers.findIndex((header) => pattern.test(header))
    if (index !== -1) return index
  }
  return -1
}

function normalizeSkuCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeProductName(value) {
  return String(value || '')
    .replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function basenameFromUrl(url) {
  const fileName = String(url || '').split('/').pop() || ''
  return fileName.replace(/\?.*$/, '').replace(/\.[^.]+$/, '')
}

function parseMissingItems(text) {
  const lines = text.split(/\r?\n/)
  const items = []
  for (const line of lines) {
    const match = line.match(/^\s*name="(.+)"\s+code="(.+)"/)
    if (!match) continue
    items.push({ name: match[1], code: normalizeSkuCode(match[2]) })
  }
  return items
}

const pricePayload = JSON.parse(fs.readFileSync(priceListPath, 'utf8'))
const priceItems = Array.isArray(pricePayload) ? pricePayload : pricePayload.items || []
const validTargets = new Set(priceItems.map((item) => normalizeProductName(item?.name || item?.sku || '')).filter(Boolean))

const existingCodeTargets = new Map()
for (const group of Array.isArray(PRODUCT_ALIAS_GROUPS) ? PRODUCT_ALIAS_GROUPS : []) {
  const target = normalizeProductName(group?.target || '')
  if (!target) continue
  for (const code of Array.isArray(group?.codes) ? group.codes : []) {
    const normalizedCode = normalizeSkuCode(code)
    if (!normalizedCode) continue
    existingCodeTargets.set(normalizedCode, target)
  }
}

const shopifyRows = parseCsv(fs.readFileSync(shopifyExportPath, 'utf8'))
const headers = shopifyRows[0].map((value) => String(value || '').trim())
const titleIdx = getHeaderIndex(headers, [/^title$/i])
const imageIdx = getHeaderIndex(headers, [/^image src$/i])
const statusIdx = getHeaderIndex(headers, [/^status$/i])
const priceIdx = getHeaderIndex(headers, [/^variant price$/i, /^price$/i])

if (titleIdx === -1 || imageIdx === -1 || statusIdx === -1 || priceIdx === -1) {
  throw new Error('Missing required Shopify export columns for title/image/status/price.')
}

const codeToTargets = new Map()
for (const row of shopifyRows.slice(1)) {
  const title = String(row[titleIdx] || '').trim()
  const imageSrc = String(row[imageIdx] || '').trim()
  const status = String(row[statusIdx] || '').trim().toLowerCase()
  const priceRaw = row[priceIdx]

  if (!title || !imageSrc || status === 'inactive') continue
  if (priceRaw === '' || priceRaw == null || !Number.isFinite(Number(priceRaw))) continue

  const code = normalizeSkuCode(basenameFromUrl(imageSrc))
  if (!code) continue

  const targetSet = codeToTargets.get(code) || new Set()
  targetSet.add(title)
  codeToTargets.set(code, targetSet)
}

const uniqueCodeToTarget = new Map()
for (const [code, targets] of codeToTargets.entries()) {
  if (targets.size === 1) uniqueCodeToTarget.set(code, [...targets][0])
}

const missingItems = parseMissingItems(fs.readFileSync(missingReportPath, 'utf8'))
const missingCodes = new Set(missingItems.map((item) => item.code).filter(Boolean))

const generatedGroups = []
let missingNoUniqueTarget = 0
let missingTargetNotInPriceList = 0
let missingConflictingExisting = 0
for (const code of missingCodes) {
  const target = uniqueCodeToTarget.get(code)
  if (!target) {
    missingNoUniqueTarget += 1
    continue
  }

  const normalizedTarget = normalizeProductName(target)
  if (!validTargets.has(normalizedTarget)) {
    missingTargetNotInPriceList += 1
    continue
  }

  const existingTarget = existingCodeTargets.get(code)
  if (existingTarget && existingTarget !== normalizedTarget) {
    missingConflictingExisting += 1
    continue
  }
  if (existingTarget && existingTarget === normalizedTarget) continue

  generatedGroups.push({ codes: [code], target })
}

generatedGroups.sort((a, b) => a.codes[0].localeCompare(b.codes[0], 'en', { sensitivity: 'base' }))

const output = [
  '// Auto-generated supplemental aliases for currently missing catalogue codes.',
  '// Generated by scripts/generate-missing-aliases-from-shopify.mjs',
  'export const GENERATED_MISSING_PRODUCT_ALIAS_GROUPS = [',
  ...generatedGroups.map(
    (group) => `  { codes: [${group.codes.map((code) => JSON.stringify(code)).join(', ')}], target: ${JSON.stringify(group.target)} },`,
  ),
  ']',
  '',
].join('\n')

fs.writeFileSync(outputPath, output, 'utf8')

console.log(`Missing codes: ${missingCodes.size}`)
console.log(`No unique Shopify target: ${missingNoUniqueTarget}`)
console.log(`Shopify target missing from price list: ${missingTargetNotInPriceList}`)
console.log(`Code already mapped to another target: ${missingConflictingExisting}`)
console.log(`Generated supplemental aliases: ${generatedGroups.length}`)
console.log(`Updated: ${path.relative(projectRoot, outputPath)}`)
