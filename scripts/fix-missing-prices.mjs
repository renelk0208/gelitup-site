import { readFileSync, writeFileSync } from 'fs'

let src = readFileSync('./src/App.jsx', 'utf8')
// Normalize to LF so template-literal searches work regardless of file EOL
const hasCRLF = src.includes('\r\n')
src = src.replace(/\r\n/g, '\n')

// =========================================
// 1. ADD NEW ENTRIES TO FullCataloguePage aliasGroups
// =========================================
const fcNewEntries = `
          // Shimmer Collection SH07-SH12 (zero-padded suffix in price list)
          { codes: ['GIUP SH07', 'SH07', 'SH 07'], target: 'Shimmer Collection #SH07 -HTF' },
          { codes: ['GIUP SH08', 'SH08', 'SH 08'], target: 'Shimmer Collection #SH08 -HTF' },
          { codes: ['GIUP SH09', 'SH09', 'SH 09'], target: 'Shimmer Collection #SH09 -HTF' },
          { codes: ['GIUP SH10', 'SH10', 'SH 10'], target: 'Shimmer Collection #SH10 -HTF' },
          { codes: ['GIUP SH11', 'SH11', 'SH 11'], target: 'Shimmer Collection #SH11 -HTF' },
          { codes: ['GIUP SH12', 'SH12', 'SH 12'], target: 'Shimmer Collection #SH12 -HTF' },
          // Sapphire Cat Eye (SCE series)
          { codes: ['GIUP SCE01', 'SCE01', 'SCE 01', 'SCE1'], target: 'Sapphire Cat Eye #SCE01 -HTF' },
          { codes: ['GIUP SCE02', 'SCE02', 'SCE 02', 'SCE2'], target: 'Sapphire Cat Eye #SCE02 -HTF' },
          { codes: ['GIUP SCE03', 'SCE03', 'SCE 03', 'SCE3'], target: 'Sapphire Cat Eye #SCE03 -HTF' },
          { codes: ['GIUP SCE04', 'SCE04', 'SCE 04', 'SCE4'], target: 'Sapphire Cat Eye #SCE04 -HTF' },
          // PMA Pop Art collection
          { codes: ['GIUP PMA1', 'PMA1', 'PMA 1', 'PMA01', 'PMA 01'], target: 'PMA #1 Champagne Blizzard -HTF' },
          { codes: ['GIUP PMA2', 'PMA2', 'PMA 2', 'PMA02', 'PMA 02'], target: 'PMA #2 Cosmic Confection -HTF' },
          { codes: ['GIUP PMA3', 'PMA3', 'PMA 3', 'PMA03', 'PMA 03'], target: 'PMA #3 Pop Dot Drama -HTF' },
          { codes: ['GIUP PMA4', 'PMA4', 'PMA 4', 'PMA04', 'PMA 04'], target: 'PMA #4 Kapow -HTF' },
          { codes: ['GIUP PMA5', 'PMA5', 'PMA 5', 'PMA05', 'PMA 05'], target: 'PMA #5 Comic Strip Crimson -HTF' },
          { codes: ['GIUP PMA6', 'PMA6', 'PMA 6', 'PMA06', 'PMA 06'], target: 'PMA #6 Pop Popsicle Pink -HTF' },
          { codes: ['GIUP PMA7', 'PMA7', 'PMA 7', 'PMA07', 'PMA 07'], target: 'PMA #7 Blasted Blue -HTF' },
          { codes: ['GIUP PMA8', 'PMA8', 'PMA 8', 'PMA08', 'PMA 08'], target: 'PMA #8 Vibrant Vector Violet -HTF' },
          // FAN gel art collection
          { codes: ['GIUP FAN01', 'FAN01', 'FAN 01'], target: 'FAN01 -HTF' },
          { codes: ['GIUP FAN02', 'FAN02', 'FAN 02'], target: 'FAN02 -HTF' },
          { codes: ['GIUP FAN03', 'FAN03', 'FAN 03'], target: 'FAN03 -HTF' },
          { codes: ['GIUP FAN04', 'FAN04', 'FAN 04'], target: 'FAN04 -HTF' },
          { codes: ['GIUP FAN05', 'FAN05', 'FAN 05'], target: 'FAN05 -HTF' },
          { codes: ['GIUP FAN06', 'FAN06', 'FAN 06'], target: 'FAN06 -HTF' },
          { codes: ['GIUP FAN07', 'FAN07', 'FAN 07'], target: 'FAN07 -HTF' },
          { codes: ['GIUP FAN08', 'FAN08', 'FAN 08'], target: 'FAN08 -HTF' },
          { codes: ['GIUP FAN09', 'FAN09', 'FAN 09'], target: 'FAN09 -HTF' },
          { codes: ['GIUP FAN10', 'FAN10', 'FAN 10'], target: 'FAN10 -HTF' },
          { codes: ['GIUP FAN11', 'FAN11', 'FAN 11'], target: 'FAN11 -HTF' },
          { codes: ['GIUP FAN13', 'FAN13', 'FAN 13'], target: 'FAN13 -HTF' },
          // N-series neutral shades
          { codes: ['GIUP N001', 'N001', 'N 001'], target: 'N001 Geisha Girl -HTF' },
          { codes: ['GIUP N002', 'N002', 'N 002'], target: 'N002 Cashmere -HTF' },
          { codes: ['GIUP N003', 'N003', 'N 003'], target: 'N003 Porcelain -HTF' },
          { codes: ['GIUP N004', 'N004', 'N 004'], target: 'N004 Spun Sugar -HTF' },
          { codes: ['GIUP N005', 'N005', 'N 005'], target: 'N005 Burberry Blush -HTF' },
          { codes: ['GIUP N006', 'N006', 'N 006'], target: 'N006 Chanterel -HTF' },
          { codes: ['GIUP N007', 'N007', 'N 007'], target: 'N007 Naked Beauty -HTF' },
          { codes: ['GIUP N008', 'N008', 'N 008'], target: 'N008 If The Shoe Fits -HTF' },
          { codes: ['GIUP N009', 'N009', 'N 009'], target: 'N009 Blushing Bride -HTF' },
          { codes: ['GIUP N010', 'N010', 'N 010'], target: 'N010 Frappelicious -HTF' },
          { codes: ['GIUP N011', 'N011', 'N 011'], target: 'N011 Berry Me Softly -HTF' },
          { codes: ['GIUP N012', 'N012', 'N 012'], target: 'N012 Fluffy Blue Sky -HTF' },
          { codes: ['GIUP N013', 'N013', 'N 013'], target: 'N013 Antique -HTF' },
          { codes: ['GIUP N014', 'N014', 'N 014'], target: 'N014 Sugarcane -HTF' },
          { codes: ['GIUP N015', 'N015', 'N 015'], target: 'N015 Celestial -HTF' },
          { codes: ['GIUP N016', 'N016', 'N 016'], target: 'N016 Wild Card -HTF' },
          { codes: ['GIUP N017', 'N017', 'N 017'], target: 'N017 Pale Petal -HTF' },
          { codes: ['GIUP N018', 'N018', 'N 018'], target: 'N018 Chic -HTF' },
          { codes: ['GIUP N019', 'N019', 'N 019'], target: 'N019 Luxe Linen -HTF' },
          { codes: ['GIUP N020', 'N020', 'N 020'], target: 'N020 Beige Bliss -HTF' },
          { codes: ['GIUP N021', 'N021', 'N 021'], target: 'N021 Soft Mocha -HTF' },
          { codes: ['GIUP N022', 'N022', 'N 022'], target: 'N022 Blushing Buff -HTF' },
          { codes: ['GIUP N023', 'N023', 'N 023'], target: 'N023 Princess Diaries -HTF' },
          { codes: ['GIUP N024', 'N024', 'N 024'], target: 'N024 New Porn Pink -HTF' },
          { codes: ['GIUP N025', 'N025', 'N 025'], target: 'N025 Latte Mouse -HTF' },
          { codes: ['GIUP N026', 'N026', 'N 026'], target: 'N026 Whispering Blush -HTF' },`

const fcOldTail = `          { codes: ['cushion sponge', 'cushion sponge 2', 'CUSHION SPONGE'], target: 'Ombre sponge' },
        ]
        for (const { codes, target } of aliasGroups) {`

const fcNewTail = `          { codes: ['cushion sponge', 'cushion sponge 2', 'CUSHION SPONGE'], target: 'Ombre sponge' },` + fcNewEntries + `
        ]
        for (const { codes, target } of aliasGroups) {`

if (!src.includes(fcOldTail)) { console.error('ERROR: fcOldTail not found'); process.exit(1) }
src = src.replace(fcOldTail, fcNewTail)
console.log('Step 1: FullCataloguePage aliases added ✓')

// =========================================
// 2. INSERT PRODUCT_ALIAS_GROUPS MODULE-LEVEL CONSTANT
//    (Contains the comprehensive ProductsModule aliasGroups + new series entries)
//    Added before function DistributorPackagesPage()
// =========================================

// The new series entries to append to PRODUCT_ALIAS_GROUPS (same as above but also includes SH01-06 zero-padded variants)
const moduleNewEntries = `
  // Shimmer Collection SH07-SH12
  { codes: ['GIUP SH07', 'SH07', 'SH 07'], target: 'Shimmer Collection #SH07 -HTF' },
  { codes: ['GIUP SH08', 'SH08', 'SH 08'], target: 'Shimmer Collection #SH08 -HTF' },
  { codes: ['GIUP SH09', 'SH09', 'SH 09'], target: 'Shimmer Collection #SH09 -HTF' },
  { codes: ['GIUP SH10', 'SH10', 'SH 10'], target: 'Shimmer Collection #SH10 -HTF' },
  { codes: ['GIUP SH11', 'SH11', 'SH 11'], target: 'Shimmer Collection #SH11 -HTF' },
  { codes: ['GIUP SH12', 'SH12', 'SH 12'], target: 'Shimmer Collection #SH12 -HTF' },
  // Shimmer Collection SH1-6: also map zero-padded variants (SH01 → SH1)
  { codes: ['SH01', 'SH 01', 'GIUP SH01'], target: 'Shimmer Collection #SH1 -HTF' },
  { codes: ['SH02', 'SH 02', 'GIUP SH02'], target: 'Shimmer Collection #SH2 -HTF' },
  { codes: ['SH03', 'SH 03', 'GIUP SH03'], target: 'Shimmer Collection #SH3 -HTF' },
  { codes: ['SH04', 'SH 04', 'GIUP SH04'], target: 'Shimmer Collection #SH4 -HTF' },
  { codes: ['SH05', 'SH 05', 'GIUP SH05'], target: 'Shimmer Collection #SH5 -HTF' },
  { codes: ['SH06', 'SH 06', 'GIUP SH06'], target: 'Shimmer Collection #SH6 -HTF' },
  // Sapphire Cat Eye (SCE series)
  { codes: ['GIUP SCE01', 'SCE01', 'SCE 01', 'SCE1'], target: 'Sapphire Cat Eye #SCE01 -HTF' },
  { codes: ['GIUP SCE02', 'SCE02', 'SCE 02', 'SCE2'], target: 'Sapphire Cat Eye #SCE02 -HTF' },
  { codes: ['GIUP SCE03', 'SCE03', 'SCE 03', 'SCE3'], target: 'Sapphire Cat Eye #SCE03 -HTF' },
  { codes: ['GIUP SCE04', 'SCE04', 'SCE 04', 'SCE4'], target: 'Sapphire Cat Eye #SCE04 -HTF' },
  // PMA Pop Art collection
  { codes: ['GIUP PMA1', 'PMA1', 'PMA 1', 'PMA01', 'PMA 01'], target: 'PMA #1 Champagne Blizzard -HTF' },
  { codes: ['GIUP PMA2', 'PMA2', 'PMA 2', 'PMA02', 'PMA 02'], target: 'PMA #2 Cosmic Confection -HTF' },
  { codes: ['GIUP PMA3', 'PMA3', 'PMA 3', 'PMA03', 'PMA 03'], target: 'PMA #3 Pop Dot Drama -HTF' },
  { codes: ['GIUP PMA4', 'PMA4', 'PMA 4', 'PMA04', 'PMA 04'], target: 'PMA #4 Kapow -HTF' },
  { codes: ['GIUP PMA5', 'PMA5', 'PMA 5', 'PMA05', 'PMA 05'], target: 'PMA #5 Comic Strip Crimson -HTF' },
  { codes: ['GIUP PMA6', 'PMA6', 'PMA 6', 'PMA06', 'PMA 06'], target: 'PMA #6 Pop Popsicle Pink -HTF' },
  { codes: ['GIUP PMA7', 'PMA7', 'PMA 7', 'PMA07', 'PMA 07'], target: 'PMA #7 Blasted Blue -HTF' },
  { codes: ['GIUP PMA8', 'PMA8', 'PMA 8', 'PMA08', 'PMA 08'], target: 'PMA #8 Vibrant Vector Violet -HTF' },
  // FAN gel art collection
  { codes: ['GIUP FAN01', 'FAN01', 'FAN 01'], target: 'FAN01 -HTF' },
  { codes: ['GIUP FAN02', 'FAN02', 'FAN 02'], target: 'FAN02 -HTF' },
  { codes: ['GIUP FAN03', 'FAN03', 'FAN 03'], target: 'FAN03 -HTF' },
  { codes: ['GIUP FAN04', 'FAN04', 'FAN 04'], target: 'FAN04 -HTF' },
  { codes: ['GIUP FAN05', 'FAN05', 'FAN 05'], target: 'FAN05 -HTF' },
  { codes: ['GIUP FAN06', 'FAN06', 'FAN 06'], target: 'FAN06 -HTF' },
  { codes: ['GIUP FAN07', 'FAN07', 'FAN 07'], target: 'FAN07 -HTF' },
  { codes: ['GIUP FAN08', 'FAN08', 'FAN 08'], target: 'FAN08 -HTF' },
  { codes: ['GIUP FAN09', 'FAN09', 'FAN 09'], target: 'FAN09 -HTF' },
  { codes: ['GIUP FAN10', 'FAN10', 'FAN 10'], target: 'FAN10 -HTF' },
  { codes: ['GIUP FAN11', 'FAN11', 'FAN 11'], target: 'FAN11 -HTF' },
  { codes: ['GIUP FAN13', 'FAN13', 'FAN 13'], target: 'FAN13 -HTF' },
  // N-series neutral shades
  { codes: ['GIUP N001', 'N001', 'N 001'], target: 'N001 Geisha Girl -HTF' },
  { codes: ['GIUP N002', 'N002', 'N 002'], target: 'N002 Cashmere -HTF' },
  { codes: ['GIUP N003', 'N003', 'N 003'], target: 'N003 Porcelain -HTF' },
  { codes: ['GIUP N004', 'N004', 'N 004'], target: 'N004 Spun Sugar -HTF' },
  { codes: ['GIUP N005', 'N005', 'N 005'], target: 'N005 Burberry Blush -HTF' },
  { codes: ['GIUP N006', 'N006', 'N 006'], target: 'N006 Chanterel -HTF' },
  { codes: ['GIUP N007', 'N007', 'N 007'], target: 'N007 Naked Beauty -HTF' },
  { codes: ['GIUP N008', 'N008', 'N 008'], target: 'N008 If The Shoe Fits -HTF' },
  { codes: ['GIUP N009', 'N009', 'N 009'], target: 'N009 Blushing Bride -HTF' },
  { codes: ['GIUP N010', 'N010', 'N 010'], target: 'N010 Frappelicious -HTF' },
  { codes: ['GIUP N011', 'N011', 'N 011'], target: 'N011 Berry Me Softly -HTF' },
  { codes: ['GIUP N012', 'N012', 'N 012'], target: 'N012 Fluffy Blue Sky -HTF' },
  { codes: ['GIUP N013', 'N013', 'N 013'], target: 'N013 Antique -HTF' },
  { codes: ['GIUP N014', 'N014', 'N 014'], target: 'N014 Sugarcane -HTF' },
  { codes: ['GIUP N015', 'N015', 'N 015'], target: 'N015 Celestial -HTF' },
  { codes: ['GIUP N016', 'N016', 'N 016'], target: 'N016 Wild Card -HTF' },
  { codes: ['GIUP N017', 'N017', 'N 017'], target: 'N017 Pale Petal -HTF' },
  { codes: ['GIUP N018', 'N018', 'N 018'], target: 'N018 Chic -HTF' },
  { codes: ['GIUP N019', 'N019', 'N 019'], target: 'N019 Luxe Linen -HTF' },
  { codes: ['GIUP N020', 'N020', 'N 020'], target: 'N020 Beige Bliss -HTF' },
  { codes: ['GIUP N021', 'N021', 'N 021'], target: 'N021 Soft Mocha -HTF' },
  { codes: ['GIUP N022', 'N022', 'N 022'], target: 'N022 Blushing Buff -HTF' },
  { codes: ['GIUP N023', 'N023', 'N 023'], target: 'N023 Princess Diaries -HTF' },
  { codes: ['GIUP N024', 'N024', 'N 024'], target: 'N024 New Porn Pink -HTF' },
  { codes: ['GIUP N025', 'N025', 'N 025'], target: 'N025 Latte Mouse -HTF' },
  { codes: ['GIUP N026', 'N026', 'N 026'], target: 'N026 Whispering Blush -HTF' },
`

// Extract ProductsModule's aliasGroups body from the source
// Find the second "const aliasGroups = [" (in ProductsModule)
const pmStart = src.indexOf('\n        const aliasGroups = [\n', src.indexOf('function ProductsModule'))
const pmArrayOpen = src.indexOf('\n        const aliasGroups = [\n', pmStart + 1) 
// Actually find the one in ProductsModule which starts around line 10508
// Use a more reliable anchor
const pmAnchor = '        const pnLookup = t => map.get(normalizeProductName(t))\n        const aliasGroups = ['
const pmAnchorIdx = src.lastIndexOf(pmAnchor)
if (pmAnchorIdx === -1) { console.error('ERROR: pmAnchor not found'); process.exit(1) }

const pmBodyStart = pmAnchorIdx + pmAnchor.length + 1 // after the opening [
// Find the closing ] of the aliasGroups (first line that is just "        ]")
let pmBodyEnd = pmBodyStart
let depth = 1
let i = pmBodyStart
while (i < src.length && depth > 0) {
  if (src[i] === '[') depth++
  else if (src[i] === ']') {
    depth--
    if (depth === 0) { pmBodyEnd = i; break }
  }
  i++
}

const pmAliasBody = src.slice(pmBodyStart, pmBodyEnd)
console.log(`ProductsModule aliasGroups body extracted: ${pmAliasBody.length} chars`)

// Build PRODUCT_ALIAS_GROUPS constant
const productAliasGroupsConst = `
// Module-level alias table used by CheckoutPage price lookup.
// Maps product image-map codes / filenames to canonical price-list entry names.
// Keep in sync with the inline aliasGroups in FullCataloguePage and ProductsModule.
const PRODUCT_ALIAS_GROUPS = [${pmAliasBody}${moduleNewEntries}]

`

// Insert before "function DistributorPackagesPage() {"
const dpAnchor = '\nfunction DistributorPackagesPage() {'
if (!src.includes(dpAnchor)) { console.error('ERROR: dpAnchor not found'); process.exit(1) }
src = src.replace(dpAnchor, productAliasGroupsConst + dpAnchor)
console.log('Step 2: PRODUCT_ALIAS_GROUPS module constant inserted ✓')

// =========================================
// 3. ADD ALIAS LOOP TO CheckoutPage useEffect
// =========================================
// Insert before "if (mounted) { setPriceMap(map); setWordIndex(wIdx) }"
const coOldUseEffect = `        if (mounted) { setPriceMap(map); setWordIndex(wIdx) }`
const coNewUseEffect = `        // Hard-wire alias codes that can't be auto-derived from price-list names
        const pnLookupCo = t => map.get(normalizeProductName(t)) || map.get(normalizeSkuCode(t))
        for (const { codes, target } of PRODUCT_ALIAS_GROUPS) {
          const entry = pnLookupCo(target)
          if (entry) { for (const c of codes) { if (!map.has(c)) map.set(c, entry) } }
        }
        if (mounted) { setPriceMap(map); setWordIndex(wIdx) }`

if (!src.includes(coOldUseEffect)) { console.error('ERROR: coOldUseEffect not found'); process.exit(1) }
// Make sure we only replace the one in CheckoutPage (there should only be one)
const coCount = (src.match(/if \(mounted\) \{ setPriceMap\(map\); setWordIndex\(wIdx\) \}/g) || []).length
if (coCount !== 1) { console.error(`ERROR: found ${coCount} matches for coOldUseEffect, expected 1`); process.exit(1) }
src = src.replace(coOldUseEffect, coNewUseEffect)
console.log('Step 3: CheckoutPage alias loop added ✓')

// =========================================
// 4. ADD byFullName + zero-strip STEPS TO CheckoutPage lookupPrice
// =========================================
// Add after the existing "byGiup" step, before the fuzzy fallback
const coOldLookup = `    const fuzzy = fuzzyPriceLookup(itemCode, itemName, wordIndex)
    if (fuzzy?.price != null) return fuzzy.price
    return null
  }, [priceMap, wordIndex])`

const coNewLookup = `    // Try full item name as normalised SKU key (handles "GIUP BOBCLR"-style literal alias keys)
    const byFullName = priceMap.get(normalizeSkuCode(itemName))
    if (byFullName?.price != null) return byFullName.price
    // Try stripping leading zeros from series suffix (e.g. "SH01" → "SH1", "VCE01" → "VCE01" unchanged)
    const stripped2 = normalizeSkuCode(itemCode).replace(/([A-Z]+)0+(\d)$/, '$1$2')
    if (stripped2 !== normalizeSkuCode(itemCode)) {
      const byStripped2 = priceMap.get(stripped2)
      if (byStripped2?.price != null) return byStripped2.price
    }
    const fuzzy = fuzzyPriceLookup(itemCode, itemName, wordIndex)
    if (fuzzy?.price != null) return fuzzy.price
    return null
  }, [priceMap, wordIndex])`

if (!src.includes(coOldLookup)) { console.error('ERROR: coOldLookup not found'); process.exit(1) }
src = src.replace(coOldLookup, coNewLookup)
console.log('Step 4: CheckoutPage lookupPrice byFullName + zero-strip added ✓')

// =========================================
// 5. ALSO ADD byFullName + zero-strip TO ProductsModule's lookupPrice (proformaLookupPrice equivalent)
//    The ProductsModule has its own price lookup called differently — skip for now, just verify checkout
// =========================================

// Restore original line endings when writing back
if (hasCRLF) src = src.replace(/\n/g, '\r\n')
writeFileSync('./src/App.jsx', src)
console.log('\nAll changes written to src/App.jsx ✓')
