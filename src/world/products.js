import { cleanProductName } from './config'

// Product list for "Which GEL.IT.UP products did you use?".
// Source: the products on shop.gelitup.com (title, handle, photo), via the
// existing /.netlify/functions/shop-products feed. Each product therefore has
// its own shop page, so review links can open the product's Judge.me review
// section directly. Falls back to the catalogue price list if the feed fails.

export const SHOP_URL = 'https://shop.gelitup.com'

let cache = null

async function fromShop() {
  const res = await fetch('/.netlify/functions/shop-products')
  if (!res.ok) throw new Error(`shop-products ${res.status}`)
  const json = await res.json()
  const list = Array.isArray(json?.products) ? json.products : []
  if (!list.length) throw new Error('empty')
  const seen = new Set()
  const out = []
  for (const p of list) {
    const name = cleanProductName(p.title)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push({ name, handle: p.handle, image: p.image || '' })
  }
  return out
}

async function fromPriceList() {
  const [list, images] = await Promise.all([
    fetch('/gelitup-content/b2b-price-list.json').then(r => r.json()).catch(() => ({ items: [] })),
    fetch('/gelitup-content/product-image-map.json').then(r => r.json()).catch(() => ({})),
  ])
  const imgByKey = {}
  for (const [k, v] of Object.entries(images || {})) imgByKey[cleanProductName(k).toLowerCase()] = v
  const seen = new Set()
  const out = []
  for (const item of list.items || []) {
    const name = cleanProductName(item.name)
    const key = name.toLowerCase()
    if (!name || seen.has(key)) continue
    seen.add(key)
    out.push({ name, sku: item.sku, image: imgByKey[key] || '' })
  }
  return out
}

export async function loadProducts() {
  if (!cache) cache = fromShop().catch(() => fromPriceList())
  return cache
}

export function searchProducts(products, query, limit = 12) {
  const q = String(query || '').trim().toLowerCase()
  if (q.length < 2) return []
  const words = q.split(/\s+/)
  return products
    .filter(p => {
      const n = p.name.toLowerCase()
      return words.every(w => n.includes(w))
    })
    .sort((a, b) => a.name.length - b.name.length)
    .slice(0, limit)
}

/** Link to the product's review section on shop.gelitup.com (or a shop search as fallback). */
export function reviewLink(product) {
  if (product?.handle) return `${SHOP_URL}/products/${encodeURIComponent(product.handle)}#judgeme_product_reviews`
  return `${SHOP_URL}/search?q=${encodeURIComponent(cleanProductName(product?.name || ''))}`
}
