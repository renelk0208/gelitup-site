import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const mapFilePath = path.join(projectRoot, 'public', 'gelitup-content', 'product-image-map.json')

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

function toDirectGoogleDriveUrl(value) {
  const input = String(value || '').trim()
  const fileId = extractGoogleDriveFileId(input)

  if (!fileId) return input

  return `https://drive.google.com/uc?export=view&id=${fileId}`
}

async function main() {
  const raw = await fs.readFile(mapFilePath, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('product-image-map.json must contain a JSON object of key/value pairs.')
  }

  const normalizedEntries = Object.entries(parsed).map(([key, value]) => {
    const valueString = String(value || '').trim()
    const normalizedValue = toDirectGoogleDriveUrl(valueString)
    return [key, normalizedValue]
  })

  const normalizedMap = Object.fromEntries(normalizedEntries)

  let updatedCount = 0
  Object.entries(parsed).forEach(([key, oldValue]) => {
    if (String(oldValue || '').trim() !== normalizedMap[key]) {
      updatedCount += 1
    }
  })

  await fs.writeFile(mapFilePath, `${JSON.stringify(normalizedMap, null, 2)}\n`, 'utf8')

  console.log(`Normalized ${updatedCount} Google Drive URL(s) in ${path.relative(projectRoot, mapFilePath)}.`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
