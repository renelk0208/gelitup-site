#!/usr/bin/env node
/**
 * Convert all JPG / JPEG / PNG images under public/gelitup-media/inspiration/
 * to WebP (quality 82, keeps originals so you can verify then delete).
 */
import sharp from 'sharp'
import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'

const ROOT = 'public/gelitup-media/inspiration'
const EXTS = new Set(['.jpg', '.jpeg', '.jfif', '.png'])
const QUALITY = 82

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) files.push(...await walk(full))
    else if (EXTS.has(extname(e.name).toLowerCase())) files.push(full)
  }
  return files
}

const files = await walk(ROOT)
console.log(`Found ${files.length} images to convert…`)

let ok = 0, skip = 0
for (const src of files) {
  const dest = src.replace(/\.[^.]+$/, '.webp')
  try {
    // Skip if webp already exists and is newer
    try {
      const [s1, s2] = await Promise.all([stat(src), stat(dest)])
      if (s2.mtimeMs >= s1.mtimeMs) { skip++; continue }
    } catch { /* dest doesn't exist yet */ }

    await sharp(src).webp({ quality: QUALITY }).toFile(dest)
    ok++
    if (ok % 20 === 0) console.log(`  converted ${ok}…`)
  } catch (err) {
    console.error(`  FAIL ${src}: ${err.message}`)
  }
}
console.log(`Done — ${ok} converted, ${skip} skipped (already up-to-date).`)
