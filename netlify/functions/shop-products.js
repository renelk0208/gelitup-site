// Lists the products on shop.gelitup.com (title, handle, photo) so the
// ambassador admin can link each product to its review form.
// Read from the shop's public product feed; nothing is changed in Shopify.

const SHOP = 'https://shop.gelitup.com'
let cache = { at: 0, products: null }

async function loadAll() {
  const out = []
  for (let page = 1; page <= 20; page += 1) {
    const res = await fetch(`${SHOP}/products.json?limit=250&page=${page}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`shop feed ${res.status}`)
    const json = await res.json()
    const list = Array.isArray(json?.products) ? json.products : []
    for (const p of list) {
      out.push({
        handle: p.handle,
        title: String(p.title || '').replace(/\s*-\s*HTF\s*$/i, '').trim(),
        image: p.images?.[0]?.src || p.image?.src || '',
        type: p.product_type || '',
      })
    }
    if (list.length < 250) break
  }
  return out
}

export async function handler() {
  try {
    if (!cache.products || Date.now() - cache.at > 30 * 60 * 1000) {
      cache = { at: Date.now(), products: await loadAll() }
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
      body: JSON.stringify({ products: cache.products }),
    }
  } catch (err) {
    console.error('shop-products:', err?.message || err)
    return { statusCode: 502, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Could not load the shop products' }) }
  }
}
