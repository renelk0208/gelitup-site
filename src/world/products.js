import { cleanProductName } from './config'

// Product list for the "Which products did you use?" picker and for
// product thumbnails on entry pages. Loaded once, on demand.
let cache = null

export async function loadProducts() {
  if (cache) return cache
  cache = (async () => {
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
      out.push({ name, sku: item.sku, image: imgByKey[key] || images[item.name] || images[item.sku] || '' })
    }
    return out
  })()
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
    .slice(0, limit)
}

export async function productImage(name) {
  const products = await loadProducts()
  const key = cleanProductName(name).toLowerCase()
  return products.find(p => p.name.toLowerCase() === key)?.image || ''
}
