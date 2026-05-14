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

function validateSourceInvariants() {
  const appPath = path.join(root, 'src', 'App.jsx')
  const appText = fs.readFileSync(appPath, 'utf8')

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
    /resolvePortalPriceEntry[\s\S]*?BIAB\(\[A-Z0-9\]\{2,\}\)/,
    'Missing BIAB code fallback in resolvePortalPriceEntry.',
  )

  assertRegex(
    appText,
    /resolvePortalPriceEntry[\s\S]*?GIUP BOB\$\{suffix\}/,
    'Missing BIAB -> BOB alias conversion candidates in resolvePortalPriceEntry.',
  )
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

  for (const value of Object.values(payload)) {
    if (typeof value !== 'string') continue
    const top = extractTopCategoryFromImagePath(value)
    if (!top) continue
    discoveredTopCategories.add(top)

    const normalized = value.toUpperCase()
    if (normalized.includes('/BRUSH ON BUILDER/')) {
      brushOnBuilderPathCount += 1
      if (!(top === 'BASES' || top === 'BUILDER GEL' || top === 'BUILDER GEL SYSTEMS' || top === '2026 NEW!')) {
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
