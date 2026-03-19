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

// Check for the missing codes from the error message
const codes = ['GIUP 11','GIUP 12','GIUP 13','GIUP 15','GIUP 15A','GIUP 16','GIUP 17','GIUP 18','GIUP 19','GIUP 20','GIUP 21','GIUP 22']
const inList = codes.map(c => `'${c}'`).join(',')
const found = await runSQL(`SELECT sku, item_id FROM zoho_item_map WHERE sku IN (${inList}) ORDER BY sku`)
console.log('Found in DB:', JSON.stringify(found, null, 2))

// Check what IS in DB for GIUP 1x range
const range = await runSQL(`SELECT sku, item_id FROM zoho_item_map WHERE sku ~ '^GIUP[ #]?1[0-9]' ORDER BY sku LIMIT 30`)
console.log('GIUP 1x range in DB:', JSON.stringify(range, null, 2))
