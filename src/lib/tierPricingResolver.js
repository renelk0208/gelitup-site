// ─── Shared tier-pricing resolution logic ────────────────────────────────────────────────
// This module is the SINGLE source of truth for turning an order item's stored
// name/SKU (which can be a full canonical product name, a short SKU code like
// "mc5"/"giup-01", or a loose internal code like "multimix_blue_glitter_color")
// into a normalized set of lookup keys, and for building a lookup Map from the
// tier pricing spreadsheet (src/data/tierPricingOverrides.json) keyed the same way.
//
// It is imported by:
//   - src/pages/AdminDashboard.jsx (live order pricing in the admin UI/exports)
//   - scripts/audit-tier-pricing-coverage.mjs (a standalone, re-runnable audit
//     that checks EVERY catalog product resolves correctly for every tier)
//
// Keeping this logic in one plain (non-JSX) module — instead of duplicated
// copies — is what prevents the two from drifting out of sync, which is what
// caused tier prices to silently fall back to B2B pricing for some products
// and some order-item formats in the past.

export function normalizeAdminSkuToken(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

export function normalizeAdminNameToken(value) {
  return normalizeAdminSkuToken(value)
    .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildBrushOnBuilderBiabAlias(value) {
  const normalized = normalizeAdminNameToken(value)
    .replace(/\b15ML\b/g, ' ')
    .replace(/\bHTF\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const match = normalized.match(/^BRUSH ON BUILDER GEL (.+)$/)
  if (!match) return ''

  return `BRUSH ON BUILDER BIAB ${match[1].trim()}`
}

export function extractOrderItemSkuToken(value = '') {
  const text = String(value || '').trim()
  if (!text) return ''
  const normalized = normalizeAdminSkuToken(text)

  const giupMatch = normalized.match(/\bGIUP[-\s]*[A-Z0-9]+(?:[-\s]*[A-Z0-9]+)*\b/)
  if (giupMatch) return normalizeAdminSkuToken(giupMatch[0].replace(/-/g, ' '))

  const seriesMatch = normalized.match(/\b([A-Z]{2,6})\s*(\d{1,4}[A-Z]?)\b/)
  if (seriesMatch) return `${seriesMatch[1]} ${seriesMatch[2]}`

  const numericMatch = normalized.match(/^\d{1,4}[A-Z]?$/)
  if (numericMatch) return numericMatch[0]

  return ''
}

// Strips measurement units, variant suffixes and filler descriptor words from a price-list
// product name to produce a shorter "content key" that can match loosely-stored order item
// names (e.g. "Sugary Glitter pigment 3gr 01 -HTF" → "SUGARY GLITTER 01").
export function simplifyProductNameForIndex(name) {
  const upper = normalizeAdminSkuToken(name)
  return upper
    .replace(/\s*-?\s*(HTF|HTE|HEMA[- ]FREE|NEW|-2025|2025)\s*$/i, '') // strip variant suffix
    .replace(/\b\d+\s*(ML|GR|G|MG|KG|L|S)\b/g, '')                     // strip measurements (100ml, 30gr, 1000s)
    .replace(/\b(BRUSH|SPATULA|PIGMENT|SYNTHOGEL|SYNTHOLIQUID|AND|OF|COLOR|COLOUR)\b/g, '') // strip filler words
    .replace(/-/g, ' ')       // normalize dashes (9-11 → 9 11)
    .replace(/\s+/g, ' ')
    .trim()
}

// Generates every alias key a product NAME can be looked up under — short SKU
// codes, GIUP-prefixed codes, embedded series tokens (e.g. "MC5", "SH07"),
// simplified/loose names, etc. Shared by the B2B price-list lookup map and the
// tier pricing sheet lookup map so both resolve order items stored as bare
// codes (e.g. "giup-01", "mc5") the same way.
export function buildNameAliasKeys(name) {
  const keys = new Set()
  const addKey = (k) => { if (k) keys.add(k) }

  addKey(normalizeAdminSkuToken(name))
  addKey(normalizeAdminNameToken(name))

  // The tier pricing spreadsheet has ~30 BUILDER SYSTEMS rows where the
  // category label got glued directly into the product name with no space
  // (e.g. "Premium BUILDER SYSTEMSClear 40gr -HTF" instead of the normal
  // "Premium Builder Gel Clear 40gr -HTF" wording). Index the corrected
  // wording too so order items using the normal "Builder Gel" naming still
  // resolve to this entry. This only adds extra lookup keys — the stored
  // product text/price is never altered.
  //
  // Handles both corruption shapes:
  //   - glued, no space:  "...SYSTEMSClear..."  → "...GEL Clear..."
  //   - plural, has space: "...SYSTEMSs Cosmic..." → "...GELS Cosmic..."
  // by inspecting the single character immediately following "SYSTEMS": only
  // treat it as the plural marker when it's a literal lowercase "s" — a
  // capital letter (e.g. the "S" that starts "Salmon") is the next word and
  // must be preserved, not swallowed as pluralization.
  const deGluedName = String(name || '').replace(/BUILDER SYSTEMS(.?)/gi, (_match, nextChar) => (
    nextChar === 's' ? 'BUILDER GELS ' : `BUILDER GEL ${nextChar || ''}`
  ))
  if (deGluedName !== name) {
    addKey(normalizeAdminSkuToken(deGluedName))
    addKey(normalizeAdminNameToken(deGluedName))
  }

  const bobBiabAlias = buildBrushOnBuilderBiabAlias(name)
  if (bobBiabAlias) {
    addKey(bobBiabAlias)
    addKey(`${bobBiabAlias} 1`)
  }

  const numberPrefix = String(name || '').trim().match(/^(\d+[A-Z]?)\s/)
  if (numberPrefix) {
    const n = numberPrefix[1]
    addKey(normalizeAdminSkuToken(n))
    addKey(normalizeAdminSkuToken(n.replace(/^0+(\d)/, '$1')))
    addKey(normalizeAdminSkuToken(n.padStart(2, '0')))
    addKey(normalizeAdminSkuToken(`GIUP ${n}`))
    addKey(normalizeAdminSkuToken(`GIUP ${n.replace(/^0+(\d)/, '$1')}`))
    addKey(normalizeAdminSkuToken(`GIUP ${n.padStart(2, '0')}`))
  }

  // Index embedded alphanumeric series tokens so GIUP-prefixed order SKUs
  // like "GIUP C01" or "GIUP ODA01" resolve from names containing #C01/#ODA01.
  const embeddedSeriesMatches = [...normalizeAdminSkuToken(name).matchAll(/\b([A-Z]{1,5})(\d{1,4}[A-Z]?)\b/g)]
  for (const match of embeddedSeriesMatches) {
    const series = match[1]
    const num = match[2]
    const compact = `${series}${num}`
    const spaced = `${series} ${num}`
    addKey(normalizeAdminSkuToken(compact))
    addKey(normalizeAdminSkuToken(spaced))
    addKey(normalizeAdminSkuToken(`GIUP ${compact}`))
    addKey(normalizeAdminSkuToken(`GIUP ${spaced}`))
  }

  // Also index by the extracted short SKU token from the full product name.
  // This allows order items stored as "SH07" or "STF 01" to match price list
  // entries like "Shimmer Collection #SH07 -HTF" or "Shimmer Top Fairy #STF 01 -HTF".
  const shortToken = extractOrderItemSkuToken(name)
  if (shortToken) {
    addKey(shortToken)
    // Also add compact (no-space) variant so "SH07" and "SH 07" both hit the same entry
    const compact = normalizeAdminSkuToken(shortToken.replace(/\s+/g, ''))
    if (compact !== shortToken) addKey(compact)
  }

  // Also index by "WORD NUMBER" prefix for products like "Polygel 2 Brush and Spatula..."
  // so that order items stored as "POLYGEL 2" can find the price.
  const wordNumPrefix = normalizeAdminSkuToken(name).match(/^([A-Z][A-Z0-9]{1,})\s+(\d{1,4})\b/)
  if (wordNumPrefix) {
    addKey(`${wordNumPrefix[1]} ${wordNumPrefix[2]}`)
  }

  // ── Simplified-name indexing for loose-name matching ───────────────────────────────
  const simplified = simplifyProductNameForIndex(name)
  if (simplified && simplified !== normalizeAdminSkuToken(name)) {
    addKey(simplified)

    // For names starting with a single-letter + 3-4 digit code (e.g. "N008 If The Shoe...")
    // also index under just that short code so "GIUP N008" → strip GIUP → "N008" hits it.
    const nSeriesMatch = simplified.match(/^([A-Z]\d{3,4})\b/)
    if (nSeriesMatch) addKey(nSeriesMatch[1])

    // For names with a leading product code (SP8001, TR01, CM12 etc.) also add the name
    // without the code so "SP8001 Mirror Clear Powder" → "MIRROR CLEAR" is findable.
    const withoutLeadingCode = simplified.replace(/^[A-Z]{1,4}\d{3,5}\s*/, '').trim()
    if (withoutLeadingCode && withoutLeadingCode !== simplified) addKey(withoutLeadingCode)
  }

  // ── Cuticle oil word-reorder ─────────────────────────────────────────────────────────
  // Price list: "Cooling Coconut Cuticle Oil 100ml" → stored as "cuticle oil coconut".
  // Extract the flavor noun and index as "CUTICLE OIL [FLAVOR]".
  if (simplified && simplified.includes('CUTICLE') && simplified.includes('OIL')) {
    const flavorWord = simplified
      .replace(/\bCUTICLE\b/g, '').replace(/\bOIL\b/g, '')
      .replace(/\b(COOLING|CHILLED|PERKY|SATIN|WHITE|RICH)\b/g, '')
      .replace(/\s+/g, ' ').trim()
    if (flavorWord) addKey(`CUTICLE OIL ${flavorWord}`)
  }

  return [...keys]
}

// Builds a lookup Map from an array of { product, ...tier fields } entries
// (the shape of tierPricingOverrides.json), keyed by every alias each
// product's name can be looked up under, plus every alternate code from the
// shared PRODUCT_ALIAS_GROUPS table.
export function buildTierPricingLookup(entries = [], aliasGroups = []) {
  const map = new Map()
  const setIfMissing = (key, entry) => {
    if (!key || map.has(key)) return
    map.set(key, entry)
  }

  for (const entry of entries) {
    const product = entry?.product
    if (!product) continue
    for (const key of buildNameAliasKeys(product)) {
      setIfMissing(key, entry)
    }
  }

  for (const { codes, target } of aliasGroups) {
    const targetEntry = map.get(normalizeAdminSkuToken(target)) ||
                         map.get(normalizeAdminNameToken(target))
    if (!targetEntry) continue
    for (const c of codes) {
      setIfMissing(normalizeAdminSkuToken(c), targetEntry)
    }
  }

  return map
}

// Builds the ordered, de-duplicated list of every key an order item's stored
// { name, sku } might be looked up under — used to query BOTH the tier
// pricing lookup and the plain B2B price-list lookup with identical logic,
// so neither one silently resolves a product the other one wouldn't find.
export function buildItemCandidateKeys(item) {
  const sku = normalizeAdminSkuToken(item?.sku)
  const name = String(item?.name || '').trim()
  const nameNorm = normalizeAdminSkuToken(name)
  const nameToken = normalizeAdminNameToken(name)
  const extractedSkuFromName = extractOrderItemSkuToken(name)
  const extractedSkuFromSku = extractOrderItemSkuToken(sku)
  const skuWithoutCampaignPrefix = sku.replace(/^\d{4}[-\s]*NEW[-\s]*/i, '').trim()
  const simplifiedName = simplifyProductNameForIndex(name)

  const candidates = [
    sku,
    nameNorm,
    extractedSkuFromSku,
    extractedSkuFromName,
    skuWithoutCampaignPrefix,
    nameToken,
    // Some stored colour-series SKUs are saved as "GIUP-COL-01"; strip the
    // series label so they can fall through to the numeric shade key ("01").
    sku.replace(/^GIUP[\s-]*(?:COL(?:OR|OUR)?)[\s-]*/i, '').trim(),
    // Strip GIUP prefix from SKU: "GIUP 01" → "01", "GIUP N008" → "N008", "GIUP 8E" → "8E"
    sku.replace(/^GIUP\s*/i, '').trim(),
    nameNorm.replace(/^GIUP[\s-]*(?:COL(?:OR|OUR)?)[\s-]*/i, '').trim(),
    // Simplified version of name: strips measurements, filler words, normalizes dashes
    simplifiedName,
    // Strip 3–5 digit shade numbers from name: "LINE IT UP 0002 WHITE" → "LINE IT UP WHITE"
    nameNorm.replace(/\b\d{3,5}\b/g, '').replace(/\s+/g, ' ').trim(),
    // Strip duplicate suffixes from display names: "... SKY SPRINKLE (1)" → "... SKY SPRINKLE"
    nameNorm.replace(/\s+\d+$/, '').trim(),
  ].filter(Boolean)

  const seen = new Set()
  const uniqueCandidates = candidates.filter(c => { if (seen.has(c)) return false; seen.add(c); return true })

  const compactSkuMatch = sku.match(/^([A-Z]{2,6})\s*(\d{1,4}[A-Z]?)$/)
  const compactSkuKey = compactSkuMatch ? `${compactSkuMatch[1]} ${compactSkuMatch[2]}` : null
  if (compactSkuKey && !seen.has(compactSkuKey)) uniqueCandidates.push(compactSkuKey)

  return uniqueCandidates
}

// Resolves an order item's tier price directly against a tier pricing lookup
// Map (as built by buildTierPricingLookup). Returns the matched sheet entry,
// or null if no candidate key matches.
export function resolveTierEntryForItem(item, tierPricingLookup) {
  for (const key of buildItemCandidateKeys(item)) {
    const entry = tierPricingLookup.get(key)
    if (entry) return entry
  }
  return null
}
