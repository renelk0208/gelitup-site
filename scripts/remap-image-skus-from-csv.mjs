import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const csvPath = process.argv[2]
const mapFilePath = path.join(projectRoot, 'public', 'gelitup-content', 'product-image-map.json')
const imagesDir = path.join(projectRoot, 'public', 'gelitup-content', 'product-images')
const codePrefix = process.env.SKU_PREFIX || 'GIUP-COL-'
const enableFileRename = process.env.RENAME_IMAGE_FILES === 'true'

if (!csvPath) {
  console.error('Usage: node scripts/remap-image-skus-from-csv.mjs <csv-file-path>')
  process.exit(1)
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, ' ')
    .replace(/[^A-Z0-9 -]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizeCsvHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function canonicalSku(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return ''

  const upper = value.toUpperCase().replace(/\s+/g, '')

  if (upper.startsWith('GIUP-')) return upper
  if (/^[A-Z]{2,}-[A-Z0-9-]+$/.test(upper)) return upper

  return `${codePrefix}${upper}`
}

function parseCsvLine(line) {
  const fields = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      }
      else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }

    current += char
  }

  fields.push(current)
  return fields
}

function parseCsv(content) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (!lines.length) return []

  const header = parseCsvLine(lines[0]).map(normalizeCsvHeader)
  const rows = []

  for (let i = 1; i < lines.length; i += 1) {
    const values = parseCsvLine(lines[i])
    const row = {}

    header.forEach((key, index) => {
      row[key] = String(values[index] || '').trim()
    })

    rows.push(row)
  }

  return rows
}

function pickFirst(row, keys) {
  for (const key of keys) {
    const normalized = normalizeCsvHeader(key)
    const value = row[normalized]
    if (value && String(value).trim()) return String(value).trim()
  }
  return ''
}

function buildAliasToSku(rows) {
  const aliasToSku = new Map()

  rows.forEach((row) => {
    const skuRaw = pickFirst(row, ['sku', 'itemsku', 'productsku', 'code'])
    const sku = canonicalSku(skuRaw)
    if (!sku) return

    const code = pickFirst(row, ['code', 'itemcode'])
    const name = pickFirst(row, ['colorname', 'itemname', 'name', 'productname'])

    const aliases = [skuRaw, sku, code, name]
      .map(normalizeToken)
      .filter(Boolean)

    aliases.forEach((alias) => {
      if (!aliasToSku.has(alias)) {
        aliasToSku.set(alias, sku)
      }
    })
  })

  return aliasToSku
}

async function safeRenameIfNeeded(currentPublicPath, sku, usedFileNames) {
  const relative = currentPublicPath.replace(/^\//, '')
  const currentAbsolutePath = path.join(projectRoot, relative)
  const currentExt = path.extname(currentAbsolutePath).toLowerCase() || '.jpg'

  let targetFileName = `${sku}${currentExt}`
  if (usedFileNames.has(targetFileName)) {
    let index = 2
    while (usedFileNames.has(`${sku}-${index}${currentExt}`)) {
      index += 1
    }
    targetFileName = `${sku}-${index}${currentExt}`
  }

  usedFileNames.add(targetFileName)
  const targetAbsolutePath = path.join(imagesDir, targetFileName)
  const targetPublicPath = `/gelitup-content/product-images/${targetFileName}`

  if (path.normalize(currentAbsolutePath) === path.normalize(targetAbsolutePath)) {
    return targetPublicPath
  }

  const currentExists = await fs.access(currentAbsolutePath).then(() => true).catch(() => false)
  if (!currentExists) {
    return currentPublicPath
  }

  await fs.rename(currentAbsolutePath, targetAbsolutePath)
  return targetPublicPath
}

async function main() {
  const csvAbsolutePath = path.resolve(csvPath)
  const [csvRaw, mapRaw] = await Promise.all([
    fs.readFile(csvAbsolutePath, 'utf8'),
    fs.readFile(mapFilePath, 'utf8'),
  ])

  const rows = parseCsv(csvRaw)
  const aliasToSku = buildAliasToSku(rows)
  const map = JSON.parse(mapRaw)

  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    throw new Error('product-image-map.json must contain a key/value object')
  }

  const usedFileNames = new Set()
  const newMap = {}
  let remappedKeys = 0
  let renamedFiles = 0

  for (const [oldKey, oldPath] of Object.entries(map)) {
    const oldPathString = String(oldPath || '').trim()
    const baseName = path.basename(oldPathString, path.extname(oldPathString))
    const candidates = [oldKey, baseName].map(normalizeToken).filter(Boolean)

    let sku = ''
    for (const candidate of candidates) {
      const matched = aliasToSku.get(candidate)
      if (matched) {
        sku = matched
        break
      }
    }

    if (!sku) {
      newMap[oldKey] = oldPathString
      continue
    }

    const finalPublicPath = enableFileRename
      ? await safeRenameIfNeeded(oldPathString, sku, usedFileNames)
      : oldPathString

    if (enableFileRename && finalPublicPath !== oldPathString) {
      renamedFiles += 1
    }

    if (oldKey !== sku) {
      remappedKeys += 1
    }

    newMap[sku] = finalPublicPath
  }

  const sorted = Object.fromEntries(
    Object.entries(newMap).sort(([a], [b]) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
  )

  await fs.writeFile(mapFilePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8')

  console.log(`Zoho SKU remap completed.`)
  console.log(`- CSV rows parsed: ${rows.length}`)
  console.log(`- Map keys remapped to SKU: ${remappedKeys}`)
  console.log(`- Local files renamed: ${renamedFiles}${enableFileRename ? '' : ' (disabled by default)'}`)
  console.log(`- Updated map: ${path.relative(projectRoot, mapFilePath)}`)
  console.log(`- File rename mode: ${enableFileRename ? 'enabled' : 'disabled (set RENAME_IMAGE_FILES=true to enable)'}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
