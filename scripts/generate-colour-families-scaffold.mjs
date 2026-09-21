/**
 * generate-colour-families-scaffold.mjs
 *
 * Scans public/gelitup-content/product-images/COLORS/SOLID GEL POLISH and
 * outputs docs/solid-gel-colour-families.csv — a scaffold for manual colour
 * family assignment.
 *
 * Usage:
 *   node scripts/generate-colour-families-scaffold.mjs
 *
 * CSV columns:
 *   sku        — e.g. GIUP-01  (used as the lookup key in the app)
 *   colorFamily — leave blank or fill with one of the valid values below
 *   imageUrl   — path relative to /public (for reference when filling in)
 *
 * Valid colorFamily values:
 *   RED  PINK  NUDE  ORANGE  YELLOW  GREEN  BLUE  PURPLE  BROWN  GREY  BLACK  WHITE
 */

import { readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dir, '..')
const SOLID_DIR = join(ROOT, 'public', 'gelitup-content', 'product-images', 'COLORS', 'SOLID GEL POLISH')
const OUT_CSV = join(ROOT, 'docs', 'solid-gel-colour-families.csv')
const EXISTING_CSV = OUT_CSV

const VALID = 'RED,PINK,NUDE,ORANGE,YELLOW,GREEN,BLUE,PURPLE,BROWN,GREY,BLACK,WHITE'

if (!existsSync(SOLID_DIR)) {
  console.error(`Directory not found: ${SOLID_DIR}`)
  process.exit(1)
}

// Load any existing assignments so a re-run preserves manual work
const existing = {}
if (existsSync(EXISTING_CSV)) {
  const lines = (await import('node:fs')).readFileSync(EXISTING_CSV, 'utf8').split('\n')
  for (const line of lines.slice(1)) {
    const [sku, colorFamily] = line.split(',')
    if (sku && colorFamily?.trim()) existing[sku.trim()] = colorFamily.trim()
  }
  console.log(`Loaded ${Object.keys(existing).length} existing assignments from ${EXISTING_CSV}`)
}

// Collect all image files, skip hero placeholder
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])
const entries = readdirSync(SOLID_DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && IMAGE_EXTS.has(extname(e.name).toLowerCase()))
  .map((e) => {
    const sku = basename(e.name, extname(e.name))
    return { sku, imageUrl: `/gelitup-content/product-images/COLORS/SOLID GEL POLISH/${e.name}` }
  })
  .filter((e) => !e.sku.toLowerCase().includes('hero') && !e.sku.toLowerCase().includes('solid.colour'))
  .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }))

// Build CSV
const header = `sku,colorFamily,imageUrl\n# Valid colorFamily values: ${VALID}`
const rows = entries.map(({ sku, imageUrl }) => {
  const family = existing[sku] || ''
  return `${sku},${family},${imageUrl}`
})

writeFileSync(OUT_CSV, [header, ...rows].join('\n'), 'utf8')
console.log(`✓ Wrote ${entries.length} rows → ${OUT_CSV}`)
console.log(`  Open in Excel or Google Sheets.`)
console.log(`  Fill in the colorFamily column (valid: ${VALID})`)
console.log(`  Then run: node scripts/build-colour-families-json.mjs`)
