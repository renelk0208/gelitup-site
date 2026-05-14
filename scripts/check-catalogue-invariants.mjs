import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failMessages = []
const warnMessages = []

function fail(message) {
  failMessages.push(message)
}

function warn(message) {
  warnMessages.push(message)
}

function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(text)
}

function assertRegex(text, regex, message) {
  if (!regex.test(text)) fail(message)
}

function assertIncludes(text, needle, message) {
  if (!text.includes(needle)) fail(message)
}

function normalizeSkuCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim()
}

function extractArrayLiteral(text, marker) {
  const startIdx = text.indexOf(marker)
  if (startIdx === -1) return null

  const bracketStart = text.indexOf('[', startIdx)
  if (bracketStart === -1) return null

  let depth = 0
  for (let index = bracketStart; index < text.length; index += 1) {
    if (text[index] === '[') depth += 1
    else if (text[index] === ']') {
      depth -= 1
      if (depth === 0) return text.slice(bracketStart, index + 1)
    }
  }

  return null
}

function validateSourceInvariants() {
  const appPath = path.join(root, 'src', 'App.jsx')
  const appText = fs.readFileSync(appPath, 'utf8')
  const aliasPath = path.join(root, 'src', 'data', 'productAliases.js')
  const aliasText = fs.readFileSync(aliasPath, 'utf8')

  assertRegex(
    appText,
    /label:\s*'Builder Systems'[\s\S]*?cats:\s*\[[\s\S]*?'BRUSH ON BUILDER'/,
    "Missing 'BRUSH ON BUILDER' in B2B Builder Systems sidebar group.",
  )

  assertIncludes(
    appText,
    "'BRUSH ON BUILDER': 'BUILDER GEL SYSTEMS'",
    "Missing BRUSH ON BUILDER -> BUILDER GEL SYSTEMS remap in B2B_CAT_REMAP.",
  )

  assertIncludes(
    appText,
    "'BRUSH ON BUILDER (BIAB)': 'BUILDER GEL SYSTEMS'",
    "Missing BRUSH ON BUILDER (BIAB) -> BUILDER GEL SYSTEMS remap in B2B_CAT_REMAP.",
  )

  assertIncludes(
    appText,
    "'BIAB': 'BUILDER GEL SYSTEMS'",
    "Missing BIAB -> BUILDER GEL SYSTEMS remap in B2B_CAT_REMAP.",
  )

  assertRegex(
    appText,
    /resolvePortalPriceEntry[\s\S]*?(?:BIAB\(\[A-Z0-9\]\{2,\}\)|\?:BIAB\|BOB|BIAB\|BOB)/,
    'Missing BIAB/BOB code fallback in resolvePortalPriceEntry.',
  )

  assertRegex(
    appText,
    /resolvePortalPriceEntry[\s\S]*?(?:getBrushOnBuilderPriceAliases|BRUSH_ON_BUILDER_PRICE_ALIASES)/,
    'Missing explicit Brush On Builder BIAB price aliases in resolvePortalPriceEntry.',
  )

  const aliasArrayText = extractArrayLiteral(aliasText, 'export const PRODUCT_ALIAS_GROUPS')
  if (!aliasArrayText) {
    fail('Could not parse PRODUCT_ALIAS_GROUPS from src/data/productAliases.js.')
    return
  }

  // Validate the shared alias source itself against the price list so we catch
  // future drift before it reaches the app or exports.
  const pricePath = path.join(root, 'public', 'gelitup-content', 'b2b-price-list.json')
  const pricePayload = readJson(pricePath)
  const priceItems = Array.isArray(pricePayload?.items) ? pricePayload.items : []
  const priceTargets = new Set(
    priceItems.map((item) => normalizeSkuCode(item?.name || item?.sku || '')).filter(Boolean),
  )

  // eslint-disable-next-line no-new-func
  const aliasGroups = new Function(`return (${aliasArrayText})`)()
  const codeToTargets = new Map()

  for (const group of Array.isArray(aliasGroups) ? aliasGroups : []) {
    const codes = Array.isArray(group?.codes) ? group.codes : []
    const target = normalizeSkuCode(group?.target || '')
    if (!codes.length || !target) continue

    if (/BRUSH ON BUILDER/i.test(group.target || '') && !priceTargets.has(target)) {
      fail(`Brush On Builder alias target missing from price list: ${group.target}`)
    }

    for (const code of codes) {
      const normalizedCode = normalizeSkuCode(code)
      if (!normalizedCode) continue
      const existingTargets = codeToTargets.get(normalizedCode) || new Set()
      existingTargets.add(target)
      codeToTargets.set(normalizedCode, existingTargets)
    }
  }

  for (const [code, targets] of codeToTargets.entries()) {
    if (targets.size > 1) {
      fail(`Alias code maps to multiple targets in src/data/productAliases.js: ${code} -> ${[...targets].join(', ')}`)
    }
  }
}

function extractTopCategoryFromImagePath(imagePath) {
  const marker = '/gelitup-content/product-images/'
  const idx = imagePath.indexOf(marker)
  if (idx === -1) return ''
  const tail = imagePath.slice(idx + marker.length)
  return (tail.split('/').filter(Boolean)[0] || '').trim()
}

function validateImageMapInvariants() {
  const mapPath = path.join(root, 'public', 'gelitup-content', 'product-image-map.json')
  const payload = readJson(mapPath)

  const allowedTopCategories = new Set([
    'COLORS',
    'BASES',
    'TOPS',
    'BUILDER GEL',
    'BUILDER GEL SYSTEMS',
    'MULTIMIX',
    'ACRYLIC',
    'CREME DE LA CREME',
    'BY THE OCEAN',
    'COBWEB',
    'LINE-IT-UP',
    'NAIL PREPARATIONS',
    'LIQUIDS',
    'TOOLS',
    'EQUIPMENT',
    'BRUSHES',
    'NAIL ART',
    'CONSUMABLES',
    'NAIL HAND & FOOT CARE',
    '2026 NEW!',
    'PACKAGES',
  ])

  const discoveredTopCategories = new Set()
  let brushOnBuilderPathCount = 0
  const brushCanonicalRoot = '/GELITUP-CONTENT/PRODUCT-IMAGES/BUILDER GEL/BRUSH ON BUILDER/'

  for (const value of Object.values(payload)) {
    if (typeof value !== 'string') continue
    const top = extractTopCategoryFromImagePath(value)
    if (!top) continue
    discoveredTopCategories.add(top)

    const normalized = value.toUpperCase()
    if (normalized.includes('/BRUSH ON BUILDER/')) {
      brushOnBuilderPathCount += 1
      if (!normalized.includes(brushCanonicalRoot)) {
        fail(`Brush On Builder path must use the canonical BUILDER GEL folder: ${value}`)
      }
      if (!(top === 'BUILDER GEL' || top === 'BUILDER GEL SYSTEMS')) {
        fail(`Brush On Builder path found under unexpected top category '${top}': ${value}`)
      }
    }
  }

  if (brushOnBuilderPathCount === 0) {
    warn('No BRUSH ON BUILDER image paths were found in product-image-map.json.')
  }

  const unknownCategories = [...discoveredTopCategories].filter((cat) => !allowedTopCategories.has(cat))
  if (unknownCategories.length) {
    fail(`Unknown top-level image-map categories detected: ${unknownCategories.sort().join(', ')}`)
  }
}

function validatePriceListInvariants() {
  const pricesPath = path.join(root, 'public', 'gelitup-content', 'b2b-price-list.json')
  const payload = readJson(pricesPath)
  const items = Array.isArray(payload?.items) ? payload.items : []

  const brushItems = items.filter((item) => {
    const text = `${item?.name || ''} ${item?.sku || ''}`.toUpperCase()
    return text.includes('BRUSH ON BUILDER') || /\bBOB[A-Z0-9]*\b/.test(text) || text.includes('BIAB')
  })

  if (!brushItems.length) {
    warn('No Brush On Builder entries were detected in b2b-price-list.json.')
    return
  }

  const invalid = brushItems.filter((item) => {
    const numeric = Number(item?.price)
    return !Number.isFinite(numeric) || numeric <= 0
  })

  if (invalid.length) {
    const sample = invalid
      .slice(0, 10)
      .map((item) => `${item?.sku || 'no-sku'} (${item?.name || 'no-name'}) -> ${item?.price}`)
      .join('; ')
    fail(`Brush On Builder entries with missing/invalid price: ${sample}`)
  }
}

function printSummary() {
  if (warnMessages.length) {
    console.log('Warnings:')
    for (const message of warnMessages) console.log(`- ${message}`)
  }

  if (failMessages.length) {
    console.error('Catalogue invariant check failed:')
    for (const message of failMessages) console.error(`- ${message}`)
    process.exitCode = 1
    return
  }

  console.log('Catalogue invariants passed.')
}

validateSourceInvariants()
validateImageMapInvariants()
validatePriceListInvariants()
printSummary()
