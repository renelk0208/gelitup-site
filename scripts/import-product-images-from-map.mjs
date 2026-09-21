import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const mapFilePath = path.join(projectRoot, 'public', 'gelitup-content', 'product-image-map.json')
const outputDir = path.join(projectRoot, 'public', 'gelitup-content', 'product-images')
const siteOrigin = (process.env.GELITUP_SITE_ORIGIN || 'https://www.gelitup.com').replace(/\/$/, '')

const defaultExtensionByMime = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
}

function extractGoogleDriveFileId(value) {
  const input = String(value || '').trim()
  if (!input) return null

  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/uc\?(?:[^#]*&)??id=([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/thumbnail\?(?:[^#]*&)??id=([a-zA-Z0-9_-]+)/i,
    /docs\.google\.com\/uc\?(?:[^#]*&)??id=([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i,
  ]

  for (const pattern of patterns) {
    const match = input.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

function toDownloadableUrl(value) {
  const input = String(value || '').trim()
  const fileId = extractGoogleDriveFileId(input)

  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`
  }

  return input
}

function sanitizeFileName(rawName) {
  return String(rawName || '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function toSkuFileBaseName(rawKey) {
  const normalized = sanitizeFileName(rawKey).toUpperCase()
  return normalized || 'IMAGE'
}

function extFromUrl(urlString) {
  try {
    const url = new URL(urlString)
    const ext = path.extname(url.pathname).toLowerCase()
    return ext || ''
  }
  catch {
    return ''
  }
}

function extFromContentType(contentType) {
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase()
  return defaultExtensionByMime[mime] || ''
}

function shouldImportRemote(value) {
  return /^https?:\/\//i.test(String(value || '').trim())
}

function isLocalWebPath(value) {
  return String(value || '').trim().startsWith('/')
}

async function readMap() {
  const raw = await fs.readFile(mapFilePath, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('product-image-map.json must contain a key/value object')
  }

  return parsed
}

async function downloadImage(urlString) {
  const response = await fetch(urlString, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'gelitup-importer/1.0',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const buffer = Buffer.from(await response.arrayBuffer())

  return { buffer, contentType }
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true })

  const map = await readMap()
  const entries = Object.entries(map)
  const usedFileNames = new Set()
  let importedCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const [key, value] of entries) {
    const source = String(value || '').trim()

    let downloadSource = source
    const localTargetPath = path.join(projectRoot, source.replace(/^\//, ''))

    if (!shouldImportRemote(source)) {
      if (isLocalWebPath(source)) {
        const existsLocally = await fs.access(localTargetPath).then(() => true).catch(() => false)
        if (existsLocally) {
          skippedCount += 1
          continue
        }

        downloadSource = `${siteOrigin}${source}`
      }
      else {
        skippedCount += 1
        continue
      }
    }

    try {
      const url = toDownloadableUrl(downloadSource)
      const { buffer, contentType } = await downloadImage(url)

      const hash = createHash('sha1').update(url).digest('hex').slice(0, 8)
      const baseName = toSkuFileBaseName(key)
      const ext = extFromUrl(url) || extFromContentType(contentType) || '.jpg'

      let fileName = `${baseName}${ext}`
      if (usedFileNames.has(fileName)) {
        fileName = `${baseName}-${hash}${ext}`
      }

      let collisionIndex = 2
      while (usedFileNames.has(fileName)) {
        fileName = `${baseName}-${hash}-${collisionIndex}${ext}`
        collisionIndex += 1
      }

      usedFileNames.add(fileName)
      const absolutePath = path.join(outputDir, fileName)
      const publicPath = `/gelitup-content/product-images/${fileName}`

      await fs.writeFile(absolutePath, buffer)
      map[key] = publicPath
      importedCount += 1
      console.log(`✓ Imported ${key} -> ${publicPath}`)
    }
    catch (error) {
      failedCount += 1
      console.warn(`! Failed ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  await fs.writeFile(mapFilePath, `${JSON.stringify(map, null, 2)}\n`, 'utf8')

  console.log(`\nImport complete:`)
  console.log(`- Imported: ${importedCount}`)
  console.log(`- Skipped (already local/non-http): ${skippedCount}`)
  console.log(`- Failed: ${failedCount}`)
  console.log(`- Updated map: ${path.relative(projectRoot, mapFilePath)}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
