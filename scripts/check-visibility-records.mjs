#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function normalizeSkuCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function normalizeProductName(value) {
  return normalizeSkuCode(value)
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseProductStatusCsv(csvText) {
  const discontinued = new Set()
  if (!csvText) return discontinued

  const lines = csvText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length <= 1) return discontinued

  for (const line of lines.slice(1)) {
    const parts = line.split(',')
    if (parts.length < 2) continue
    const code = String(parts[0] || '').trim()
    const name = String(parts[1] || '').trim()
    const status = String(parts[parts.length - 1] || '').trim().toLowerCase()
    if (status !== 'discontinued') continue
    if (code) discontinued.add(code)
    if (name) discontinued.add(name)
  }

  return discontinued
}

function buildVisibilitySet(values) {
  const set = new Set()
  for (const value of values || []) {
    const raw = String(value || '').trim()
    if (!raw) continue
    set.add(raw)
    set.add(normalizeSkuCode(raw))
    set.add(normalizeProductName(raw))
  }
  return set
}

function buildAliasIndexes() {
  const codeToTarget = new Map()
  const targetToCodes = new Map()

  for (const group of Array.isArray(PRODUCT_ALIAS_GROUPS) ? PRODUCT_ALIAS_GROUPS : []) {
    const target = String(group?.target || '').trim()
    if (!target) continue
    const codes = Array.isArray(group?.codes) ? group.codes : []
    for (const code of codes) {
      const normalizedCode = normalizeSkuCode(code)
      if (!normalizedCode) continue
      codeToTarget.set(normalizedCode, target)
      const codeSet = targetToCodes.get(target) || new Set()
      codeSet.add(code)
      targetToCodes.set(target, codeSet)
    }
  }

  return { codeToTarget, targetToCodes }
}

function expandVisibilityValues(values, aliasIndexes) {
  const expanded = new Set()
  const { codeToTarget, targetToCodes } = aliasIndexes

  for (const raw of values || []) {
    const value = String(raw || '').trim()
    if (!value) continue
    expanded.add(value)

    const normalized = normalizeSkuCode(value)
    const aliasTarget = codeToTarget.get(normalized)
    if (aliasTarget) expanded.add(aliasTarget)

    const targetCodes = targetToCodes.get(value)
    if (targetCodes) {
      for (const code of targetCodes) expanded.add(code)
    }
  }

  return [...expanded]
}

function inVisibilitySet(set, sku, name) {
  const rawSku = String(sku || '').trim()
  const rawName = String(name || '').trim()
  return (
    set.has(rawSku)
    || set.has(rawName)
    || set.has(normalizeSkuCode(rawSku))
    || set.has(normalizeSkuCode(rawName))
    || set.has(normalizeProductName(rawSku))
    || set.has(normalizeProductName(rawName))
  )
}

const b2b = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/b2b-price-list.json'), 'utf8'))
const items = Array.isArray(b2b?.items) ? b2b.items : []
const hiddenProducts = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/hidden-products.json'), 'utf8'))
const outOfStockProducts = JSON.parse(readFileSync(resolve(ROOT, 'public/gelitup-content/out-of-stock.json'), 'utf8'))
const productStatusCsv = readFileSync(resolve(ROOT, 'public/gelitup-content/product-status.csv'), 'utf8')

const aliasIndexes = buildAliasIndexes()
const hiddenSet = buildVisibilitySet(expandVisibilityValues(hiddenProducts, aliasIndexes))
const outOfStockSet = buildVisibilitySet(expandVisibilityValues(outOfStockProducts, aliasIndexes))
const discontinuedSet = buildVisibilitySet(expandVisibilityValues(Array.from(parseProductStatusCsv(productStatusCsv)), aliasIndexes))

const discontinuedStillVisible = []
const outOfStockMissingFromCatalog = []
const hiddenAndOutOfStockOverlap = []

for (const product of items) {
  const hidden = inVisibilitySet(hiddenSet, product.sku, product.name)
  const discontinued = inVisibilitySet(discontinuedSet, product.sku, product.name)
  const outOfStock = inVisibilitySet(outOfStockSet, product.sku, product.name)

  if (!hidden && discontinued) {
    discontinuedStillVisible.push({ sku: product.sku, name: product.name })
  }

  if (hidden && outOfStock) {
    hiddenAndOutOfStockOverlap.push({ sku: product.sku, name: product.name })
  }
}

for (const raw of outOfStockProducts) {
  const key = String(raw || '').trim()
  if (!key) continue
  const match = items.find((item) => inVisibilitySet(buildVisibilitySet([key]), item.sku, item.name))
  if (!match) outOfStockMissingFromCatalog.push(key)
}

const cSeries = ['GIUP C01', 'GIUP C02', 'GIUP C03', 'GIUP C04', 'GIUP C05', 'GIUP C06', 'GIUP C07', 'GIUP C08']
const cSeriesStatus = cSeries.map((code) => ({
  code,
  hidden: inVisibilitySet(hiddenSet, code, code),
  outOfStock: inVisibilitySet(outOfStockSet, code, code),
  discontinued: inVisibilitySet(discontinuedSet, code, code),
}))

console.log('Visibility audit summary')
console.log(`- Catalogue items: ${items.length}`)
console.log(`- Discontinued records: ${Array.from(parseProductStatusCsv(productStatusCsv)).length}`)
console.log(`- Hidden records: ${hiddenProducts.length}`)
console.log(`- Out-of-stock records: ${outOfStockProducts.length}`)
console.log('')

console.log(`Discontinued but still visible: ${discontinuedStillVisible.length}`)
for (const row of discontinuedStillVisible.slice(0, 50)) {
  console.log(`  ${row.sku} | ${row.name}`)
}

console.log('')
console.log(`Out-of-stock keys not matching catalogue: ${outOfStockMissingFromCatalog.length}`)
for (const key of outOfStockMissingFromCatalog.slice(0, 50)) {
  console.log(`  ${key}`)
}

console.log('')
console.log(`Hidden + out-of-stock overlaps: ${hiddenAndOutOfStockOverlap.length}`)
for (const row of hiddenAndOutOfStockOverlap.slice(0, 30)) {
  console.log(`  ${row.sku} | ${row.name}`)
}

console.log('')
console.log('C-series status matrix')
for (const row of cSeriesStatus) {
  console.log(`  ${row.code}: hidden=${row.hidden} outOfStock=${row.outOfStock} discontinued=${row.discontinued}`)
}
