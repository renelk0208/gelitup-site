/**
 * build-colour-families-json.mjs
 *
 * Reads docs/solid-gel-colour-families.csv (filled in manually) and writes
 * public/gelitup-content/solid-gel-colour-families.json
 *
 * The app loads this JSON at runtime for instant, zero-sampling colour filtering.
 *
 * Usage:
 *   node scripts/build-colour-families-json.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dir, '..')
const IN_CSV = join(ROOT, 'docs', 'solid-gel-colour-families.csv')
const OUT_JSON = join(ROOT, 'public', 'gelitup-content', 'solid-gel-colour-families.json')

const VALID = new Set(['RED', 'PINK', 'NUDE', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'BROWN', 'GREY', 'BLACK', 'WHITE'])

if (!existsSync(IN_CSV)) {
  console.error(`CSV not found: ${IN_CSV}`)
  console.error('Run: node scripts/generate-colour-families-scaffold.mjs first')
  process.exit(1)
}

const lines = readFileSync(IN_CSV, 'utf8').split('\n')
const result = {}
let assigned = 0
let skipped = 0
let invalid = 0

for (const raw of lines) {
  const line = raw.trim()
  if (!line || line.startsWith('#') || line.startsWith('sku')) continue

  const parts = line.split(',')
  const sku = parts[0]?.trim()
  const family = parts[1]?.trim().toUpperCase()

  if (!sku) continue
  if (!family) { skipped++; continue }
  if (!VALID.has(family)) {
    console.warn(`  ⚠ Invalid colorFamily "${family}" for ${sku} — skipping`)
    invalid++
    continue
  }

  result[sku] = family
  assigned++
}

writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf8')
console.log(`✓ Wrote ${OUT_JSON}`)
console.log(`  Assigned: ${assigned}`)
console.log(`  Blank (skipped): ${skipped}`)
if (invalid) console.log(`  Invalid values: ${invalid}`)
console.log('\nDone. Deploy the site to make the JSON available to the app.')
