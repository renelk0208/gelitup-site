import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const imageDir = path.join(projectRoot, 'public', 'gelitup-content', 'product-images')
const mapFilePath = path.join(projectRoot, 'public', 'gelitup-content', 'product-image-map.json')
const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'])
const brushOnBuilderCanonicalRoot = '/gelitup-content/product-images/BUILDER GEL/BRUSH ON BUILDER/'

function normalizeSpaces(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSkuCandidate(baseName) {
  const upper = baseName.toUpperCase().replace(/[_\s]+/g, '-')

  if (upper.startsWith('GIUP-')) return upper
  if (upper.startsWith('GIUP')) {
    const remainder = upper.slice(4).replace(/^-+/, '')
    return remainder ? `GIUP-${remainder}` : 'GIUP'
  }

  return null
}

function deriveKeys(baseName) {
  const keys = new Set()
  const trimmed = String(baseName || '').trim()

  if (trimmed) keys.add(trimmed)

  const spaced = normalizeSpaces(trimmed)
  if (spaced) keys.add(spaced)

  const sku = buildSkuCandidate(trimmed)
  if (sku) keys.add(sku)

  return Array.from(keys)
}

async function walkImages(dirPath, basePath = dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      const nested = await walkImages(fullPath, basePath)
      files.push(...nested)
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!supportedExtensions.has(ext)) continue

    const relativeFromImagesRoot = path.relative(basePath, fullPath).replace(/\\/g, '/')
    files.push({
      fullPath,
      fileName: entry.name,
      baseName: path.basename(entry.name, ext),
      publicPath: `/gelitup-content/product-images/${relativeFromImagesRoot}`,
    })
  }

  return files
}

async function readExistingMap() {
  try {
    const raw = await fs.readFile(mapFilePath, 'utf8')
    const parsed = JSON.parse(raw)

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed
    }

    return {}
  }
  catch {
    return {}
  }
}

async function main() {
  const imagesDirExists = await fs
    .access(imageDir)
    .then(() => true)
    .catch(() => false)

  if (!imagesDirExists) {
    console.error(`Image directory not found: ${imageDir}`)
    process.exit(1)
  }

  const existingMap = await readExistingMap()
  const map = { ...existingMap }
  const imageFiles = await walkImages(imageDir)
  const currentImagePaths = new Set(imageFiles.map((image) => image.publicPath))
  const preferredBrushPaths = new Map()
  let generatedKeys = 0
  let repairedKeys = 0

  for (const image of imageFiles) {
    if (image.publicPath.startsWith(brushOnBuilderCanonicalRoot)) {
      preferredBrushPaths.set(image.baseName, image.publicPath)
    }
  }

  imageFiles.forEach((image) => {
    const keys = deriveKeys(image.baseName)
    const preferredBrushPath = preferredBrushPaths.get(image.baseName)
    const isBrushOnBuilderImage = /brush on builder/i.test(image.publicPath)

    keys.forEach((key) => {
      if (!map[key]) {
        map[key] = preferredBrushPath || image.publicPath
        generatedKeys += 1
        return
      }

      const existingValue = String(map[key] || '').trim()
      const isLocalImagePath = existingValue.startsWith('/gelitup-content/product-images/')
      const localPathMissing = isLocalImagePath && !currentImagePaths.has(existingValue)

      if (preferredBrushPath && isBrushOnBuilderImage && existingValue !== preferredBrushPath) {
        map[key] = preferredBrushPath
        repairedKeys += 1
        return
      }

      if (localPathMissing) {
        map[key] = preferredBrushPath || image.publicPath
        repairedKeys += 1
      }
    })
  })

  const sorted = Object.fromEntries(
    Object.entries(map).sort(([keyA], [keyB]) => keyA.localeCompare(keyB, 'en', { sensitivity: 'base' })),
  )

  await fs.writeFile(mapFilePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')

  console.log(`Scanned ${imageFiles.length} image file(s) from ${path.relative(projectRoot, imageDir)}.`)
  console.log(`Generated ${generatedKeys} new map key(s).`)
  console.log(`Repaired ${repairedKeys} stale map key(s).`)
  console.log(`Updated map: ${path.relative(projectRoot, mapFilePath)}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
