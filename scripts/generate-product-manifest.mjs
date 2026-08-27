#!/usr/bin/env node

import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PRODUCT_ALIAS_GROUPS } from '../src/data/productAliases.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const CONTENT_DIR = resolve(ROOT, 'public/gelitup-content')
const OUTPUT_PATH = resolve(CONTENT_DIR, 'product-manifest.json')
const B2B_PRICE_MULTIPLIER = 1.2
const PERFECT_SHAPE_TOP_COAT_UPLIFT = 1.06

const WINDOWS_1252_BYTES = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83],
  [0x201e, 0x84], [0x2026, 0x85], [0x2020, 0x86],
  [0x2021, 0x87], [0x02c6, 0x88], [0x2030, 0x89],
  [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92],
  [0x201c, 0x93], [0x201d, 0x94], [0x2022, 0x95],
  [0x2013, 0x96], [0x2014, 0x97], [0x02dc, 0x98],
  [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
])

function loadJson(filename) {
  return JSON.parse(
    readFileSync(resolve(CONTENT_DIR, filename), 'utf8'),
  )
}

function repairMojibake(value) {
  const input = String(value || '')
  if (!/[\u00c2\u00c3\u00e2]/.test(input)) return input

  const bytes = []
  for (const character of input) {
    const codePoint = character.codePointAt(0)
    if (codePoint <= 0xff) {
      bytes.push(codePoint)
    }
    else if (WINDOWS_1252_BYTES.has(codePoint)) {
      bytes.push(WINDOWS_1252_BYTES.get(codePoint))
    }
    else {
      return input
    }
  }

  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(Uint8Array.from(bytes))
  }
  catch {
    return input
  }
}

function normalizeText(value) {
  return repairMojibake(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripStatusSuffix(value) {
  return repairMojibake(value)
    .replace(/\s*[-\u2014]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '')
    .trim()
}

function normalizeJoinKey(value) {
  return normalizeText(stripStatusSuffix(value))
    .replace(/\bGEL IT UP\b/g, 'GIUP')
    .trim()
}

function normalizeSizeKey(value) {
  return normalizeText(value)
    .replace(/\s+(HTF|HTE|HEMA FREE|NEW)$/, '')
    .replace(/\bGEL IT UP\b/g, 'GIUP')
    .trim()
}

function extractShadeCode(value) {
  const normalized = normalizeText(value)
  const roneMatch = normalized.match(/\bR0*(\d{1,3})\b/)

  if (roneMatch) {
    return `R${String(Number(roneMatch[1])).padStart(2, '0')}`
  }

  const unbranded = normalized
    .replace(/^GEL IT UP(?: 1)? /, '')
    .replace(/^GIUP /, '')

  const match = unbranded.match(
    /^([A-Z]{1,5})?(\d{1,4})([A-Z]?)(?:\b| )/,
  )
  if (!match) return ''

  const prefix = match[1] || ''
  const suffix = match[3] || ''
  let digits = match[2]

  if (!prefix && Number(digits) < 10) {
    digits = digits.padStart(2, '0')
  }

  return `${prefix}${digits}${suffix}`
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function isSolidGelImage(imageUrl) {
  return /\/COLORS\/(?:SOLID GEL POLISH\/[^/]+|FRENCH|NUDE|PASTEL|RONE)\/[^/]+$/i
    .test(imageUrl)
}

function isBasesTopsImage(imageUrl) {
  return /\/product-images\/(?:BASES|TOPS|NAIL PREPARATIONS)\//i
    .test(imageUrl)
    || /\/product-images\/2026 NEW!\/5-in-1 Superior Base\//i
      .test(imageUrl)
}

function resolveColorFamily(imageUrl, colourFamilies) {
  const stem = imageUrl.split('/').pop().replace(/\.[^.]+$/, '')
  if (colourFamilies[stem]) {
    return normalizeText(colourFamilies[stem])
  }

  const nestedFamily = imageUrl
    .match(/\/COLORS\/SOLID GEL POLISH\/([^/]+)\//i)?.[1]
  if (nestedFamily) return normalizeText(nestedFamily)

  const flatFamily = imageUrl
    .match(/\/COLORS\/(FRENCH|NUDE|PASTEL)\//i)?.[1]
  return flatFamily ? normalizeText(flatFamily) : ''
}

function deriveImageSuffixName(imageUrl, code) {
  const stem = imageUrl.split('/').pop().replace(/\.[^.]+$/, '')
  const withoutPrefix = stem.replace(/^GIUP[-_ ]*/i, '')
  const codePattern = code.startsWith('R')
    ? /^R0*\d+/i
    : new RegExp(`^${escapeRegExp(code)}`, 'i')

  return toTitleCase(
    withoutPrefix
      .replace(codePattern, '')
      .replace(/[-_]+/g, ' ')
      .trim(),
  )
}

function priceNameQuality(product) {
  const name = stripStatusSuffix(product.name)
  if (/^GIUP\s+\d+[A-Z]?$/i.test(name)) return -100
  if (/^GEL\.IT\.UP\s+1\s+R\d+\s+11ml$/i.test(name)) return 0

  return name
    .replace(/^(?:[A-Z]{1,5})?\d+[A-Z]?\s*/i, '')
    .trim()
    .length
}

function choosePriceEntry(code, candidates) {
  const uniqueCandidates = [
    ...new Map(
      candidates.map(product => [product.sku, product]),
    ).values(),
  ].sort((left, right) => (
    priceNameQuality(right) - priceNameQuality(left)
  ))

  if (!uniqueCandidates.length) return null

  const first = uniqueCandidates[0]
  const second = uniqueCandidates[1]
  if (
    second
    && priceNameQuality(first) === priceNameQuality(second)
    && normalizeJoinKey(first.name) !== normalizeJoinKey(second.name)
  ) {
    throw new Error(
      `Ambiguous price join for ${code}: ${first.sku}, ${second.sku}`,
    )
  }

  return first
}

function isPerfectShapeTopCoatProduct(name, sku) {
  const normalizedName = String(name || '').toLowerCase()
  const normalizedSku = String(sku || '').toLowerCase()
  return normalizedName.includes('top coat perfect shape')
    || normalizedName.includes('perfect shape top coat')
    || normalizedSku.includes('nwpt15')
}

function isMarkupExemptCuticleProduct(name) {
  const normalizedName = String(name || '').toLowerCase()
  return /cuticle\s+(oil|scrub)/.test(normalizedName)
    && /\d+\s*ml\b/.test(normalizedName)
}

function toCataloguePrice(product) {
  const rawPrice = Number(product?.price)
  if (!Number.isFinite(rawPrice) || rawPrice <= 0) {
    throw new Error(`Invalid price for ${product?.sku || product?.name || 'product'}`)
  }

  const adjustedPrice = isPerfectShapeTopCoatProduct(
    product.name,
    product.sku,
  )
    ? rawPrice * PERFECT_SHAPE_TOP_COAT_UPLIFT
    : rawPrice
  const multiplier = isMarkupExemptCuticleProduct(product.name)
    ? 1
    : B2B_PRICE_MULTIPLIER

  return Math.ceil(adjustedPrice * multiplier * 10) / 10
}

function mergeAlternateGalleryRecords(recordsByPath) {
  for (const [imageUrl, record] of [...recordsByPath]) {
    const baseImageUrl = imageUrl.replace(
      /_[BC](-[a-z0-9]+)?(\.[a-z0-9]+)$/i,
      '$1$2',
    )
    if (
      baseImageUrl === imageUrl
      || !recordsByPath.has(baseImageUrl)
    ) {
      continue
    }

    recordsByPath
      .get(baseImageUrl)
      .galleryImages
      .push(imageUrl, ...record.galleryImages)
    recordsByPath
      .get(baseImageUrl)
      .aliases
      .push(...record.aliases)
    recordsByPath.delete(imageUrl)
  }
}

function scoreProductCode(value) {
  const normalized = normalizeText(value)
  if (!normalized) return Number.NEGATIVE_INFINITY

  let score = 0
  if (/^GIUP\b/.test(normalized)) score += 10
  if (/^[A-Z]{2,8}\s*\d+[A-Z0-9-]*$/.test(normalized)) score += 8
  if (!/\s/.test(String(value).trim())) score += 3
  score -= normalized.length / 100
  return score
}

function chooseProductCode(aliases, fallbackName) {
  return [...aliases]
    .sort((left, right) => scoreProductCode(right) - scoreProductCode(left))[0]
    || fallbackName
}

function resolveBasesTopsSubcategory(imageUrl) {
  const segments = imageUrl
    .split('/gelitup-content/product-images/')[1]
    ?.split('/')
    .filter(Boolean) || []

  if (segments[0] === '2026 NEW!') return segments[1] || 'Bases & Tops'
  return segments.slice(1, -1).join(' / ') || 'Bases & Tops'
}

const imageMap = loadJson('product-image-map.json')
const priceList = loadJson('b2b-price-list.json').items
const colourFamilies = loadJson('solid-gel-colour-families.json')
const productSizes = loadJson('product-sizes.json')
const hiddenProducts = loadJson('hidden-products.json')
const slugRegistry = JSON.parse(
  readFileSync(
    resolve(__dirname, 'product-slug-overrides.json'),
    'utf8',
  ),
)
const slugOverrides = slugRegistry.overrides || {}

const hiddenSet = new Set(
  hiddenProducts.map(value => String(value).trim().toLowerCase()),
)
const aliasesByPath = new Map()

for (const [alias, rawImageUrl] of Object.entries(imageMap)) {
  if (hiddenSet.has(alias.trim().toLowerCase())) continue
  if (typeof rawImageUrl !== 'string') continue
  if (!isSolidGelImage(rawImageUrl)) continue
  if (/hero\.image/i.test(rawImageUrl.split('/').pop() || '')) continue

  const aliases = aliasesByPath.get(rawImageUrl) || []
  aliases.push(alias)
  aliasesByPath.set(rawImageUrl, aliases)
}

const recordsByPath = new Map(
  [...aliasesByPath].map(([imageUrl, aliases]) => [
    imageUrl,
    {
      imageUrl,
      aliases,
      galleryImages: [],
    },
  ]),
)

mergeAlternateGalleryRecords(recordsByPath)

const findImagePath = filename => (
  [...recordsByPath.keys()].find(path => (
    path.toUpperCase().endsWith(`/${filename.toUpperCase()}`)
  ))
)

const primary01Path = findImagePath('GIUP-01.webp')
const duplicate01Path = findImagePath('GIUP-01-FFF.webp')

if (!primary01Path || !duplicate01Path) {
  throw new Error(
    'Expected GIUP-01/GIUP-01-FFF duplicate pair was not found',
  )
}

recordsByPath
  .get(primary01Path)
  .galleryImages
  .push(
    duplicate01Path,
    ...recordsByPath.get(duplicate01Path).galleryImages,
  )
recordsByPath
  .get(primary01Path)
  .aliases
  .push(...recordsByPath.get(duplicate01Path).aliases)
recordsByPath.delete(duplicate01Path)

const exactPriceIndex = new Map()
const pricesByCode = new Map()

for (const product of priceList) {
  for (const candidate of [product.name, product.sku]) {
    const key = normalizeJoinKey(candidate)
    const matches = exactPriceIndex.get(key) || []
    matches.push(product)
    exactPriceIndex.set(key, matches)
  }

  const code = extractShadeCode(product.name)
  if (!code || !/\bHTF\b/i.test(product.name)) continue

  const matches = pricesByCode.get(code) || []
  matches.push(product)
  pricesByCode.set(code, matches)
}

const aliasedPriceIndex = new Map()
for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
  const targetEntry = choosePriceEntry(
    target,
    exactPriceIndex.get(normalizeJoinKey(target)) || [],
  )
  if (!targetEntry) continue

  for (const code of codes) {
    const key = normalizeJoinKey(code)
    const matches = aliasedPriceIndex.get(key) || []
    matches.push(targetEntry)
    aliasedPriceIndex.set(key, matches)
  }
}

const exactSizeIndex = new Map()
const sizesByCode = new Map()

for (const [name, size] of Object.entries(productSizes)) {
  exactSizeIndex.set(normalizeSizeKey(name), size)

  const code = extractShadeCode(name)
  if (!code) continue

  const values = sizesByCode.get(code) || new Set()
  values.add(size)
  sizesByCode.set(code, values)
}

const manifest = []
const warnings = []

for (const record of recordsByPath.values()) {
  const code = (
    extractShadeCode(record.imageUrl.split('/').pop())
    || record.aliases.map(extractShadeCode).find(Boolean)
  )
  if (!code) {
    throw new Error(
      `Could not derive shade code for ${record.imageUrl}`,
    )
  }

  const exactMatches = record.aliases.flatMap(alias => (
    exactPriceIndex.get(normalizeJoinKey(alias)) || []
  ))
  const priceEntry = (
    choosePriceEntry(code, exactMatches)
    || choosePriceEntry(code, pricesByCode.get(code) || [])
  )

  if (!priceEntry) {
    if (code === '109') {
      warnings.push(
        `Excluding GIUP-109: no price-list entry (${record.imageUrl})`,
      )
      continue
    }

    throw new Error(
      `Missing price-list entry for ${code} (${record.imageUrl})`,
    )
  }

  const imageSuffixName = deriveImageSuffixName(
    record.imageUrl,
    code,
  )
  const isGenericRoneName = (
    /^GEL\.IT\.UP\s+1\s+R\d+\s+11ml/i.test(priceEntry.name)
  )
  const name = isGenericRoneName && imageSuffixName
    ? `${code} ${imageSuffixName}`
    : stripStatusSuffix(priceEntry.name)

  const colorFamily = resolveColorFamily(
    record.imageUrl,
    colourFamilies,
  )
  if (!colorFamily) {
    throw new Error(
      `Missing colour family for ${code} (${record.imageUrl})`,
    )
  }

  let size = [
    priceEntry.name,
    priceEntry.sku,
    ...record.aliases,
  ]
    .map(candidate => (
      exactSizeIndex.get(normalizeSizeKey(candidate))
    ))
    .find(Boolean) || null

  if (!size) {
    const codeSizes = [...(sizesByCode.get(code) || [])]
    if (codeSizes.length === 1) size = codeSizes[0]
  }

  if (!size) {
    throw new Error(
      `Missing size for ${code} (${record.imageUrl})`,
    )
  }

  const descriptiveName = name.replace(
    new RegExp(`^${escapeRegExp(code)}\\s*`, 'i'),
    '',
  )
  const canonicalId = `solid-gel-polish:${code.toLowerCase()}`
  const slug = (
    slugOverrides[canonicalId]
    || slugify(`${code}-${descriptiveName}`)
  )

  manifest.push({
    slug,
    name,
    code,
    price: toCataloguePrice(priceEntry),
    category: 'Solid Gel Polish',
    subcategory: 'Solid Gel Polish',
    colorFamily,
    size,
    imageUrl: record.imageUrl,
    galleryImages: [...new Set(record.galleryImages)].sort(),
  })
}

const basesTopsAliasesByPath = new Map()
for (const [alias, rawImageUrl] of Object.entries(imageMap)) {
  if (hiddenSet.has(alias.trim().toLowerCase())) continue
  if (typeof rawImageUrl !== 'string') continue
  if (!isBasesTopsImage(rawImageUrl)) continue
  if (/hero\.image/i.test(rawImageUrl.split('/').pop() || '')) continue
  if (/\/BASES\/BRUSH ON BUILDER\//i.test(rawImageUrl)) continue

  const aliases = basesTopsAliasesByPath.get(rawImageUrl) || []
  aliases.push(alias)
  basesTopsAliasesByPath.set(rawImageUrl, aliases)
}

const basesTopsRecordsByPath = new Map(
  [...basesTopsAliasesByPath].map(([imageUrl, aliases]) => [
    imageUrl,
    {
      imageUrl,
      aliases,
      galleryImages: [],
      subcategory: resolveBasesTopsSubcategory(imageUrl),
    },
  ]),
)
mergeAlternateGalleryRecords(basesTopsRecordsByPath)

const resolvedBasesTopsRecords = []
for (const record of basesTopsRecordsByPath.values()) {
  const exactMatches = record.aliases.flatMap(alias => (
    exactPriceIndex.get(normalizeJoinKey(alias)) || []
  ))
  const aliasedMatches = record.aliases.flatMap(alias => (
    aliasedPriceIndex.get(normalizeJoinKey(alias)) || []
  ))
  const priceEntry = (
    choosePriceEntry(record.imageUrl, exactMatches)
    || choosePriceEntry(record.imageUrl, aliasedMatches)
  )

  if (!priceEntry) {
    throw new Error(
      `Missing Bases & Tops price-list entry (${record.imageUrl})`,
    )
  }

  const name = stripStatusSuffix(priceEntry.name)
  const size = [
    priceEntry.name,
    priceEntry.sku,
    ...record.aliases,
  ]
    .map(candidate => (
      exactSizeIndex.get(normalizeSizeKey(candidate))
    ))
    .find(Boolean) || null

  if (!size) {
    throw new Error(
      `Missing Bases & Tops size for ${name} (${record.imageUrl})`,
    )
  }

  resolvedBasesTopsRecords.push({
    ...record,
    code: chooseProductCode(record.aliases, priceEntry.sku),
    name,
    price: toCataloguePrice(priceEntry),
    priceKey: normalizeJoinKey(priceEntry.sku),
    size,
  })
}

const canonicalBasesTopsRecords = new Map()
for (const record of resolvedBasesTopsRecords) {
  const existing = canonicalBasesTopsRecords.get(record.priceKey)
  if (!existing) {
    canonicalBasesTopsRecords.set(record.priceKey, {
      ...record,
      aliases: [...record.aliases],
      galleryImages: [...record.galleryImages],
    })
    continue
  }

  existing.aliases.push(...record.aliases)
  existing.galleryImages.push(
    record.imageUrl,
    ...record.galleryImages,
  )
}

for (const record of canonicalBasesTopsRecords.values()) {
  const canonicalId = `bases-tops:${slugify(record.code)}`
  const slug = slugOverrides[canonicalId] || slugify(record.name)

  manifest.push({
    slug,
    name: record.name,
    code: record.code,
    price: record.price,
    category: 'Bases & Tops',
    subcategory: record.subcategory,
    colorFamily: null,
    size: record.size,
    imageUrl: record.imageUrl,
    galleryImages: [...new Set(record.galleryImages)]
      .filter(imageUrl => imageUrl !== record.imageUrl)
      .sort(),
  })
}

manifest.sort((left, right) => (
  left.category.localeCompare(right.category, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
  || left.name.localeCompare(right.name, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
))

const productsBySlug = new Map()
for (const product of manifest) {
  const products = productsBySlug.get(product.slug) || []
  products.push(product.code)
  productsBySlug.set(product.slug, products)
}

const collisions = [...productsBySlug]
  .filter(([, codes]) => codes.length > 1)

if (collisions.length) {
  throw new Error(
    `Product slug collision(s): ${collisions
      .map(([slug, codes]) => `${slug} [${codes.join(', ')}]`)
      .join('; ')}`,
  )
}

mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
writeFileSync(
  OUTPUT_PATH,
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8',
)

warnings.forEach(message => {
  console.warn(`[product-manifest] WARNING: ${message}`)
})
console.log(
  `[product-manifest] Generated ${manifest.length} products`,
)
console.log(`[product-manifest] Output: ${OUTPUT_PATH}`)
