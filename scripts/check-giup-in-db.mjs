#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
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
  } catch { /* no .env */ }
}
loadDotEnv()

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'veyxwtdntcfsvldmrthc'
const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function runSQL(sql) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  return r.json()
}

// Check for GIUP prefix items in the map
const giup = await runSQL("SELECT sku, item_id FROM zoho_item_map WHERE sku LIKE 'GIUP %' ORDER BY sku LIMIT 20")
console.log('GIUP keys in DB:', JSON.stringify(giup, null, 2))

// Check specific ones from error
const specific = await runSQL("SELECT sku, item_id FROM zoho_item_map WHERE sku IN ('GIUP 01','GIUP 11','GIUP 12','GIUP 13','GIUP 15')")
console.log('Specific GIUP lookup:', JSON.stringify(specific))

// Check what a GIUP 01 would need to match
const giupLike = await runSQL("SELECT sku, item_id FROM zoho_item_map WHERE sku LIKE '%GIUP%01%' LIMIT 10")
console.log('Fuzzy GIUP 01:', JSON.stringify(giupLike, null, 2))
