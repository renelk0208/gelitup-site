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

// Every item from this ambassador's packages that were not lost, oldest first,
// with the shop product(s) it matches (empty when it needs picking by hand).
export function receivedItems(shipments, products) {
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
