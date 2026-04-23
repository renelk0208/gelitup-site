import { readFileSync } from 'fs'
const pl = JSON.parse(readFileSync('./public/gelitup-content/b2b-price-list.json', 'utf8'))
const items = pl.items

function normalizeSkuCode(v) { return String(v||'').trim().toUpperCase().replace(/\s+/g,' ') }
function normalizeProductName(v) {
  return normalizeSkuCode(v).replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi,' ')
    .replace(/[^A-Z0-9]+/g,' ').replace(/\s+/g,' ').trim()
}

// Simulate CheckoutPage map building
const map = new Map()
const stripSuffix = (s) => String(s||'').replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i,'').trim()
const isMultimix30g = (n) => /multimix/i.test(n) && /\b30\s*g/i.test(n)
const B2B = 1.5

for (const { name, sku, price } of items) {
  const cleanName = stripSuffix(name)
  const surcharge = isMultimix30g(name) ? 1.1 : 1
  const entry = { price: price != null ? Math.ceil(Number(price) * B2B * surcharge * 10) / 10 : null }
  const keys = [normalizeSkuCode(sku), normalizeSkuCode(stripSuffix(sku)), normalizeProductName(name), normalizeProductName(cleanName)]
  const norm = normalizeSkuCode(cleanName)
  const m = norm.match(/^([A-Z]*\d+[A-Z]?)\b/) || norm.match(/\b([A-Z]{2,5}\d{1,3}[A-Z]?)\b/)
  if (m) { keys.push(m[1]); keys.push('GIUP ' + m[1]) }
  for (const k of keys) { if (k && !map.has(k)) map.set(k, entry) }
}

// Simulate aliasGroups from PRODUCT_ALIAS_GROUPS (subset for testing)
const ALIAS_GROUPS = [
  { codes: ['GIUP BOBCLR', 'GIUP-BOBCLR'], target: 'Brush on Builder Gel Clear 15ml -HTF' },
  { codes: ['GIUP VCE01', 'GIUP VCE 01', 'VCE01', 'VCE 01', 'VCE1'], target: 'Velvet Cat Eye #VCE01 -HTF' },
  { codes: ['SH1','SH 1','GIUP SH1'], target: 'Shimmer Collection #SH1 -HTF' },
  { codes: ['SH01','SH 01','GIUP SH01'], target: 'Shimmer Collection #SH1 -HTF' },
  { codes: ['GIUP SH07','SH07','SH 07'], target: 'Shimmer Collection #SH07 -HTF' },
  { codes: ['GIUP PMA1','PMA1','PMA 1','PMA01'], target: 'PMA #1 Champagne Blizzard -HTF' },
  { codes: ['GIUP FAN01','FAN01','FAN 01'], target: 'FAN01 -HTF' },
  { codes: ['GIUP SCE01','SCE01','SCE 01','SCE1'], target: 'Sapphire Cat Eye #SCE01 -HTF' },
  { codes: ['GIUP N001','N001','N 001'], target: 'N001 Geisha Girl -HTF' },
  { codes: ['LINE IT UP 0001 YELLOW', 'LINE IT UP  0001 YELLOW'], target: 'LINE IT UP YELLOW -HTF' },
]

const pnLookupCo = t => map.get(normalizeProductName(t)) || map.get(normalizeSkuCode(t))
for (const { codes, target } of ALIAS_GROUPS) {
  const entry = pnLookupCo(target)
  if (entry) { for (const c of codes) { if (!map.has(c)) map.set(c, entry) } }
  else console.log('ALIAS TARGET NOT FOUND:', target, '->', normalizeProductName(target))
}

// Test lookups
function lookupPrice(itemName, itemCode) {
  const byName = map.get(normalizeProductName(itemName))
  if (byName?.price != null) return { found: 'byName', val: byName.price }
  const byCode = map.get(normalizeSkuCode(itemCode))
  if (byCode?.price != null) return { found: 'byCode', val: byCode.price }
  const stripped = normalizeSkuCode(itemCode).replace(/^GIUP[-\s]+/, '')
  if (stripped !== normalizeSkuCode(itemCode)) {
    const e = map.get(stripped)
    if (e?.price != null) return { found: 'byStripped', val: e.price }
  }
  const byFullName = map.get(normalizeSkuCode(itemName))
  if (byFullName?.price != null) return { found: 'byFullName', val: byFullName.price }
  const stripped2 = normalizeSkuCode(itemCode).replace(/([A-Z]+)0+(\d)$/, '$1$2')
  if (stripped2 !== normalizeSkuCode(itemCode)) {
    const e = map.get(stripped2)
    if (e?.price != null) return { found: 'byStripped2', val: e.price }
  }
  return null
}

const tests = [
  ['GIUP BOBCLR', 'BOBCLR', 'BOB alias (byFullName)'],
  ['GIUP VCE 01', 'VCE 01', 'VCE with space (byFullName or byCode)'],
  ['SH01', 'SH01', 'SH zero-padded (byCode alias SH01)'],
  ['SH07', 'SH07', 'SH07 zero-padded suffix (shortCode or alias)'],
  ['GIUP PMA1', 'PMA1', 'PMA (alias)'],
  ['GIUP FAN01', 'FAN01', 'FAN (shortCode in checkout)'],
  ['SCE01', 'SCE01', 'SCE (alias or shortCode)'],
  ['GIUP N001', 'N001', 'N-series (alias or shortCode)'],
  ['LINE IT UP 0001 YELLOW', 'UP 0001', 'Line-It-Up (byFullName alias)'],
]
for (const [name, code, desc] of tests) {
  const r = lookupPrice(name, code)
  console.log((r ? '✓' : '✗'), desc, '->', r ? r.found + ':' + r.val : 'FAIL')
}
