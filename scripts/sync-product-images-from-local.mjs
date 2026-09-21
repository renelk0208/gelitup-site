import fs from 'node:fs/promises'
import path from 'node:path'

const sourceArg = process.argv[2]
if (!sourceArg) {
  console.error('Usage: node scripts/sync-product-images-from-local.mjs "<local-source-folder>"')
  process.exit(1)
}

const projectRoot = process.cwd()
const sourceRoot = path.resolve(sourceArg)
const targetRoot = path.join(projectRoot, 'public', 'gelitup-content', 'product-images')
const allowedExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif', '.svg'])

async function exists(targetPath) {
  try {
    await fs.access(targetPath)
    return true
  }
  catch {
    return false
  }
}

async function walk(currentPath) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name)

    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath))
      continue
    }

    const ext = path.extname(entry.name).toLowerCase()
    if (!allowedExt.has(ext)) continue
    files.push(absolutePath)
  }

  return files
}

async function main() {
  const hasSource = await exists(sourceRoot)
  if (!hasSource) {
    throw new Error(`Source folder not found: ${sourceRoot}`)
  }

  await fs.mkdir(targetRoot, { recursive: true })

  const files = await walk(sourceRoot)
  let copied = 0

  for (const sourceFile of files) {
    const relative = path.relative(sourceRoot, sourceFile)
    const targetFile = path.join(targetRoot, relative)
    await fs.mkdir(path.dirname(targetFile), { recursive: true })
    await fs.copyFile(sourceFile, targetFile)
    copied += 1
  }

  console.log(`Synced ${copied} image file(s).`)
  console.log(`Source: ${sourceRoot}`)
  console.log(`Target: ${targetRoot}`)
  console.log('Names and folders were preserved exactly.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error')
  process.exit(1)
})
