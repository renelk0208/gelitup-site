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

// Check row count
const count = await runSQL('SELECT COUNT(*) as cnt FROM zoho_item_map')
console.log('Row count:', JSON.stringify(count))

// Sample HTF rows
const sample = await runSQL("SELECT sku, item_id FROM zoho_item_map WHERE sku LIKE '01 ICE%' LIMIT 5")
console.log('Sample HTF rows:', JSON.stringify(sample, null, 2))

// Check for exact key "01 ICE ICE BABY -HTF"
const exact = await runSQL("SELECT sku, item_id FROM zoho_item_map WHERE sku = '01 ICE ICE BABY -HTF'")
console.log('Exact key lookup:', JSON.stringify(exact))

// Sample first 5 rows
const first5 = await runSQL('SELECT sku, item_id FROM zoho_item_map LIMIT 5')
console.log('First 5 rows:', JSON.stringify(first5, null, 2))
