// Turns what was written in a PR package ("1 x Purple Buffer", "Blossom") into
// the matching product on shop.gelitup.com, so the ambassador can be sent a
// link to that product's review form (Judge.me). Generic lines such as
// "3 different Cat Eye shades" can't be matched and are picked by hand.

export const SHOP_URL = 'https://shop.gelitup.com'

// Names we write in packages that differ from the shop title.
const ALIASES = {
  purplebuffer: ['nail-files-180-180-purple-sponge'],
  pinkbuffer: ['nail-files-100-120-pink-sponge'],
  photoperfectcuticleoil: ['photoperfect-cuticle-oil-new'],
  rollofgelitupnailforms: ['gel-it-up-by-giupr-nail-forms'],
  gelitupnailforms: ['gel-it-up-by-giupr-nail-forms'],
  nailforms: ['gel-it-up-by-giupr-nail-forms'],
  flexibase: ['flexi-base-clear-htf'],
  apron: ['apron-black-with-logo'],
  blossom: ['blossom-flower-power-15ml-htf'],
  lineitupblack: ['line-it-up-black-htf'],
  lineitupwhite: ['line-it-up-white-htf'],
  lineitupblackandwhite: ['line-it-up-black-htf', 'line-it-up-white-htf'],
  cobwebwhiteandblack: ['cobweb-gel-white-htf', 'cobweb-gel-black-htf'],
  cobwebblackandwhite: ['cobweb-gel-black-htf', 'cobweb-gel-white-htf'],
}

const norm = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '')

// "1 x Purple Buffer" / "2x Blossom" -> "Purple Buffer"
export function stripQuantity(item) {
  return String(item || '').trim().replace(/^\d+\s*x?\s*/i, '').trim()
}

export function productUrl(handle) {
  return `${SHOP_URL}/products/${encodeURIComponent(handle)}#judgeme_product_reviews`
}

// The shop product(s) a written package line stands for, when it names them
// exactly ("1 x Purple Buffer", "Blossom Flower Power 15ml"). Empty when the line
// is generic ("3 different Cat Eye shades").
export function matchItem(item, products) {
  const byHandle = new Map((products || []).map((p) => [p.handle, p]))
  const key = norm(stripQuantity(item))
  if (ALIASES[key]) {
    const hits = ALIASES[key].map((h) => byHandle.get(h)).filter(Boolean)
    if (hits.length) return hits
  }
  const exact = (products || []).find((p) => norm(p.title) === key)
  return exact ? [exact] : []
}

// How many products a generic line asks for: "3 different Cat Eye shades" -> 3,
// "2 x Premium Builder Gel" -> 2, "5 x Autumn / Winter Colours" -> 5.
export function suggestedCount(item) {
  const m = String(item || '').trim().match(/^(\d+)\s*(?:x\b|\s)/i)
  const n = m ? Number(m[1]) : 1
  return n >= 1 && n <= 20 ? n : 1
}

// Every item from this ambassador's packages that were not lost, oldest first,
// with the shop product(s) it matches (empty when it needs picking by hand).
//
// expandStarter: count the starter-kit lines ("Standard Sample Box", "Nail
// file", …) as the individual products they always contain. Only the colours
// in the box vary, so those still need "Edit contents".
export const STARTER_LINE_PRODUCTS = {
  standardsamplebox: [
    'Non Wipe Top Coat 15ml', 'Base Coat 15ml', 'Perfect Shape Non Wipe Top Coat 15ml',
    '5-in-1 Superior Base 15ml Clear', 'Brush on Builder Gel Nude 15ml', 'MultiMix Synthogel 30gr Clear',
    'Cushion Pro Gel White', 'Cushion Pro Gel Black', '3-in-1 Builder Gel Clear 40g', 'Premium Builder Gel Pink 40gr',
  ],
  '3in1allinoneliquid': ['All-In-One Liquid 200ml'],
  in1allinoneliquid: ['All-In-One Liquid 200ml'], // "3-in-1 All in One Liquid" after the quantity is stripped
  allinoneliquid: ['All-In-One Liquid 200ml'],
  nailfile: ['Nail Files 100/100'],
  photoperfectcreamcuticleoilbasedoncurrentstock: ['Photo Perfect Cuticle Oil', 'Cooling Coconut Cuticle Oil 5ml', 'GEL.IT.UP Hand & Body Cream 100ml – Silky Bliss'],
}
STARTER_LINE_PRODUCTS.standardsamplepack = STARTER_LINE_PRODUCTS.standardsamplebox

export function receivedItems(shipments, products, { expandStarter = false } = {}) {
  const byHandle = new Map((products || []).map((p) => [p.handle, p]))
  const byTitle = new Map((products || []).map((p) => [norm(p.title), p]))
  const out = []
  const seen = new Set()
  const list = [...(shipments || [])]
    .filter((s) => !s?.lost_at)
    .sort((a, b) => String(a.sent_at || '').localeCompare(String(b.sent_at || '')))
  for (const s of list) {
    for (const raw of s.items || []) {
      const item = String(raw || '').trim()
      if (!item || seen.has(norm(item))) continue
      seen.add(norm(item))
      const key = norm(stripQuantity(item))
      let matches = []
      if (ALIASES[key]) matches = ALIASES[key].map((h) => byHandle.get(h)).filter(Boolean)
      if (!matches.length && byTitle.get(key)) matches = [byTitle.get(key)]
      if (!matches.length && expandStarter && STARTER_LINE_PRODUCTS[key]) {
        matches = STARTER_LINE_PRODUCTS[key].map((t) => byTitle.get(norm(t))).filter(Boolean)
      }
      out.push({ item, sent_at: s.sent_at, matches })
    }
  }
  return out
}

export function searchProducts(products, query, limit = 8) {
  const words = String(query || '').toLowerCase().split(/\s+/).map(norm).filter(Boolean)
  if (!words.length) return []
  return (products || [])
    .filter((p) => { const t = norm(p.title); return words.every((w) => t.includes(w)) })
    .sort((a, b) => a.title.length - b.title.length)
    .slice(0, limit)
}
