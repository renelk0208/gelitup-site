// Accurate simulation of App.jsx lookupCataloguePrice + cataloguePriceMap build logic
import { readFileSync } from 'fs'

const imageMap = JSON.parse(readFileSync('public/gelitup-content/product-image-map.json', 'utf8'))
const priceList = JSON.parse(readFileSync('public/gelitup-content/b2b-price-list.json', 'utf8'))
const hidden = JSON.parse(readFileSync('public/gelitup-content/hidden-products.json', 'utf8'))
const productStatusCsv = readFileSync('public/gelitup-content/product-status.csv', 'utf8')

const hiddenSet = new Set(hidden.map(k => k.trim().toUpperCase()))

// --- Mirror App.jsx helpers ---
const normalizeSkuCode = v => String(v || '').trim().toUpperCase().replace(/\s+/g, ' ')
const normalizeProductName = v => normalizeSkuCode(v)
  .replace(/GEL\.?IT\.?UP|GEL\s*IT\s*UP|GIUP/gi, ' ')
  .replace(/(\d)(ML|GR|G)\b/gi, '$1 $2')
  .replace(/\b(HTF|HTE|HEMA\s*FREE|HEMAFREE)\b/gi, ' ')
  .replace(/\bGR\b/gi, 'G')
  .replace(/[^A-Z0-9]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
const deriveSpreadsheetSynonymKeys = name => {
  const normalized = normalizeProductName(name)
  if (!normalized) return []

  const keys = new Set()
  const add = (...values) => values.forEach(value => {
    const key = normalizeSkuCode(value)
    if (key) keys.add(key)
  })

  const classicBuilderMatch = normalized.match(/^3 IN 1 BUILDER GEL\s+(.+?)\s+40 G$/)
  if (classicBuilderMatch) {
    const shade = classicBuilderMatch[1]
    add(`3 IN 1 ${shade}`, `3IN1${shade.replace(/\s+/g, '')}`, `3 IN 1 BUILDER GEL ${shade}`)
  }

  const shimmeryBuilderMatch = normalized.match(/^3 IN 1 SHIMMERY BUILDER GEL\s+40 G\s+(.+)$/)
  if (shimmeryBuilderMatch) {
    const shade = shimmeryBuilderMatch[1]
    const legacyShadeMap = {
      'CLEAR IRIDESCENT': 'IRIDESCENT SHIMMER CLEAR',
      'COVER': 'SHIMMER COVER',
      'LIGHT LILAC': 'SHIMMER LILAC',
      'PINK MARMALADE': 'MARMELADE SHIMMER PINK',
    }
    const legacyShade = legacyShadeMap[shade]
    if (legacyShade) {
      add(`3 IN 1 BUILDER GEL ${legacyShade}`, `3 IN 1 BUILDER GEL ${legacyShade} B`)
    }
  }

  const premiumBuilderMatch = normalized.match(/^PREMIUM BUILDER GEL\s+(.+?)\s+40 GR$/)
  if (premiumBuilderMatch) {
    const shade = premiumBuilderMatch[1]
    add(`3 IN 1 GELITUP PREMIUM BUILDER GEL ${shade}`, `3 IN 1 GELITUP PREMIUM BUILDER GEL ${shade} B`)
    if (shade === 'PEARLY NUDE') add('3 IN 1 PREMIUM BUILDER GEL SHIMMER NUDE', '3 IN 1 PREMIUM BUILDER GEL SHIMMER NUDE B')
    if (shade === 'PEARLY PINK') add('3 IN 1 PREMIUM BUILDER GEL SHIMMER PINK', '3 IN 1 PREMIUM BUILDER GEL SHIMMER PINK B')
  }

  if (normalized === 'PREMIUM PLUS FIBER GLASS BUILDER GEL 40 GR') {
    add('3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR PLUS', '3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR PLUS B', '3 IN 1 PREMIUM PLUS', '3 IN 1.PREMIUM.PLUS')
  }

  const brushOnBuilderMatch = normalized.match(/^BRUSH ON BUILDER GEL\s+(.+?)\s+15 ML$/)
  if (brushOnBuilderMatch) {
    const shade = brushOnBuilderMatch[1]
    add(`BRUSH ON BUILDER BIAB ${shade}`)
    if (shade === 'BLUSH PINK') add('BRUSH ON BUILDER BIAB IRRIDESCENT PINK', 'BRUSH ON BUILDER BIAB IRRODESCENT PINK')
    if (shade === 'GLITTERY PINK') add('BRUSH ON BUILDER BIAB GLITTER PINK')
  }

  if (normalized === 'SUPERBOND NAIL DEHYDRATOR 11 ML ACID FREE') add('SUPERBOND WITHOUT ACID', 'SUPERBOND.WITHOUT.ACID')
  if (normalized === 'SUPERBOND NAIL DEHYDRATOR 11 ML WITH ACID') add('SUPERBOND WITH ACID', 'SUPERBOND.WITH.ACID')
  if (normalized === 'BASE COAT 15 ML') add('CLASSIC BASE COAT')
  if (normalized === 'ACRYLIC COMPETE POWDER COVER 35 G') add('ACRYLICS COVER')
  if (normalized === 'ACRYLIC COMPETE POWDER EXTREME WHITE 35 G') add('ACRYLICS EXTREME WHITE')
  if (normalized === 'ACRYLIC COMPETE POWDER PINK 35 G') add('ACRYLICS PINK')
  if (normalized === 'ACRYLIC CLASSIC POWDER WHITE 35 G' || normalized === 'ACRYLIC COMPETE POWDER MILKY WHITE 35 G') add('ACRYLICS WHITE')
  if (/^2113\b/.test(normalized)) add('SFT 2113')

  const autumn2021Match = normalized.match(/^AUTUMN 2021 OTA(\d{2})$/)
  if (autumn2021Match) add(`GIUP ODA${autumn2021Match[1]}`)

  const btbMatch = normalized.match(/^BTB(\d{2})\b/)
  if (btbMatch) add(`GIUP B2B${btbMatch[1]}`)

  const multimixMatch = normalized.match(/^MULTIMIX SYNTHOGEL (30|60) G (.+)$/)
  if (multimixMatch) {
    const size = multimixMatch[1]
    const shade = multimixMatch[2]
    const multimixAliasMap = {
      '30:BABY BLUE': ['MULTIMIX BABY BLUE COLOR'],
      '30:BABY PINK GLITTER': ['MULTIMIX BABY PINK GLITTER COLOR'],
      '30:BLUE GLITTER': ['MULTIMIX BLUE GLITTER COLOR'],
      '30:BUBBLE GUM GLITTER': ['MULTIMIX BUBBLE GUM GLITTER COLOR', 'MULTIMIX BUBBLEGUM GLITTER COLOR'],
      '30:CLEAR': ['MULTIMIX CLEAR COLOR'],
      '30:GLITSY GREEN': ['MULTIMIX GLITSY GREEN COLOR'],
      '30:LIGHT NUDE': ['MULTIMIX LIGHT NUDE COLOR'],
      '30:MINTY GREEN': ['MULTIMIX MINT GREEN COLOR'],
      '30:PINK III': ['MULTIMIX PINKIII COLOR'],
      '30:SUPER SOFT PINK': ['MULTIMIX SUPER SOFT PINK COLOR'],
      '60:BLACK': ['MULTIMIX BLACK COLOR'],
      '60:CLEAR': ['MULTIMIX CLEAR COLOR'],
      '60:CLEAR GLITTER': ['MULTIMIX GLITTERS CLEAR'],
      '60:COVER': ['MULTIMIX COVER COLOR'],
      '60:COVER II': ['MULTIMIX COVER II COLOR'],
      '60:CRYSTAL CLEAR': ['MULTIMIX CRYSTAL CLEAR COLOR'],
      '60:GLITTER GOLD': ['MULTIMIX GLITTERS GOLD'],
      '60:GLITTER NUDE': ['MULTIMIX GLITTERS NUDE'],
      '60:GLITTER PINK': ['MULTIMIX GLITTERS PINK', 'MULTIMIX GLITTERPINK COLOR'],
      '60:GLITTER PINK II': ['MULTIMIX PINK II COLOR'],
      '60:GLITTER WHITE': ['MULTIMIX GLITTERS WHITE'],
      '60:LIGHT LILAC': ['MULTIMIX LILAC COLOR'],
      '60:LIGHT PINK': ['MULTIMIX LIGHT PINK COLOR'],
      '60:MILKY WHITE': ['MULTIMIX MILKY WHITE COLOR'],
      '60:NUDE': ['MULTIMIX NUDE COLOR'],
      '60:PINK': ['MULTIMIX PINK COLOR'],
      '60:PINK II': ['MULTIMIX PINK II COLOR'],
      '60:SUPER MILKY': ['MULTIMIX SUPER MILKY COLOR'],
      '60:WHITE': ['MULTIMIX WHITE COLOR', 'MULTIMIX WHITE 60ML 60G'],
    }
    const aliases = multimixAliasMap[`${size}:${shade}`] || []
    aliases.forEach(alias => {
      add(alias, `${alias} ${size}G`, `${alias} ${size} G`, `${alias} B ${size}G`, `${alias} B ${size} G`, `${alias} C ${size}G`, `${alias} C ${size} G`)
    })
  }

  return [...keys]
}
const stripSuffix = s => String(s || '').replace(/\s*[-—]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '').trim()
const parseProductStatusCsv = csvText => {
  const discontinued = new Set()
  if (!csvText) return discontinued
  const lines = String(csvText).split(/\r?\n/).filter(Boolean)
  if (lines.length <= 1) return discontinued

  for (const line of lines.slice(1)) {
    const parts = line.split(',')
    if (parts.length < 4) continue
    const code = String(parts[0] || '').trim()
    const name = String(parts[1] || '').trim()
    const status = String(parts[3] || '').trim().toLowerCase()
    if (status !== 'discontinued') continue
    if (code) {
      discontinued.add(normalizeSkuCode(code))
      discontinued.add(normalizeProductName(code))
    }
    if (name) {
      discontinued.add(normalizeSkuCode(name))
      discontinued.add(normalizeProductName(name))
    }
  }

  return discontinued
}
const discontinuedSet = parseProductStatusCsv(productStatusCsv)

// formatCatalogueItemName: filename → name
const formatCatalogueItemName = (rawPath = '') => {
  const fileName = rawPath.split('/').pop() || ''
  return fileName.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// extractProductCode: name → code (regex from App.jsx)
const extractProductCode = (name = '') => {
  const cleaned = String(name || '').trim()
  const giupCodeMatch = cleaned.match(/\bGIUP[\s._-]*([A-Z0-9]{2,12})\b/i)
  if (giupCodeMatch) {
    return normalizeSkuCode(`GIUP ${giupCodeMatch[1]}`)
  }

  const compactCodeMatch = cleaned.match(/\b[A-Z]{2,8}\d{1,4}[A-Z0-9-]*\b/i)
  if (compactCodeMatch) {
    return compactCodeMatch[0].toUpperCase()
  }

  return normalizeSkuCode(cleaned) || 'SKU'
}

// Build cataloguePriceMap (simplified — no alias groups, but full key logic)
const map = new Map()
for (const { name, sku, price } of priceList.items) {
  if (price == null) continue
  const entry = { name, price }
  const cleanName = stripSuffix(name)
  const keys = [
    normalizeSkuCode(sku),
    normalizeSkuCode(stripSuffix(sku)),
    normalizeProductName(name),
    normalizeProductName(cleanName),
  ]
  const numMatch = cleanName.match(/^(\d+[A-Z]?)\s/)
  if (numMatch) {
    keys.push(numMatch[1].replace(/^(\d+)/, n => n.padStart(2, '0')), numMatch[1].replace(/^0+(\d)/, '$1'), numMatch[1])
  }
  const seriesNumMatch = cleanName.match(/^([A-Z]+)\s*#\s*(\d+[A-Z]?)\b/i)
  if (seriesNumMatch) {
    const s = seriesNumMatch[1].toUpperCase(), n = seriesNumMatch[2]
    keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
  }
  const embeddedCodeMatch = cleanName.match(/#([A-Z]+)\s*(\d+[A-Z]?)\b/i)
  if (embeddedCodeMatch) {
    const s = embeddedCodeMatch[1].toUpperCase(), n = embeddedCodeMatch[2]
    keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
  }
  for (const tm of [...cleanName.matchAll(/\b([A-Z]{1,5})(\d{1,3}[A-Z]?)\b/gi)]) {
    const s = tm[1].toUpperCase(), n = tm[2]
    keys.push(`${s} ${n}`, `${s} ${n.padStart(2, '0')}`, `${s}${n}`, `${s}${n.padStart(2, '0')}`)
  }
  keys.push(...deriveSpreadsheetSynonymKeys(cleanName))
  for (const k of keys) {
    if (k && !map.has(k)) map.set(k, entry)
  }
}

// Alias groups from App.jsx (abbreviated — only the codes, not target lookups, we just mark as known)
// We add all alias code strings to a separate "aliased" set so we know they're handled
const aliasedCodes = new Set([
  'GIUP SBLS','GIUP SBMS','GIUP SBBLUE','GIUP SBBlue','GIUP SBPS','GIUP SBPURS',
  '5 IN 1 GIUP SBLS','5-IN-1-GIUP-SBLS','2026-NEW-5IN1-LEMON-SERENITY',
  '5 IN 1 GIUP SBMS','5-IN-1-GIUP-SBMS','2026-NEW-5IN1-MINT-SERENITY',
  '5 IN 1 GIUP SBBLUE','5-IN-1-GIUP-SBBLUE','GIUP-SBBLUE','2026-NEW-5IN1-PEACH-BLUE',
  '5 IN 1 GIUP SBPS','5-IN-1-GIUP-SBPS','2026-NEW-5IN1-PEACH-SERENITY',
  '5 IN 1 GIUP SBPURS','5-IN-1-GIUP-SBPURS','2026-NEW-5IN1-PURPLE-SERENITY',
  'ALL IN ONE LIQUID 200ML','ALL IN ONE LIQUID 200 ML','LIQUID 200ML','2026-NEW-NEW-CONSUMABLES-200',
  'ALL IN ONE LIQUID 500ML','ALL IN ONE LIQUID 500 ML','LIQUID 500ML','2026-NEW-NEW-CONSUMABLES-500',
  'MIRROR TOP COAT','2026-NEW-MIRROR-TOP-COAT','2026-NEW-MIRROR-POWDER-TOP-COAT',
  'GIUP BOBCLR','GIUP BOBCOV','GIUP BOBPNK','GIUP BOBCRM','GIUP BOBNUD','GIUP BOBPURGL',
  'GIUP BOBDS','GIUP BOBMILK','GIUP BOBLIL','GIUP BOBBLPN','GIUP BOBSTPN','GIUP BOBGLPN',
  'GIUP BOBGLMG','GIUP BOBPRL','GIUP BOBGLROS','GIUP BOBGLSLM',
  'GIUP BOB BLUSH SORBET','GIUP BOB blush sorbet','GIUP BOB SKY SPRINKLE','GIUP BOB sky sprinkle',
  'GIUP BOB BERRY STARDUST','GIUP BOB Berry stardust',
  'SKINNY LINER 5 7','skinny liner 5 7','SKINNY LINER 9 11','skinny liner 9 11',
  'MIRROR CLEAR','MIRROR X1','MIRROR X2','MIRROR X3','MIRROR X4','MIRROR X5','MIRROR X6',
  'GIUP SBCGLPI','GIUP SBCGP','GIUP SBCIRPI','GIUP SBCIMF','GIUP SBCCLI','GIUP SBCMW','GIUP SBCN','GIUP SBCSN',
  'NWMT15','NWPT15','NWPT15 1','GIUP SB NO ACID','GIUP SB WITH ACID','SB AC','SB AC',
  'ALMOND','DUAL FORMS ALMOND','BALLERINA','LONG ALMOND','MODERNS SQUARE','MODERN SQUARE','RUSSIAN ALMOND',
  'SQUARE','DUAL FORMS SQUARE','SQUOVAL','STANDARD','DUAL MIX','DUAL MIX 2','DUAL MIX 3','SQUARE XL','DUAL FORM SQUARE XL',
  'SOAK OFF GEL TIPS LONG ALMOND','SOAK OFF GEL TIPS LONG COFFIN','SOAK OFF GEL TIPS MEDIUM SQUARE','SOAK OFF GEL TIPS SHORT ALMOND','SHORT ALMOND',
  'GIUP SS01KALEIDASCOPE','GIUP SS02DELPHINIUM','GIUP SS03GIDDY GRAPE','GIUP SS04POPPING CANDY','GIUP SS05LEMON SORBET','GIUP SS06TUSK TUSK',
  'SS01','SS02','SS03','SS04','SS05','SS06','DCE1','DCE2','DCE3','DCE4','RQCE1','RQCE2','RQCE3',
  'GCE01','GCE02','GCE03','GCE04','GCE05','GCE06','GCE07','TFG01','TFG02','TFG03','TFG04','TFG05','TFG06',
  'SH1','SH2','SH3','SH4','SH5','SH6','MC1','MC2','MC3','MC4','MC5','MC6','MC7','MC8',
  'BTB01','BTB02','BTB03','GIUP B2BRED0001','GIUP B2BBLUE0003','GIUP B2BYELLOW0002',
  'OTA01','OTA02','OTA03','OTA04','OTA05','OTA06','OTA07','OTA08',
  'JNF01','JNF02','JNF03','JNF04','JNF05','JNF06',
  'NYP01','NYP02','NYP03','NYP04','AD01','AD02','AD03',
  'FR01','FR02','FR03','FR04','FR05','FR06','FR08',
  'GIUP SB','GIUP-SB','SB AC','NAILDUSTER 1','APRON','NAILSTICKS CLEAR SCALED 1',
  'CUSHION SPONGE','CUSHION SPONGE 2',
  // BOB new filenames
  'BRUSH ON BUILDER BIABCLR','BRUSH ON BUILDER BIABCOV','BRUSH ON BUILDER BIABPNK',
  'BRUSH ON BUILDER BIABCRM','BRUSH ON BUILDER BIABNUD','BRUSH ON BUILDER BIABPURGL',
  'BRUSH ON BUILDER BIABDS','BRUSH ON BUILDER BIABMILK','BRUSH ON BUILDER BIABLIL',
  'BRUSH ON BUILDER BIABBLPN','BRUSH ON BUILDER BIABSTPN','BRUSH ON BUILDER BIABGLPN',
  'BRUSH ON BUILDER BIABGLMG','BRUSH ON BUILDER BIABPRL','BRUSH ON BUILDER BIABGLROS',
  'BRUSH ON BUILDER BIABGLSLM','BRUSH ON BUILDER BIAB SKY SPRINKLE (1)',
  'BRUSH ON BUILDER BIAB BLUSH SORBET','BRUSH ON BUILDER BIAB BERRY STARDUST',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL BLUSH','3 IN 1 GELITUP PREMIUM BUILDER GEL BLUSH B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR','3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR PLUS','3 IN 1 GELITUP PREMIUM BUILDER GEL CLEAR PLUS B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL COVER','3 IN 1 GELITUP PREMIUM BUILDER GEL COVER B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL MILKY','3 IN 1 GELITUP PREMIUM BUILDER GEL MILKY B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL NUDE','3 IN 1 GELITUP PREMIUM BUILDER GEL NUDE B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL PINK','3 IN 1 GELITUP PREMIUM BUILDER GEL PINK B',
  '3 IN 1 GELITUP PREMIUM BUILDER GEL WHITE','3 IN 1 GELITUP PREMIUM BUILDER GEL WHITE B',
  '3 IN 1 PREMIUM BUILDER GEL SHIMMER NUDE','3 IN 1 PREMIUM BUILDER GEL SHIMMER NUDE B',
  '3 IN 1 PREMIUM BUILDER GEL SHIMMER PINK','3 IN 1 PREMIUM BUILDER GEL SHIMMER PINK B',
  '3 IN 1.PREMIUM.PLUS',
  // 5-in-1 SBC new filenames
  '5 IN 1 GIUP SBCBP','5 IN 1 GIUP SBCCLR','5 IN 1 GIUP SBCCP','5 IN 1 GIUP SBCMP',
  '5 IN 1 GIUP SBCPP','5 IN 1 GIUP SBCSP','5 IN 1 GIUP SBCGLPI','5 IN 1 GIUP SBCGP',
  '5 IN 1 GIUP SBCIRPI','5 IN 1 GIUP SBCIMF','5 IN 1 GIUP SBCCLI',
  '5 IN 1 GIUP SBCMW','5 IN 1 GIUP SBCN','5 IN 1 GIUP SBCSN',
  // FLEXI BASE
  'GIUP FBCLR','GIUP FBCOV','GIUP FBP',
  'GIUP NW1','GIUP NW2','GIUP NW3','GIUP NWT','GIUP SATMAT','GIUP WOTC',
  'STF01','STF02','STF03','STF04','STF05',
  'GIUP DT01DANDELION','GIUP DT02DIAMOND DUST','GIUP DT03SUGAR SOCKS','GIUP DT04CHIPPER',
  'DT01','DT02','DT03','DT04','FAN12','LPG1','LPG2','LPG3','LPG4','LPG5','LPG6','LPG7','LPG8',
  'GIUP BTO01','GIUP BTO02','GIUP BTO03','GIUP BTO04','GIUP BTO05','GIUP BTO06','GIUP BTO07',
  'BTO01','BTO02','BTO03','BTO04','BTO05','BTO06','BTO07',
  'GIUP VCE01','VCE01','VCE 01','GIUP VCE02','VCE02','VCE 02','GIUP VCE03','VCE03','VCE 03',
  'GIUP VCE04','VCE04','VCE 04','GIUP VCE05','VCE05','VCE 05','GIUP VCE06','VCE06','VCE 06',
  'GIUP VCE07','VCE07','VCE 07','GIUP VCE08','VCE08','VCE 08','GIUP VCE09','VCE09','VCE 09','GIUP VCE10','VCE10','VCE 10',
  'GIUP CT 01','GIUP CT 02','GIUP CT 03','GIUP CT 04','GIUP CT 05','GIUP CT 06','GIUP CT 07','GIUP CT 08','GIUP CT 09','GIUP CT 10',
  'BLOSSOM','GIUP.BLOSSOM','WATER COLORS','AQUARELLE BRUSH','FRENCH CURVED BRUSH',
  'ACRYLIC BRUSH NO10','ACRYLIC BRUSH NO12','GEL BRUSH NO6','GEL BRUSH NO8',
  'POLYGEL','POLYGEL 2','SYNTHOGEL BRUSH','DUST COLLECTOR','DUST COLLECTOR 2','PORTABLE LAMP','AIRBRUSH 1','STAMP LAMP',
  'NEW LOGO ACRYLIC LIQUID CLASSIC 500ML','NEW LOGO ACRYLIC LIQUID COMPETE 500ML 1','CLEAR',
  'PODODISC','PROBES','TWEEZER','TWEEZER B',
  '01 HEAD CUTTER PLAIN HANDLE HALF BLADE','02 CORNER NIPPER EXTRA SLIM','03 CORNER NIPPER DESIGN HANDLE',
  '01 CUTICLE PUSHER DOUBLE ACTION ROUNDED','02 CUTICLE PUSHER DOUBLE ACTION',
  '01 CUTICLE SCISSOR CURVED 10 5 19','03 CUTICLE SCISSOR CURVED 10 18','04 CUTICLE SPRING SCISSOR CURVED',
  '04 CUTICLE NIPPER OVAL FINE CUT','05 CUTICLE NIPPER OVAL ROUND FINE CUT','06 CUTICLE NIPPER FINE CUT','COMER',
  'CUTICLE REMOVER 5ML','WHITE SATIN CUTICLE SCRUB REMOVER','GIUP FFF','GIUP 01 FFF',
  '5D NAIL STICKERS BLACK','5D NAIL STICKERS WHITE',
  'GIUP MT1','GIUP MT2','GIUP MT2 1','GIUP MT6',
  'CUTICLE OIL COCONUT','CUTICLE OIL MELON','CUTICLE OIL PEACH',
  'PHOTO PERFECT CUTICLE OIL','WHITE SATIN CUTICLE OIL COCONUT OIL','WHITE SATIN CUTICLE OIL MELON','WHITE SATIN CUTICLE OIL PEACH',
  'FOOT CREAM 100 CALMFROST','FOOT CREAM 100 SASSYSASSY','FOOT CREAM 100 SILKYBLISS',
  'FOOT CREAM 1000 CALMFROST','FOOT CREAM 1000 SASSYSASSY','FOOT CREAM 1000 SILKYBLISS',
  'HANDANDBODY CREAM 100 CALMFROST','HANDANDBODY CREAM 100 SASSYSASSY','HANDANDBODY CREAM 100 SILKYBLISS',
  'HANDANDBODY CREAM 1000 CALMFROST','HANDANDBODY CREAM 1000 SASSYSASSY','HANDANDBODY CREAM 1000 SILKYBLISS',
  'SCRUB 200 CALMFROST','SCRUB 200 SASSYSASSY','SCRUB 200 SILKYBLISS',
  'SCRUB 750 CALMFROST','SCRUB 750 SASSYSASSY','SCRUB 750 SILKYBLISS',
  'LINE IT UP 0001 YELLOW','LINE IT UP 0002 WHITE','LINE IT UP 0003 SKY','LINE IT UP 0004 SILVER',
  'LINE IT UP 0005 ROSE','LINE IT UP 0006 RED','LINE IT UP 0007 PYRITE','LINE IT UP 0008 PISTACHIO',
  'LINE IT UP 0009 PINK','LINE IT UP 0010 ORANGE','LINE IT UP 0011 MINT','LINE IT UP 0012 MAGENTA',
  'LINE IT UP 0013 LILAC','LINE IT UP 0014 LAVENDER','LINE IT UP 0015 GREEN','LINE IT UP 0016 GOLD',
  'LINE IT UP 0017 BLACK','LINE IT UP 0018 APRICOT',
  'MARBLE 1','MARBLE 2','MARBLE 3','MARBLE 4','MARBLE 5','MARBLE 6','MARBLE 7','MARBLE 8','MARBLE 9',
  'MARBLE 10','MARBLE 11','MARBLE 12','MARBLE 13','MARBLE 14','MARBLE 15','MARBLE 16','MARBLE 17','MARBLE 18',
  'SUGARY GLITTER 01','SUGARY GLITTER 02','SUGARY GLITTER 03','SUGARY GLITTER 04',
  'SUGARY GLITTER 05','SUGARY GLITTER 06','SUGARY GLITTER 07',
  // hand & foot care aliases from App.jsx
  'CUTICLE REMOVER 5ML','GIUP SB NO ACID','GIUP SB WITH ACID','SANITIZER','CLEANSER','NAIL WIPES',
  'NAIL FORMS 5','DUAL FORMS ALMOND','DUAL FORMS LONG COFFIN','DUAL FORMS MEDIUM SQUARE',
  'MULTIMIX BLACK COLOR 60G','MULTIMIX BLACK COLOR B 60G','MULTIMIX BLACK COLOR C 60G',
  'NAIL FILES BUFFER 100 180 PURPLE SPONGE','NAIL FILES BUFFER 180 180 PINK SPONGE','BOAT SHAPE METALLIC NAIL BASE',
  'DUAL FORMS MODERNS SQUARE','DUAL FORMS STANDARD','FLEXI SHORT SQUARE','FUAL FORMS SQUARE',
  'Î’UFFING BLOCK','ΒUFFING BLOCK','NAIL FILE 100 1001',
  '01. CUTICLE SCISSOR, CURVED 10,5 19 B','01. HEAD CUTTER, PLAIN HANDLE, HALF BLADE B',
  '02. CORNER NIPPER, EXTRA SLIM (FLAME SHAPED)','03. CUTICLE SCISSOR, CURVED 10 18 B','04. CUTICLE SPRING SCISSOR, CURVED B',
  'STAMP LAMP 2',
])
const normalizedAliasedCodes = new Set([
  ...aliasedCodes,
  ...[...aliasedCodes].map(code => normalizeProductName(code)).filter(Boolean),
])

// lookupCataloguePrice simulation
function lookupCataloguePrice(itemName, itemCode) {
  const byName = map.get(normalizeProductName(itemName))
  if (byName) return byName.price
  const byCode = map.get(normalizeSkuCode(itemCode))
  if (byCode) return byCode.price
  const giupNumMatch = normalizeSkuCode(itemCode).match(/^(?:GIUP\s+)?(\d+[A-Z]?)$/)
  if (giupNumMatch) {
    const e = map.get(giupNumMatch[1].padStart(2, '0')) || map.get(giupNumMatch[1])
    if (e) return e.price
  }
  const giupSeriesMatch = normalizeSkuCode(itemCode).match(/^(?:GIUP[-\s]+)?([A-Z]+)(\d+[A-Z]?)$/)
  if (giupSeriesMatch) {
    const s = giupSeriesMatch[1], n = giupSeriesMatch[2]
    const e = map.get(`${s} ${n}`) || map.get(`${s} ${n.padStart(2, '0')}`) || map.get(`${s}${n}`) || map.get(`${s}${n.padStart(2, '0')}`)
      || map.get(`${s} ${n.replace(/^0+(\d)/, '$1')}`)
    if (e) return e.price
  }
  const giupLooseSeriesMatch = !giupSeriesMatch && normalizeSkuCode(itemCode).match(/^(?:GIUP[-\s]+)?([A-Z]{2,5})(\d{1,3})(?=[A-Z])/)
  if (giupLooseSeriesMatch) {
    const s = giupLooseSeriesMatch[1], n = giupLooseSeriesMatch[2]
    const e = map.get(`${s} ${n}`) || map.get(`${s} ${n.padStart(2, '0')}`)
    if (e) return e.price
  }
  const byFullName = map.get(normalizeSkuCode(itemName))
  if (byFullName) return byFullName.price
  // Check aliasedCodes
  if (
    normalizedAliasedCodes.has(normalizeSkuCode(itemName))
    || normalizedAliasedCodes.has(normalizeSkuCode(itemCode))
    || normalizedAliasedCodes.has(normalizeProductName(itemName))
    || normalizedAliasedCodes.has(normalizeProductName(itemCode))
  ) return 1 // aliased = has price
  // fuzzy: at least 2 significant words match any price entry (multi-digit numbers only, not lone digits)
  const SKIP = new Set(['COLOR','COLOUR','COAT','CARE','FORM','SIZE'])
  const qWords = normalizeSkuCode(itemName).split(/\s+/).filter(w => (w.length >= 4 && !SKIP.has(w)) || /^\d{2,}$/.test(w))
  if (qWords.length >= 2) {
    for (const { name: pn } of priceList.items) {
      const pWords = new Set(normalizeSkuCode(pn).split(/\s+/))
      if (qWords.every(w => pWords.has(w) || pWords.has(w + 'S'))) return 1 // fuzzy match
    }
  }
  return null
}

// Walk unique image paths
const seen = new Set()
const missing = []
for (const [key, imgPath] of Object.entries(imageMap)) {
  if (typeof imgPath !== 'string') continue
  if (!imgPath.includes('/gelitup-content/product-images/')) continue
  if (hiddenSet.has(key.trim().toUpperCase())) continue
  if (/hero(?:[._ -]?image)?|banner/i.test(key) || /hero(?:[._ -]?image)?|banner/i.test(imgPath.split('/').pop() || '')) continue
  if (seen.has(imgPath)) continue
  seen.add(imgPath)

  const afterRoot = imgPath.split('/gelitup-content/product-images/')[1] || ''
  const segments = afterRoot.split('/').filter(Boolean)
  const category = segments[0] || 'Other'
  if (category === '') continue

  const itemName = formatCatalogueItemName(afterRoot)
  const itemCode = extractProductCode(itemName)
  if (
    discontinuedSet.has(normalizeSkuCode(key))
    || discontinuedSet.has(normalizeProductName(key))
    || discontinuedSet.has(normalizeSkuCode(itemCode))
    || discontinuedSet.has(normalizeProductName(itemCode))
    || discontinuedSet.has(normalizeSkuCode(itemName))
    || discontinuedSet.has(normalizeProductName(itemName))
  ) continue

  const price = lookupCataloguePrice(itemName, itemCode)
  if (price == null) {
    missing.push({ category, itemName, itemCode })
  }
}

const byCat = {}
for (const m of missing) {
  if (!byCat[m.category]) byCat[m.category] = []
  byCat[m.category].push(`${m.itemName}  [code: ${m.itemCode}]`)
}

for (const [cat, items] of Object.entries(byCat).sort()) {
  console.log(`\n[${cat}]`)
  items.forEach(i => console.log('  ' + i))
}
console.log(`\nTotal catalogue products showing "Price on request": ${missing.length}`)
