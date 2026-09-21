import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const SNAPSHOT_PATH = path.resolve('public', 'gelitup-content', 'pages.json')
const OUTPUT_DIR = path.resolve('src', 'pages', 'imported', 'generated')
const INDEX_FILE = path.join(OUTPUT_DIR, 'index.js')

function toPascalCase(value) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

function makeComponentName(slug) {
  const base = toPascalCase(slug) || 'Page'
  return `Imported${base}Page`
}

async function main() {
  const snapshotRaw = await readFile(SNAPSHOT_PATH, 'utf8')
  const snapshot = JSON.parse(snapshotRaw)
  const pages = Array.isArray(snapshot?.pages) ? snapshot.pages : []

  await mkdir(OUTPUT_DIR, { recursive: true })

  const exportLines = []

  for (const page of pages) {
    const slug = page?.slug
    if (!slug) continue

    const componentName = makeComponentName(slug)
    const fileName = `${componentName}.jsx`
    const filePath = path.join(OUTPUT_DIR, fileName)
    const editorFile = `src/pages/imported/generated/${fileName}`

    const content = `import ImportedSnapshotPage from '../ImportedSnapshotPage'\n\nexport default function ${componentName}() {\n  return <ImportedSnapshotPage slug=\"${slug}\" editorFile=\"${editorFile}\" />\n}\n`

    await writeFile(filePath, content, 'utf8')
    exportLines.push(`export { default as ${componentName} } from './${componentName}.jsx'`)
    console.log(`Generated ${editorFile}`)
  }

  await writeFile(INDEX_FILE, `${exportLines.join('\n')}\n`, 'utf8')
  console.log(`Updated ${path.relative(process.cwd(), INDEX_FILE)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
