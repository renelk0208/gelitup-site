#!/usr/bin/env node
/**
 * fetch-zoho-item-map.mjs
 *
 * Fetches all Items from Zoho Books and builds the ZOHO_BOOKS_ITEM_MAP_JSON
 * secret value (SKU → item_id) needed by the zoho-sync-order Edge Function.
 *
 * Usage:
 *   node scripts/fetch-zoho-item-map.mjs
 *   node scripts/fetch-zoho-item-map.mjs --output zoho-item-map.json
 *   node scripts/fetch-zoho-item-map.mjs --verbose
 *
 * Required env vars (add to .env or export before running):
 *   ZOHO_BOOKS_ORGANIZATION_ID
 *   ZOHO_BOOKS_ACCESS_TOKEN        — static token (short-lived, easiest for a one-off run)
 *   OR all three refresh-token creds:
 *     ZOHO_BOOKS_REFRESH_TOKEN
 *     ZOHO_BOOKS_CLIENT_ID
 *     ZOHO_BOOKS_CLIENT_SECRET
 *
 * Optional:
 *   ZOHO_BOOKS_BASE_URL            — default: https://www.zohoapis.com/books/v3
 *   ZOHO_ACCOUNTS_BASE_URL         — default: https://accounts.zoho.com
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── .env loader ────────────────────────────────────────────────────────────────
function loadDotEnv() {
  try {
    const envPath = resolve(__dirname, '../.env')
    const content = readFileSync(envPath, 'utf8')
    for (const raw of content.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const eq = line.indexOf('=')
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // no .env — rely on environment
  }
}

// ── Zoho OAuth ─────────────────────────────────────────────────────────────────
async function resolveAccessToken() {
  const staticToken = process.env.ZOHO_BOOKS_ACCESS_TOKEN
  if (staticToken) return staticToken

  const refreshToken = process.env.ZOHO_BOOKS_REFRESH_TOKEN
  const clientId = process.env.ZOHO_BOOKS_CLIENT_ID
  const clientSecret = process.env.ZOHO_BOOKS_CLIENT_SECRET

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error(
      'Set ZOHO_BOOKS_ACCESS_TOKEN, or all three: ZOHO_BOOKS_REFRESH_TOKEN, ZOHO_BOOKS_CLIENT_ID, ZOHO_BOOKS_CLIENT_SECRET',
    )
  }

  const accountsBase = process.env.ZOHO_ACCOUNTS_BASE_URL || 'https://accounts.zoho.com'
  const url = new URL('/oauth/v2/token', accountsBase)
  url.searchParams.set('refresh_token', refreshToken)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('client_secret', clientSecret)
  url.searchParams.set('grant_type', 'refresh_token')

  const res = await fetch(url.toString(), { method: 'POST' })
  const data = await res.json().catch(() => null)

  if (!res.ok || !data?.access_token) {
    throw new Error(`Token refresh failed: ${data?.error || res.status}`)
  }

  return data.access_token
}

// ── Zoho Books Items API ────────────────────────────────────────────────────────
async function fetchAllItems(accessToken, orgId) {
  const booksBase = process.env.ZOHO_BOOKS_BASE_URL || 'https://www.zohoapis.com/books/v3'
  const allItems = []
  let page = 1

  while (true) {
    const url = new URL(booksBase.replace(/\/?$/, '') + '/items')
    url.searchParams.set('organization_id', orgId)
    url.searchParams.set('page', String(page))
    url.searchParams.set('per_page', '200')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(data?.message || `Zoho Items API error (HTTP ${res.status})`)
    }

    const pageItems = Array.isArray(data?.items) ? data.items : []
    allItems.push(...pageItems)

    process.stdout.write(`  page ${page}: ${pageItems.length} items\n`)

    const hasMore = data?.page_context?.has_more_page === true
    if (!hasMore || pageItems.length === 0) break
    page++
  }

  return allItems
}

// ── Cross-check against local catalogue ──────────────────────────────────────
function checkCoverage(itemMap) {
  try {
    const podsPath = resolve(__dirname, '../public/gelitup-content/package-pods.json')
    const pods = JSON.parse(readFileSync(podsPath, 'utf8'))
    const allProducts = [
      ...(pods.pod_1 ?? []),
      ...(pods.pod_2 ?? []),
      ...(pods.pod_3 ?? []),
      ...(pods.pod_4 ?? []),
    ]

    const localSkus = allProducts.map((p) => (p.sku || '').trim())
    const mapped = localSkus.filter((s) => itemMap[s])
    const unmapped = localSkus.filter((s) => s && !itemMap[s])
    const blank = localSkus.filter((s) => !s)

    console.log('\nCatalogue SKU coverage:')
    console.log(`  Local products total : ${allProducts.length}`)
    console.log(`  SKUs present         : ${localSkus.length - blank.length}`)
    console.log(`  Mapped in Zoho       : ${mapped.length}`)
    if (blank.length) console.log(`  Missing SKU field    : ${blank.length}`)
    if (unmapped.length === 0) {
      console.log('  All catalogue SKUs found in Zoho ✓')
    } else {
      console.log(`  NOT found in Zoho (${unmapped.length}):`)
      unmapped.forEach((s) => console.log(`    - ${s}`))
    }
  } catch (e) {
    console.warn('Could not read package-pods.json for cross-check:', e.message)
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  loadDotEnv()

  const args = process.argv.slice(2)
  const outputIdx = args.indexOf('--output')
  const outputFile = outputIdx !== -1 ? args[outputIdx + 1] : null
  const verbose = args.includes('--verbose') || args.includes('-v')

  const orgId = process.env.ZOHO_BOOKS_ORGANIZATION_ID
  if (!orgId) {
    console.error('ERROR: ZOHO_BOOKS_ORGANIZATION_ID not set')
    process.exit(1)
  }
  if (!process.env.ZOHO_BOOKS_ACCESS_TOKEN && !process.env.ZOHO_BOOKS_REFRESH_TOKEN) {
    console.error('ERROR: No Zoho credentials found. See script header for required env vars.')
    process.exit(1)
  }

  console.log('Authenticating with Zoho Books...')
  const accessToken = await resolveAccessToken()

  console.log('Fetching items...')
  const items = await fetchAllItems(accessToken, orgId)
  console.log(`Total items fetched: ${items.length}`)

  // ── helpers ──────────────────────────────────────────────────────────────────
  // Normalise a raw SKU/name the same way the portal and zoho-sync-order do.
  // NOTE: # is intentionally preserved — Zoho stores product SKUs with # and
  // those keys must remain intact in the map for correct order sync.
  function normSku(s) {
    return String(s || '').trim().toUpperCase().replace(/\s+/g, ' ')
  }
  // Strip trailing variant tags so "01 Ice Ice Baby -HTF" → "01 ICE ICE BABY"
  function stripVariant(s) {
    return normSku(s).replace(/\s*[-–]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '').trim()
  }
  // Extract the leading colour number so "01 Ice Ice Baby" → "01"
  function leadingCode(s) {
    const m = String(s || '').match(/^(\d+[A-Z]?)\s/i)
    return m ? m[1].toUpperCase() : null
  }
  // Pad/unpad number variants: "1" / "01" / "001"
  function numVariants(n, sfx = '') {
    const i = parseInt(n, 10)
    return [String(i), String(i).padStart(2,'0'), String(i).padStart(3,'0')].map(p => `${p}${sfx}`)
  }
  // All keys we want to map to the same item_id.
  // Mirrors the alias logic in App.jsx priceMap builder so the portal's short
  // catalog codes always resolve — # is kept for Zoho but short codes are also
  // added so order items match regardless of how the catalog codes are stored.
  function aliases(rawSku) {
    const full     = normSku(rawSku)     // "01 ICE ICE BABY -HTF"  (# preserved)
    const stripped = stripVariant(rawSku) // "01 ICE ICE BABY"        (# preserved)

    const set = new Set([full, stripped].filter(Boolean))

    // ── Leading numeric code: "01 Ice Ice Baby" → "01", "1", "001" ──────────
    const shortCode = leadingCode(stripped)
    if (shortCode) {
      set.add(shortCode)
      const num = shortCode.match(/^(\d+)([A-Z]?)$/)
      if (num) {
        numVariants(num[1], num[2] || '').forEach(k => set.add(k))
        // ── GIUP alias: portal image-map keys use "GIUP {N}" for solid gel colours
        // e.g. "11 Nimbus -HTF" must also resolve as "GIUP 11" / "GIUP11" / "GIUP 011"
        // Safe: first-writer wins, so real GIUP #N items (with SKU) take precedence.
        numVariants(num[1], num[2] || '').forEach(p => {
          set.add(`GIUP ${p}`)
          set.add(`GIUP${p}`)
        })
      }
    }

    // ── Series+# prefix: "PMA #1 Champagne Blizzard" → "PMA 1", "PMA 01", "PMA1", "PMA01" ──
    const seriesMatch = stripped.match(/^([A-Z]+)\s*#\s*(\d+[A-Z]?)\b/i)
    if (seriesMatch) {
      const s = seriesMatch[1].toUpperCase()
      const n = seriesMatch[2]
      const numM = n.match(/^(\d+)([A-Z]?)$/)
      const nums = numM ? numVariants(numM[1], numM[2] || '') : [n]
      nums.forEach(p => { set.add(`${s} ${p}`); set.add(`${s}${p}`) })
      // also keep the # form itself: "PMA #1"
      set.add(`${s} #${n}`)
    }

    // ── Embedded #CODE: "New York Party #NYP01" → "NYP 01", "NYP01" ─────────
    const embeddedMatch = stripped.match(/#([A-Z]+)(\d+[A-Z]?)\b/i)
    if (embeddedMatch) {
      const s = embeddedMatch[1].toUpperCase()
      const n = embeddedMatch[2]
      const numM = n.match(/^(\d+)([A-Z]?)$/)
      const nums = numM ? numVariants(numM[1], numM[2] || '') : [n]
      nums.forEach(p => { set.add(`${s} ${p}`); set.add(`${s}${p}`) })
      set.add(`${s}#${n}`)  // also keep "NYP#01" form
    }

    // ── Letter+digit prefix (no #): "MT01 SPOT MY TOP", "NW01 SPOT MY TOP",
    // "FAN01 -HTF" → "MT01", "MT1", "MT 01" etc.
    // Portal uses "GIUP MT1", "GIUP NW2" etc.; these get added via the
    // second-pass "GIUP {key}" step after the full map is built.
    const alphaNumMatch = stripped.match(/^([A-Z]{2,5})(\d{1,3}[A-Z]?)(?:\s|$)/i)
    if (alphaNumMatch) {
      const s = alphaNumMatch[1].toUpperCase()
      const n = alphaNumMatch[2].toUpperCase()
      const numM = n.match(/^(\d+)([A-Z]?)$/)
      const nums = numM ? numVariants(numM[1], numM[2] || '') : [n]
      nums.forEach(p => { set.add(`${s}${p}`); set.add(`${s} ${p}`) })
    }

    // ── GEL.IT.UP R-series: "GEL.IT.UP 1 R01 11ML -HTF" → "R01", "R1", "R 01"
    // Portal uses "GIUP R01" etc.; GIUP aliases added via second pass.
    const gelitupMatch = stripped.match(/^GEL\.IT\.UP\s+\d+\s+([A-Z]+)(\d+[A-Z]?)\s/i)
    if (gelitupMatch) {
      const s = gelitupMatch[1].toUpperCase()
      const n = gelitupMatch[2].toUpperCase()
      const numM = n.match(/^(\d+)([A-Z]?)$/)
      const nums = numM ? numVariants(numM[1], numM[2] || '') : [n]
      nums.forEach(p => { set.add(`${s}${p}`); set.add(`${s} ${p}`) })
    }

    return Array.from(set)
  }

  // Build SKU → item_id map (only items that have a SKU).
  // Each item is indexed under ALL its aliases so the portal's short catalog
  // codes (e.g. "01") resolve to the same item_id as the full Zoho SKU
  // (e.g. "01 Ice Ice Baby -HTF") — the full name never surfaces to clients.
  const itemMap = {}
  const noSku = []

  for (const item of items) {
    const sku = (item.sku || '').trim()
    // For items with no SKU, fall back to the item name so that HTF products
    // (whose SKU field is blank in Zoho) are still indexed by their name.
    const keySource = sku || (item.name || '').trim()
    if (!keySource) {
      noSku.push(item.item_id)
      continue
    }
    if (!sku) {
      noSku.push(item.name || item.item_id)
    }
    for (const key of aliases(keySource)) {
      if (key && !(key in itemMap)) {
        itemMap[key] = item.item_id
      }
    }
  }

  if (verbose && noSku.length) {
    console.log(`\nItems without SKU (${noSku.length}):`)
    noSku.forEach((n) => console.log(`  - ${n}`))
  } else if (noSku.length) {
    console.log(`Items without SKU: ${noSku.length} (run --verbose to list them)`)
  }

  // ── GIUP-prefix second pass ────────────────────────────────────────────────
  // The B2B portal prefixes all product image-map codes with "GIUP ".
  // For every short-code key already in the map (no spaces, no existing GIUP
  // prefix), also register "GIUP {key}" so that portal SKUs like "GIUP N004",
  // "GIUP FAN01", "GIUP MT1" resolve automatically. First-writer wins, so any
  // real Zoho SKU that already starts with "GIUP" is never overwritten.
  const snapshotKeys = Object.keys(itemMap)
  for (const k of snapshotKeys) {
    if (k.startsWith('GIUP')) continue   // skip keys already prefixed
    if (k.includes(' ')) continue        // skip full descriptive names
    const prefixed = `GIUP ${k}`
    if (!(prefixed in itemMap)) itemMap[prefixed] = itemMap[k]
  }

  // ── Static portal-code aliases ─────────────────────────────────────────────
  // Portal codes in product-image-map.json whose short-hand doesn't follow any
  // systematic naming convention. Map them explicitly to their Zoho item key.
  const PORTAL_STATIC_ALIASES = {
    'SATMAT': 'SATIN MATT RS TOP 15 ML',   // Satin Matt RS top coat
    'WOTC':   'WIPE OFF TOP',               // Wipe-Off Top Coat (11ml)
    'NWT':    'NON WIPE TOP COAT 11ML',     // Non-Wipe Top Coat 11ml
    'FFF':    'FFF WHITE YEARS AHEAD',      // Gel polish FFF White Years Ahead
    'SB':     'GIUPSB',                     // Superbond — Zoho SKU is "GIUPSB"
  }
  let staticHits = 0
  for (const [code, target] of Object.entries(PORTAL_STATIC_ALIASES)) {
    const itemId = itemMap[normSku(target)] ?? itemMap[target]
    if (!itemId) {
      console.warn(`  ! Static alias "${code}" → "${target}": target key not found in map — skipping`)
      continue
    }
    for (const alias of [code, `GIUP ${code}`]) {
      if (!(alias in itemMap)) { itemMap[alias] = itemId; staticHits++ }
    }
  }
  if (staticHits) console.log(`Static portal aliases added: ${staticHits}`)

  // ── Extended portal-code aliases (mirrors App.jsx aliasGroups) ───────────────
  // Every short-hand code from the B2B portal's product-image-map that can't be
  // derived automatically from the Zoho item name via aliases(). Mirrors the
  // aliasGroups array in App.jsx so both price display AND Zoho sync resolve.
  const PORTAL_EXTENDED_ALIASES = [
    // Flexi Base
    { codes: ['FBCLR', 'GIUP FBCLR', 'GIUP-FBCLR'], target: 'Flexi Base Clear -HTF' },
    // 5-in-1 Superior Base coloured variants
    { codes: ['GIUP SBCCLR', 'GIUP-SBCCLR', 'SBCCLR'], target: '5-in-1 Superior Base 15ml Clear -HTF' },
    { codes: ['GIUP SBCMP', 'GIUP-SBCMP', 'SBCMP'], target: '5-in-1 Superior Base 15ml Milky Pink -HTF' },
    { codes: ['GIUP SBCPP', 'GIUP-SBCPP', 'SBCPP'], target: '5-in-1 Superior Base 15ml Pretty Pink -HTF' },
    { codes: ['GIUP SBCBP', 'GIUP-SBCBP', 'SBCBP'], target: '5-in-1 Superior Base 15ml Baby Pink -HTF' },
    { codes: ['GIUP SBCCP', 'GIUP-SBCCP', 'SBCCP'], target: '5-in-1 Superior Base 15ml Candy Pink -HTF' },
    { codes: ['GIUP SBCSP', 'GIUP-SBCSP', 'SBCSP'], target: '5-in-1 Superior Base 15ml Sweet Pink -HTF' },
    { codes: ['GIUP SBCGLPI', 'GIUP-SBCGLPI', 'SBCGLPI'], target: '5-IN-1 Superior Base 15ml Glittery Pink -HTF' },
    { codes: ['GIUP SBCGP', 'GIUP-SBCGP', 'SBCGP'], target: '5-in-1 Superior Base 15ml Glittery Peach -HTF' },
    { codes: ['GIUP SBCIRPI', 'GIUP-SBCIRPI', 'SBCIRPI'], target: '5-IN-1 Superior Base 15ml Irridecent Pink -HTF' },
    { codes: ['GIUP SBCIMF', 'GIUP-SBCIMF', 'SBCIMF'], target: '5-in-1 Superior Base 15ml Iridescent Milky Flakes -HTF' },
    { codes: ['GIUP SBCCLI', 'GIUP-SBCCLI', 'SBCCLI'], target: '5-in-1 Superior Base 15ml Lilac -HTF' },
    { codes: ['GIUP SBCMW', 'GIUP-SBCMW', 'SBCMW'], target: '5-in-1 Superior Base 15ml Milky White -HTF' },
    { codes: ['GIUP SBCN', 'GIUP-SBCN', 'SBCN'], target: '5-in-1 Superior Base 15ml Nude -HTF' },
    { codes: ['GIUP SBCSN', 'GIUP-SBCSN', 'SBCSN'], target: '5-IN-1 Superior Base 15ml Soft Nude -HTF' },
    // Non-Wipe Top Coats 15ml
    { codes: ['NWMT15'], target: 'Non Wipe Top Coat Milky 15ml -HTF' },
    { codes: ['NWPT15', 'NWPT15-1', 'NWPT15 1'], target: 'Non Wipe Top Coat Perfect Shape 15ml -HTF' },
    // Superbond variations
    { codes: ['GIUP-SB-NO-ACID', 'GIUP SB NO ACID', 'SB NO ACID'], target: 'Superbond Nail Dehydrator 11ml - Acid Free -HTF' },
    { codes: ['GIUP-SB-WITH-ACID', 'GIUP SB WITH ACID', 'SB WITH ACID'], target: 'Superbond Nail Dehydrator 11ml - with Acid -HTF' },
    { codes: ['GIUP SB', 'GIUP-SB'], target: 'Superbond Nail Dehydrator 11ml - Acid Free -HTF' },
    { codes: ['SB AC', 'SB-AC'], target: 'Superbond Nail Dehydrator 11ml - with Acid -HTF' },
    // FFF
    { codes: ['GIUP FFF', 'GIUP-FFF', 'GIUP 01 FFF', 'GIUP-01-FFF', 'FFF'], target: 'FFF White Years Ahead -HTF' },
    // Dual Forms
    { codes: ['ALMOND', 'DUAL FORMS ALMOND'], target: 'DUAL FORMS ALMOND' },
    { codes: ['BALLERINA', 'DUAL FORMS BALLERINA'], target: 'DUAL FORMS BALLERINA' },
    { codes: ['LONG ALMOND', 'DUAL FORMS LONG ALMOND'], target: 'DUAL FORMS LONG ALMOND' },
    { codes: ['MODERNS SQUARE', 'MODERN SQUARE', 'DUAL FORMS MODERN SQUARE'], target: 'DUAL FORMS MODERN SQUARE' },
    { codes: ['RUSSIAN ALMOND', 'DUAL FORMS RUSSIAN ALMOND'], target: 'DUAL FORMS RUSSIAN ALMOND' },
    { codes: ['SQUARE', 'DUAL FORMS SQUARE', 'Fual Forms SQUARE', 'FUAL FORMS SQUARE'], target: 'DUAL FORMS SQUARE' },
    { codes: ['SQUOVAL', 'DUAL FORMS SQUOVAL'], target: 'DUAL FORMS SQUOVAL' },
    { codes: ['STANDARD', 'DUAL FORMS STANDARD'], target: 'Standard Dual Reverse Tips 120 s' },
    { codes: ['DUAL MIX', 'DUAL MIX 2', 'DUAL MIX 3'], target: 'DUAL FORMS MIX COLOR AND SHAPE' },
    { codes: ['SQUARE XL', 'DUAL FORM SQUARE XL'], target: 'DUAL FORMS SQUARE' },
    { codes: ['SOAK OFF GEL TIPS LONG ALMOND', 'G.T.LONG ALMOND', 'GT LONG ALMOND'], target: 'SOAK OFF GEL TIPS LONG ALMOND' },
    { codes: ['SOAK OFF GEL TIPS LONG COFFIN', 'G.T.LONG COFFIN', 'GT LONG COFFIN', 'Dual Forms LONG COFFIN', 'DUAL FORMS LONG COFFIN'], target: 'SOAK OFF GEL TIPS LONG COFFIN' },
    { codes: ['SOAK OFF GEL TIPS MEDIUM SQUARE', 'G.T.MEDIUM SQUARE', 'GT MEDIUM SQUARE', 'Dual Forms MEDIUM SQUARE', 'DUAL FORMS MEDIUM SQUARE'], target: 'SOAK OFF GEL TIPS MEDIUM SQUARE' },
    { codes: ['SOAK OFF GEL TIPS SHORT ALMOND', 'G.T.SHORT ALMOND', 'GT SHORT ALMOND', 'SHORT ALMOND'], target: 'SOAK OFF GEL TIPS SHORT ALMOND' },
    // Super Flexible Tips
    { codes: ['FLEXI LONG ALMOND', 'FLEXI-LONG-ALMOND', 'SUPER FLEXI LONG ALMOND', 'GIUP FLEXI LONG ALMOND'], target: 'FLEXI Soak Off Nail Tips Long Almond -2025' },
    { codes: ['FLEXI SHORT ALMOND', 'FLEXI-SHORT-ALMOND', 'SUPER FLEXI SHORT ALMOND', 'GIUP FLEXI SHORT ALMOND'], target: 'FLEXI Soak Off Nail Tips Short Almond -2025' },
    { codes: ['FLEXI SHORT SQUARE', 'FLEXI-SHORT-SQUARE', 'SUPER FLEXI SHORT SQUARE', 'GIUP FLEXI SHORT SQUARE'], target: 'FLEXI Soak Off Nail Tips Medium Square -2025' },
    // Nail Files
    { codes: ['1280X1280 NAIL BUFER 100', '1280X1280_NAIL_BUFER_100', 'NAIL FILES WITH BACK GLUE 100 PACKET OF 10'], target: 'Nail Files With Back Glue 100 Packet of 10' },
    { codes: ['1280X1280 NAIL BUFER 120', '1280X1280_NAIL_BUFER_120', 'NAIL FILES WITH BACK GLUE 120 PACKET OF 10'], target: 'Nail Files With Back Glue 120 Packet of 10' },
    { codes: ['1280X1280 NAIL BUFER 180', '1280X1280_NAIL_BUFER_180', 'NAIL FILES WITH BACK GLUE 180 PACKET OF 10'], target: 'Nail Files With Back Glue 180 Packet of 10' },
    { codes: ['1280X1280 NAIL BUFER METALLIC', '1280X1280_NAIL_BUFER_METALLIC', 'BOAT SHAPE METALLIC NAIL BASE', 'BOAT-SHAPE-METALLIC-NAIL-BASE'], target: 'GIUP Boat Shape metallic Nail File' },
    { codes: ['1280X1280 BUFFER 100 120', '1280X1280_BUFFER_100_120', '100 120 FILE2', '100_120_FILE2', 'NAIL FILES BUFFER 100 180 PURPLE SPONGE', 'NAIL FILES BUFFER 100-180 PURPLE SPONGE'], target: 'GIUP Boat Shape Nail File 100/120 Purple Sponge' },
    { codes: ['1280X1280 BUFFER 180 180', '1280X1280_BUFFER_180_180', '180 180 FILE2', '180_180_FILE2', 'NAIL FILES BUFFER 180 180 PINK SPONGE', 'NAIL FILES BUFFER 180-180 PINK SPONGE'], target: 'Nail Files 180/180 Pink Sponge' },
    { codes: ['BUFFING BLOCK', 'NAIL FILE 100 1001', 'NAIL-FILE 100-1001'], target: 'Nail Files 100/100' },
    // Nail Forms
    { codes: ['NAIL_FORMS_5', 'NAIL FORMS 5', 'NAIL FORMS'], target: 'GEL.IT.UP by GIUP\u00ae Nail Forms' },
    // Mirror Powders
    { codes: ['MIRROR CLEAR', 'SP 8001', 'SP8001'], target: 'SP8001 Mirror Clear Powder' },
    { codes: ['MIRROR X1', 'TR 1', 'TR1'], target: 'TR01 Mirror X1 Powder' },
    { codes: ['MIRROR X2', 'TR 2', 'TR2'], target: 'TR02 Mirror X2 Powder' },
    { codes: ['MIRROR X3', 'TR 3', 'TR3'], target: 'TR03 Mirror X3 Powder' },
    { codes: ['MIRROR X4', 'TR 4', 'TR4'], target: 'TR04 Mirror X4 Powder' },
    { codes: ['MIRROR X5', 'TR 5', 'TR5'], target: 'TR05 Mirror X5 Powder' },
    { codes: ['MIRROR X6', 'TR 6', 'TR6'], target: 'TR06 Mirror X6 Powder' },
    // 3-in-1 Builder Gel
    { codes: ['3 IN 1 CLEAR', '3IN1CLEAR'], target: '3-in-1 Builder Gel Clear 40g -HTF' },
    { codes: ['3IN1COVER'], target: '3-in-1 Builder Gel Cover 40g -HTF' },
    { codes: ['3IN1PINK'], target: '3-in-1 Builder Gel Pink 40g -HTF' },
    { codes: ['3 IN 1 SHIMMER COVER'], target: '3-in-1 Shimmery Builder Gel 40g Cover -HTF' },
    { codes: ['3 IN 1 SHIMMER IRIDESCENT CLEAR'], target: '3-in-1 Shimmery Builder Gel 40g Clear Iridescent -HTF' },
    { codes: ['3 IN 1 SHIMMER LIGHT LILAC'], target: '3-in-1 Shimmery Builder Gel 40g Light Lilac -HTF' },
    { codes: ['3 IN 1 MARMALADE SHIMMER PINK'], target: '3-in-1 Shimmery Builder Gel 40g Pink Marmalade -HTF' },
    // Premium Builder Gel
    { codes: ['3 IN 1 PREMIUM CLEAR', '3IN 1 PREMIUM CLEAR'], target: 'Premium Builder Gel Clear 40gr -HTF' },
    { codes: ['3IN 1 PREMIUM BUILDER GEL COVER', '3 IN 1 PREMIUM BUILDER GEL COVER'], target: 'Premium Builder Gel Cover 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GEL BLUSH'], target: 'Premium Builder Gel Blush 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GEL MILKY'], target: 'Premium Builder Gel Milky 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GEL NUDE'], target: 'Premium Builder Gel Nude 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GEL PEARLY NUDE'], target: 'Premium Builder Gel Pearly Nude 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GEL PEARLY PINK'], target: 'Premium Builder Gel Pearly Pink 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GELS PINK'], target: 'Premium Builder Gel Pink 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM BUILDER GELS WHITE'], target: 'Premium Builder Gel White 40gr -HTF' },
    { codes: ['3 IN 1 PREMIUM PLUS', '3 IN 1.PREMIUM.PLUS'], target: 'Premium Plus Fiber Glass Builder Gel 40gr -HTF' },
    // Brush on Builder (BOB)
    { codes: ['GIUP BOBCLR', 'GIUP-BOBCLR', 'BOBCLR'], target: 'Brush on Builder Gel Clear 15ml -HTF' },
    { codes: ['GIUP BOBCOV', 'GIUP-BOBCOV', 'BOBCOV'], target: 'Brush on Builder Gel Cover 15ml -HTF' },
    { codes: ['GIUP BOBPNK', 'GIUP-BOBPNK', 'BOBPNK'], target: 'Brush on Builder Gel Pink 15ml -HTF' },
    { codes: ['GIUP BOBCRM', 'GIUP-BOBCRM', 'BOBCRM'], target: 'Brush on Builder Gel Creamy 15ml -HTF' },
    { codes: ['GIUP BOBNUD', 'GIUP-BOBNUD', 'BOBNUD'], target: 'Brush on Builder Gel Nude 15ml -HTF' },
    { codes: ['GIUP BOBPRL', 'GIUP-BOBPRL', 'BOBPRL'], target: 'Brush on Builder Gel Purple 15ml -HTF' },
    { codes: ['GIUP BOBDS', 'GIUP-BOBDS', 'BOBDS'], target: 'Brush on Builder Gel Dusty Shimmer 15ml -HTF' },
    { codes: ['GIUP BOBMILK', 'GIUP-BOBMILK', 'BOBMILK'], target: 'Brush on Builder Gel Milky 15ml -HTF' },
    { codes: ['GIUP BOBLIL', 'GIUP-BOBLIL', 'BOBLIL'], target: 'Brush on Builder Gel Lilac 15ml -HTF' },
    { codes: ['GIUP BOBBLPN', 'GIUP-BOBBLPN', 'BOBBLPN'], target: 'Brush on Builder Gel Blush Pink 15ml -HTF' },
    { codes: ['GIUP BOBSTPN', 'GIUP-BOBSTPN', 'BOBSTPN'], target: 'Brush on Builder Gel Soft Pink 15ml -HTF' },
    { codes: ['GIUP BOBGLPN', 'GIUP-BOBGLPN', 'BOBGLPN'], target: 'Brush on Builder Gel Glittery Pink 15ml -HTF' },
    { codes: ['GIUP BOBGLMG', 'GIUP-BOBGLMG', 'BOBGLMG'], target: 'Brush on Builder Gel Magenta Glitter 15ml -HTF' },
    { codes: ['GIUP BOBPURGL', 'GIUP-BOBPURGL', 'BOBPURGL'], target: 'Brush on Builder Gel Milky Glitter 15ml -HTF' },
    { codes: ['GIUP BOBGLROS', 'GIUP-BOBGLROS', 'BOBGLROS'], target: 'Brush on Builder Gel Rose Glitter 15ml -HTF' },
    { codes: ['GIUP BOBGLSLM', 'GIUP-BOBGLSLM', 'BOBGLSLM'], target: 'Brush on Builder Gel Salmon Glitter 15ml -HTF' },
    // MultiMix Synthogel 30g
    { codes: ['MULTIMIX BABY BLUE COLOR'], target: 'MultiMix Synthogel 30gr Baby Blue -HTF' },
    { codes: ['MULTIMIX BABY PINK GLITTER COLOR'], target: 'MultiMix Synthogel 30gr Baby Pink Glitter -HTF' },
    { codes: ['MULTIMIX BLUE GLITTER COLOR'], target: 'MultiMix Synthogel 30g Blue Glitter -HTF' },
    { codes: ['MULTIMIX BUBBLE GUM GLITTER COLOR'], target: 'MultiMix Synthogel 30gr Bubble Gum Glitter -HTF' },
    { codes: ['MULTIMIX GLITSY GREEN COLOR'], target: 'MultiMix Synthogel 30gr Glitsy Green -HTF' },
    { codes: ['MULTIMIX LIGHT NUDE COLOR'], target: 'Multimix Synthogel 30g Light Nude -HTF' },
    { codes: ['MULTIMIX MINT GREEN COLOR'], target: 'MultiMix Synthogel 30gr Minty Green -HTF' },
    { codes: ['MULTIMIX PINKIII COLOR'], target: 'MultiMix Synthogel 30gr Pink III -HTF' },
    { codes: ['MULTIMIX SUPER SOFT PINK COLOR'], target: 'MultiMix Synthogel 30gr Super Soft Pink -HTF' },
    // MultiMix Synthogel 60g
    { codes: ['MULTIMIX BLACK COLOR'], target: 'MultiMix Synthogel 60gr Black -HTF' },
    { codes: ['MULTIMIX CLEAR COLOR'], target: 'MultiMix Synthogel 60gr Clear -HTF' },
    { codes: ['MULTIMIX COVER COLOR'], target: 'MultiMix Synthogel 60gr Cover -HTF' },
    { codes: ['MULTIMIX COVER II COLOR'], target: 'MultiMix Synthogel 60gr Cover II -HTF' },
    { codes: ['MULTIMIX CRYSTAL CLEAR COLOR'], target: 'MultiMix Synthogel 60gr Crystal Clear -HTF' },
    { codes: ['MULTIMIX GLITTERPINK COLOR'], target: 'MultiMix Synthogel 60gr Glitter Pink -HTF' },
    { codes: ['MULTIMIX GLITTERS CLEAR'], target: 'MultiMix Synthogel 60gr Clear Glitter -HTF' },
    { codes: ['MULTIMIX GLITTERS GOLD'], target: 'MultiMix Synthogel 60gr Glitter Gold -HTF' },
    { codes: ['MULTIMIX GLITTERS NUDE'], target: 'MultiMix Synthogel 60gr Glitter Nude -HTF' },
    { codes: ['MULTIMIX GLITTERS PINK'], target: 'MultiMix Synthogel 60gr Glitter Pink -HTF' },
    { codes: ['MULTIMIX GLITTERS WHITE'], target: 'MultiMix Synthogel 60gr Glitter White -HTF' },
    { codes: ['MULTIMIX LIGHT PINK COLOR'], target: 'MultiMix Synthogel 60gr Light Pink -HTF' },
    { codes: ['MULTIMIX LILAC COLOR'], target: 'MultiMix Synthogel 60gr Light Lilac -HTF' },
    { codes: ['MULTIMIX MILKY WHITE COLOR'], target: 'MultiMix Synthogel 60gr Milky White -HTF' },
    { codes: ['MULTIMIX NUDE COLOR'], target: 'MultiMix Synthogel 60gr Nude -HTF' },
    { codes: ['MULTIMIX PINK COLOR'], target: 'MultiMix Synthogel 60gr Pink -HTF' },
    { codes: ['MULTIMIX PINK II COLOR'], target: 'MultiMix Synthogel 60gr Pink II -HTF' },
    { codes: ['MULTIMIX SUPER MILKY COLOR'], target: 'MultiMix Synthogel 60gr Super Milky -HTF' },
    { codes: ['MULTIMIX WHITE COLOR'], target: 'MultiMix Synthogel 60gr White -HTF' },
    // Cleanser & Sanitizer
    { codes: ['CLEANSER'], target: 'Cleanser 200 ml -HTF' },
    { codes: ['SANITIZER'], target: 'Sanitizer 200ml -HTF' },
    // Cuticle Oils
    { codes: ['CUTICLE OIL PEACH', 'WHITE SATIN CUTICLE OIL PEACH'], target: 'Perky Peach Cuticle Oil 100ml -HTF' },
    { codes: ['CUTICLE OIL MELON', 'WHITE SATIN CUTICLE OIL MELON'], target: 'Chilled Melon Cuticle Oil 100ml -HTF' },
    { codes: ['CUTICLE OIL COCONUT', 'WHITE SATIN CUTICLE OIL COCONUT OIL'], target: 'Cooling Coconut Cuticle Oil 100ml -HTF' },
    { codes: ['PHOTO PERFECT CUTICLE OIL', 'PHOTO_PERFECT_CUTICLE_OIL'], target: 'PhotoPerfect Cuticle Oil New' },
    // Foot Creams & Scrubs
    { codes: ['FOOT CREAM 100 CALMFROST'], target: 'GEL IT UP FOOT CREAM 100ml CALM FROST NEW' },
    { codes: ['FOOT CREAM 100 SASSYSASSY'], target: 'GEL IT UP FOOT CREAM 100ml SASSY SASSY NEW' },
    { codes: ['FOOT CREAM 100 SILKYBLISS'], target: 'GEL IT UP FOOT CREAM 100ml SILKY BLISS NEW' },
    { codes: ['FOOT CREAM 1000 CALMFROST'], target: 'GEL IT UP FOOT CREAM 1000ml CALM FROST NEW' },
    { codes: ['FOOT CREAM 1000 SASSYSASSY'], target: 'GEL IT UP FOOT CREAM 1000ml SASSY SASSY NEW' },
    { codes: ['FOOT CREAM 1000 SILKYBLISS'], target: 'GEL IT UP FOOT CREAM 1000ml SILKY BLISS NEW' },
    { codes: ['HANDANDBODY CREAM 100 CALMFROST'], target: 'GEL IT UP HAND AND BODY CREAM 100ml CALM FROST NEW' },
    { codes: ['HANDANDBODY CREAM 100 SASSYSASSY'], target: 'GEL IT UP HAND AND BODY CREAM 100ml SASSY SASSY NEW' },
    { codes: ['HANDANDBODY CREAM 100 SILKYBLISS'], target: 'GEL IT UP HAND AND BODY CREAM 100ml SILKY BLISS NEW' },
    { codes: ['HANDANDBODY CREAM 1000 CALMFROST'], target: 'GEL IT UP HAND AND BODY CREAM 1000ml CALM FROST NEW' },
    { codes: ['HANDANDBODY CREAM 1000 SASSYSASSY'], target: 'GEL IT UP HAND AND BODY CREAM 1000ml SASSY SASSY NEW' },
    { codes: ['HANDANDBODY CREAM 1000 SILKYBLISS'], target: 'GEL IT UP HAND AND BODY CREAM 1000ml SILKY BLISS NEW' },
    { codes: ['SCRUB 200 CALMFROST'], target: 'GEL IT UP SCRUB 200ml CALM FROST NEW' },
    { codes: ['SCRUB 200 SASSYSASSY'], target: 'GEL IT UP SCRUB 200ml SASSY SASSY NEW' },
    { codes: ['SCRUB 200 SILKYBLISS'], target: 'GEL IT UP SCRUB 200ml SILKY BLISS NEW' },
    { codes: ['SCRUB 750 CALMFROST'], target: 'GEL IT UP SCRUB 750ml CALM FROST NEW' },
    { codes: ['SCRUB 750 SASSYSASSY'], target: 'GEL IT UP SCRUB 750ml SASSY SASSY NEW' },
    { codes: ['SCRUB 750 SILKYBLISS'], target: 'GEL IT UP SCRUB 750ml SILKY BLISS NEW' },
    // Line It Up
    { codes: ['LINE IT UP 0001 YELLOW'], target: 'LINE IT UP YELLOW -HTF' },
    { codes: ['LINE IT UP 0002 WHITE'], target: 'LINE IT UP WHITE -HTF' },
    { codes: ['LINE IT UP 0003 SKY'], target: 'LINE IT UP SKY -HTF' },
    { codes: ['LINE IT UP 0004 SILVER'], target: 'LINE IT UP SILVER -HTF' },
    { codes: ['LINE IT UP 0005 ROSE'], target: 'LINE IT UP ROSE -HTF' },
    { codes: ['LINE IT UP 0006 RED'], target: 'LINE IT UP RED -HTF' },
    { codes: ['LINE IT UP 0007 PYRITE'], target: 'LINE IT UP PYRITE -HTF' },
    { codes: ['LINE IT UP 0008 PISTACHIO'], target: 'LINE IT UP PISTACHIO -HTF' },
    { codes: ['LINE IT UP 0009 PINK'], target: 'LINE IT UP PINK -HTF' },
    { codes: ['LINE IT UP 0010 ORANGE'], target: 'LINE IT UP ORANGE -HTF' },
    { codes: ['LINE IT UP 0011 MINT'], target: 'LINE IT UP MINT -HTF' },
    { codes: ['LINE IT UP 0012 MAGENTA'], target: 'LINE IT UP MAGENTA -HTF' },
    { codes: ['LINE IT UP 0013 LILAC'], target: 'LINE IT UP LILAC -HTF' },
    { codes: ['LINE IT UP 0014 LAVENDER'], target: 'LINE IT UP LAVENDER -HTF' },
    { codes: ['LINE IT UP 0015 GREEN'], target: 'LINE IT UP GREEN -HTF' },
    { codes: ['LINE IT UP 0016 GOLD'], target: 'LINE IT UP GOLD -HTF' },
    { codes: ['LINE IT UP 0017 BLACK'], target: 'LINE IT UP BLACK -HTF' },
    { codes: ['LINE IT UP 0018 APRICOT'], target: 'LINE IT UP APRICOT -HTF' },
    // Nail Art
    { codes: ['GIUP-.BLOSSOM', 'GIUP .BLOSSOM', 'BLOSSOM'], target: 'Blossom Flower Power 15ml -HTF' },
    { codes: ['WATER COLORS', 'WATER_COLORS'], target: 'Watercolors Aquarelle Pallete' },
    { codes: ['AQUARELLE BRUSH', 'AQUARELLE_BRUSH'], target: 'Aquarela Brush Rose Gold' },
    { codes: ['FRENCH CURVED BRUSH', 'FRENCH_CURVED_BRUSH'], target: 'French Nail Brush Rose Gold' },
    // Acrylic & Gel Brushes
    { codes: ['ACRYLIC BRUSH NO10', 'ACRYLIC BRUSH NO 10'], target: '#10 Acrylic Application Brush Rose Gold' },
    { codes: ['ACRYLIC BRUSH NO12', 'ACRYLIC BRUSH NO 12'], target: '#12 Acrylic Brush Rose Gold' },
    { codes: ['GEL BRUSH NO6', 'GEL BRUSH NO 6'], target: '#6 Gel Brush Rose Gold' },
    { codes: ['GEL BRUSH NO8', 'GEL BRUSH NO 8', 'ACRYLIC BRUSH NO8', 'ACRYLIC BRUSH NO 8'], target: '#8 Gel Brush Rose Gold' },
    // Polygel & Synthogel accessories
    { codes: ['POLYGEL', 'SYNTHOGEL BRUSH', 'SYNTHOGEL_BRUSH'], target: 'Polygel Brush and Spatula Rose Gold' },
    { codes: ['POLYGEL 2'], target: 'Polygel 2 Brush and Spatula Rose Gold' },
    // Equipment
    { codes: ['DUST COLLECTOR', 'DUST COLLECTOR 2', 'NAILDUSTER 1', 'NAILDUSTER_1'], target: 'Wireless Nail Dust Collector New' },
    { codes: ['PORTABLE LAMP'], target: 'White Nail Lamp New' },
    { codes: ['AIRBRUSH 1', 'AIRBRUSH_1'], target: 'AirBrush Machine New' },
    { codes: ['STAMP LAMP'], target: 'Stamp Lamp' },
    // Acrylic Liquids
    { codes: ['NEW LOGO ACRYLIC LIQUID CLASSIC 500ML', 'NEW_LOGO_ACRYLIC_LIQUID_CLASSIC_500ML'], target: 'Acrylic Classic Liquid 500ml -HTF' },
    { codes: ['NEW LOGO ACRYLIC LIQUID COMPETE 500ML 1', 'NEW_LOGO_ACRYLIC_LIQUID_COMPETE_500ML-1'], target: 'Acrylic Compete Liquid 500ml -HTF' },
    { codes: ['CLEAR'], target: 'Acrylic Compete Powder Clear 35g -HTF' },
    // Podocare & Accessories
    { codes: ['PODODISC'], target: 'Pododisc + 5 Replacement Stickers M-20 mm New' },
    { codes: ['PROBES'], target: 'Probes Stainless Steel Rounded 1222 New' },
    { codes: ['TWEEZER', 'TWEEZER B', 'TWEEZER_B'], target: 'Splinter tweezer \u2014 13 cm 1386 New' },
    // Tools \u2014 Head Cutters & Corner Nippers
    { codes: ['01. HEAD CUTTER, PLAIN HANDLE, HALF BLADE', '01. HEAD CUTTER, PLAIN HANDLE, HALF BLADE B', '01. HEAD CUTTER, PLAIN HANDLE, HALF BLADE_B'], target: 'Professional Head Cutter Nipper Half Blade L 11.5cm 1006 New' },
    { codes: ['02. CORNER NIPPER, EXTRA SLIM (FLAME SHAPED)', '02. CORNER NIPPER, EXTRA SLIM (Flame Shaped)'], target: 'Corner Nippers Flame Shaped L 10cm 1115 New' },
    { codes: ['03. CORNER NIPPER, DESIGN HANDLE'], target: 'Corner Nippers Straight Cutter Design Handle  L 11cm 1119 New' },
    // Tools \u2014 Cuticle Pushers
    { codes: ['01. CUTICLE PUSHER, DOUBLE ACTION, ROUNDED', '01 CUTICLE PUSHER DOUBLE ACTION ROUNDED'], target: 'Professional Cuticle Pusher- Double Action, Rounded 2042 New' },
    { codes: ['02. CUTICLE PUSHER, DOUBLE ACTION', '02 CUTICLE PUSHER DOUBLE ACTION'], target: 'Professional Cuticle Pusher- Double Action 2044 New' },
    // Tools \u2014 Cuticle Scissors
    { codes: ['01. CUTICLE SCISSOR, CURVED 10,5 19', '01. CUTICLE SCISSOR, CURVED 10,5 19 B', '01. CUTICLE SCISSOR, CURVED 10,5-19', '01 CUTICLE SCISSOR CURVED 10 5 19'], target: 'Professional Cuticle Scissors, Curved 1466 New' },
    { codes: ['03. CUTICLE SCISSOR, CURVED 10 18', '03. CUTICLE SCISSOR, CURVED 10 18 B', '03. CUTICLE SCISSOR, CURVED 10-18', '03 CUTICLE SCISSOR CURVED 10 18'], target: 'Professional Cuticle Scissors, Curved 1463 New' },
    { codes: ['04. CUTICLE SPRING SCISSOR, CURVED', '04. CUTICLE SPRING SCISSOR, CURVED B', '04. CUTICLE SPRING SCISSOR, CURVED_B', '04 CUTICLE SPRING SCISSOR CURVED'], target: 'Professional Spring Scissors, Curved 1468 New' },
    // Tools \u2014 Cuticle Nippers
    { codes: ['04. CUTICLE NIPPER, OVAL FINE CUT', '04. CUTICLE NIPPER, OVAL FINE CUT B', '04. CUTICLE NIPPER, OVAL FINE CUT_B', '04 CUTICLE NIPPER OVAL FINE CUT'], target: 'Professional Premium Cuticle Nipper, Oval Fine Cut \u2013 5mm 2119 New' },
    { codes: ['05. CUTICLE NIPPER, OVAL ROUND FINE CUT', '05. CUTICLE NIPPER, OVAL ROUND FINE CUT B', '05. CUTICLE NIPPER, OVAL ROUND FINE CUT_B', '05 CUTICLE NIPPER OVAL ROUND FINE CUT'], target: 'Professional Premium Cuticle Nipper, Oval Round Fine Cut \u2013 5mm 2120 New' },
    { codes: ['06. CUTICLE NIPPER, FINE CUT', '06. CUTICLE NIPPER, FINE CUT B', '06. CUTICLE NIPPER, FINE CUT_B', '06 CUTICLE NIPPER FINE CUT'], target: 'Professional Premium Cuticle Nipper, Fine Cut \u2013 5mm 2117 New' },
    // Tools \u2014 Podocare
    { codes: ['COMER'], target: 'Corner File Straight & Curved Stainless Steel 1289 New' },
    // Nail Preparations
    { codes: ['CUTICLE REMOVER 5ML'], target: 'Almond Cuticle Scrub Remover 5ml -HTF' },
    { codes: ['WHITE SATIN CUTICLE SCRUB REMOVER', 'WHITE_SATIN_CUTICLE_SCRUB_REMOVER'], target: 'Almond Cuticle Scrub Remover 100ml -HTF' },
    // Stickers
    { codes: ['5D NAIL STICKERS BLACK'], target: 'SD-1934 Nail Decals French - Black' },
    { codes: ['5D NAIL STICKERS WHITE'], target: 'SD-1933 Nail Decals French - White' },
    // Top Coats
    { codes: ['GIUP MT1', 'GIUP-MT1'], target: 'MT01 Spot my top -HTF' },
    { codes: ['GIUP MT2', 'GIUP-MT2', 'GIUP MT2 1', 'GIUP-MT2-1'], target: 'MT02 Spot my top -HTF' },
    { codes: ['GIUP MT6', 'GIUP-MT6'], target: 'MT06 Spot my top -HTF' },
    { codes: ['GIUP NW1', 'GIUP-NW1'], target: 'NW01 Spot my top -HTF' },
    { codes: ['GIUP NW2', 'GIUP-NW2'], target: 'NW02 Sopt my top -HTF' },
    { codes: ['GIUP NW3', 'GIUP-NW3'], target: 'NW03 Spot my top -HTF' },
    { codes: ['GIUP NWT', 'GIUP-NWT'], target: 'Non Wipe Top Coat 15ml -HTF' },
    { codes: ['GIUP SATMAT', 'GIUP-SATMAT'], target: 'Satin Matt RS Top 15 ml -HTF' },
    { codes: ['GIUP WOTC', 'GIUP-WOTC'], target: 'Wipe Off Top Coat 15 ml' },
    { codes: ['FAN12', 'GIUP FAN12', 'GIUP-FAN12'], target: 'Super Fan Top Coat 11ml FAN12 -HTF' },
    // Consumables
    { codes: ['APRON'], target: 'Apron Black With Logo' },
    { codes: ['NAILSTICKS CLEAR SCALED 1', 'NAILSTICKS_CLEAR-SCALED-1'], target: 'Nail sticks clear with ring' },
    { codes: ['CUSHION SPONGE', 'CUSHION SPONGE 2'], target: 'Ombre sponge' },
    // Marble Inks
    { codes: ['MARBLE 1'], target: 'Marble-It by GIUP #01' },
    { codes: ['MARBLE 2'], target: 'Marble-It by GIUP #02' },
    { codes: ['MARBLE 3'], target: 'Marble-It by GIUP #03' },
    { codes: ['MARBLE 4'], target: 'Marble-It by GIUP #04' },
    { codes: ['MARBLE 5'], target: 'Marble-It by GIUP #05' },
    { codes: ['MARBLE 6'], target: 'Marble-It by GIUP #06' },
    { codes: ['MARBLE 7'], target: 'Marble-It by GIUP #07' },
    { codes: ['MARBLE 8'], target: 'Marble-It by GIUP #08' },
    { codes: ['MARBLE 9'], target: 'Marble-It by GIUP #09' },
    { codes: ['MARBLE 10'], target: 'Marble-It by GIUP #10' },
    { codes: ['MARBLE 11'], target: 'Marble-It by GIUP #11' },
    { codes: ['MARBLE 12'], target: 'Marble-It by GIUP #12' },
    { codes: ['MARBLE 13'], target: 'Marble-It by GIUP #13' },
    { codes: ['MARBLE 14'], target: 'Marble-It by GIUP #14' },
    { codes: ['MARBLE 15'], target: 'Marble-It by GIUP #15' },
    { codes: ['MARBLE 16'], target: 'Marble-It by GIUP #16' },
    { codes: ['MARBLE 17'], target: 'Marble-It by GIUP #17' },
    { codes: ['MARBLE 18'], target: 'Marble-It by GIUP #18' },
    // Sugary Glitter
    { codes: ['SUGARY GLITTER 01'], target: 'Sugary Glitter pigment 3gr 01 -HTF' },
    { codes: ['SUGARY GLITTER 02'], target: 'Sugary Glitter pigment 3gr 02 -HTF' },
    { codes: ['SUGARY GLITTER 03'], target: 'Sugary Glitter pigment 3gr 03 -HTF' },
    { codes: ['SUGARY GLITTER 04'], target: 'Sugary Glitter pigment 3gr 04 -HTF' },
    { codes: ['SUGARY GLITTER 05'], target: 'Sugary Glitter pigment 3gr 05 -HTF' },
    { codes: ['SUGARY GLITTER 06'], target: 'Sugary Glitter pigment 3gr 06 -HTF' },
    { codes: ['SUGARY GLITTER 07'], target: 'Sugary Glitter pigment 3gr 07 -HTF' },
    // Brushes
    { codes: ['SKINNY LINER 5 7', 'SKINNY LINER 5-7', 'SKINNY LINER NO5', 'SKINNY LINER NO 5'], target: 'Skinny Liner Brush 5-7' },
    { codes: ['SKINNY LINER 9 11', 'SKINNY LINER 9-11', 'SKINNY LINER NO9', 'SKINNY LINER NO 9'], target: 'Skinny Liner Brush 9-11' },
    // Nail Wipes
    { codes: ['NAIL WIPES', 'NAIL WIPES 1000', 'NAIL WIPES 1000S'], target: 'Nail Wipes 1000s' },
    // Cobweb Gel
    { codes: ['COBWEB BLACK', 'COBWEB GEL BLACK'], target: 'Cobweb Gel Black -HTF' },
    { codes: ['COBWEB WHITE', 'COBWEB GEL WHITE'], target: 'Cobweb Gel White -HTF' },
    // FLEXI Tips (2025 line — Zoho stores with 'LL' prefix and singular 'TIP')
    { codes: ['FLEXI SOAK OFF NAIL TIPS LONG ALMOND -2025', 'FLEXI SOAK OFF NAIL TIP LONG ALMOND -2025', 'FLEXI LONG ALMOND -2025'], target: 'LLFlexi Soak Off Nail Tip Long Almond -2025' },
    // Natural nail sticks
    { codes: ['NATURAL NAIL STICKS', 'NATURAL NAIL STICKS WITH RING', 'NAIL STICKS NATURAL'], target: 'Nail Sticks Natural with Ring' },
  ]
  let extendedHits = 0
  for (const { codes, target } of PORTAL_EXTENDED_ALIASES) {
    const normTarget = normSku(target)
    const strippedTarget = normSku(stripVariant(target))
    const itemId = itemMap[normTarget] ?? itemMap[strippedTarget] ?? null
    if (!itemId) {
      if (verbose) console.warn(`  ! Extended alias target not found: "${target}"`)
      continue
    }
    for (const c of codes) {
      const normC = normSku(c)
      if (normC && !(normC in itemMap)) { itemMap[normC] = itemId; extendedHits++ }
      // Also add GIUP-prefixed form for portal codes that don't already start with GIUP
      if (!normC.startsWith('GIUP')) {
        const giupC = `GIUP ${normC}`
        if (!(giupC in itemMap)) { itemMap[giupC] = itemId; extendedHits++ }
      }
    }
  }
  if (extendedHits) console.log(`Extended portal aliases added: ${extendedHits}`)

  checkCoverage(itemMap)

  const prettyJson = JSON.stringify(itemMap, null, 2)
  const oneLineJson = JSON.stringify(itemMap)

  if (outputFile) {
    const outPath = resolve(process.cwd(), outputFile)
    writeFileSync(outPath, prettyJson + '\n')
    console.log(`\nSaved to: ${outPath}`)
    console.log(`Mapped SKUs: ${Object.keys(itemMap).length}`)
    console.log('\nSet as Supabase secret:')
    console.log(`  supabase secrets set ZOHO_BOOKS_ITEM_MAP_JSON='${oneLineJson}'`)
  } else {
    console.log('\n── ZOHO_BOOKS_ITEM_MAP_JSON ─────────────────────────────────────────────────')
    console.log(oneLineJson)
    console.log('─────────────────────────────────────────────────────────────────────────────')
    console.log(`Mapped SKUs: ${Object.keys(itemMap).length}`)
    console.log('\nTo set as Supabase secret, run:')
    console.log(`  supabase secrets set ZOHO_BOOKS_ITEM_MAP_JSON='<paste above JSON>'`)
    console.log('\nOr save to file first:')
    console.log('  node scripts/fetch-zoho-item-map.mjs --output zoho-item-map.json')
  }
}

main().catch((err) => {
  console.error('\nFatal error:', err.message)
  process.exit(1)
})
