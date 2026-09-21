#!/usr/bin/env node
/**
 * repopulate-zoho-item-map.mjs
 *
 * Truncates and repopulates the zoho_item_map table in Supabase using the
 * Supabase Management API (requires SUPABASE_ACCESS_TOKEN in .env).
 *
 * Usage:
 *   node scripts/repopulate-zoho-item-map.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── .env loader ────────────────────────────────────────────────────────────────
function loadDotEnv () {
  try {
    const content = readFileSync(resolve(__dirname, '../.env'), 'utf8')
    for (const raw of content.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* no .env — rely on environment */ }
}

loadDotEnv()

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'veyxwtdntcfsvldmrthc'
const MAP_FILE = resolve(__dirname, '../zoho-item-map.json')

if (!ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN not set in .env')
  process.exit(1)
}

const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function runSQL (sql) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`SQL error (${r.status}): ${JSON.stringify(body)}`)
  return body
}

const map = JSON.parse(readFileSync(MAP_FILE, 'utf8'))
const rows = Object.entries(map)
console.log(`Loaded ${rows.length} rows from zoho-item-map.json`)

// Truncate
await runSQL('TRUNCATE TABLE zoho_item_map')
console.log('Table truncated.')

// Insert in batches
const BATCH = 200
let inserted = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH)
  const values = batch
    .map(([sku, item_id]) => {
      const s = sku.replace(/'/g, "''")
      const id = String(item_id).replace(/'/g, "''")
      return `('${s}', '${id}')`
    })
    .join(',')
  const sql = `INSERT INTO zoho_item_map (sku, item_id) VALUES ${values} ON CONFLICT (sku) DO UPDATE SET item_id = EXCLUDED.item_id`
  await runSQL(sql)
  inserted += batch.length
  process.stdout.write(`Inserted ${inserted}/${rows.length}\r`)
}

console.log(`\nDone. ${inserted} rows upserted into zoho_item_map.`)
