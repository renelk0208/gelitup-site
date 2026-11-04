import { createClient } from '@supabase/supabase-js'

// Booking panel data for gelitup.com/seminars: the seat (matched by the
// seminar date's SKU) and the seminar kit with all its choices and prices,
// read live from the public product pages on shop.gelitup.com. The website
// then sends the customer straight to Shopify checkout with a cart link.
// Read-only: nothing is changed in Shopify or the database.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY || ''
const SHOP = 'https://shop.gelitup.com'
const cache = new Map()

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  body: JSON.stringify(body),
})

function handleFrom(url) {
  const m = String(url || '').match(/\/products\/([^/?#]+)/)
  return m ? m[1] : ''
}

async function product(handle) {
  if (!handle) return null
  const hit = cache.get(handle)
  if (hit && Date.now() - hit.at < 5 * 60 * 1000) return hit.data
  const res = await fetch(`${SHOP}/products/${handle}.js`, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  cache.set(handle, { at: Date.now(), data })
  return data
}

const euro = (cents) => (cents == null ? null : Number(cents) / 100)

export async function handler(event) {
  const id = String(event.queryStringParameters?.id || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: 'bad id' })
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(500, { error: 'not configured' })

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  const { data: s } = await supabase
    .from('seminars')
    .select('id, title, starts_at, status, kind, sold_out, shopify_sku, shop_url, kit_url')
    .eq('id', id)
    .maybeSingle()
  if (!s || s.kind !== 'group' || s.status !== 'scheduled') return json(404, { error: 'not found' })

  const [seatProduct, kitProduct] = await Promise.all([product(handleFrom(s.shop_url)), product(handleFrom(s.kit_url))])
  const seatVariant = seatProduct?.variants?.find((v) => String(v.sku || '').trim() === String(s.shopify_sku || '').trim())

  const kit = kitProduct
    ? {
        title: kitProduct.title,
        description: kitProduct.description,
        image: kitProduct.featured_image ? `https:${String(kitProduct.featured_image).replace(/^https?:/, '')}` : null,
        options: (kitProduct.options || []).map((o) => ({ name: o.name, values: o.values })),
        variants: (kitProduct.variants || []).map((v) => ({
          id: v.id,
          options: v.options,
          price: euro(v.price),
          compareAt: euro(v.compare_at_price),
          available: v.available,
        })),
      }
    : null

  return json(200, {
    soldOut: Boolean(s.sold_out),
    seat: seatVariant ? { id: seatVariant.id, price: euro(seatVariant.price), available: seatVariant.available } : null,
    kit,
    checkoutBase: `${SHOP}/cart/`,
  })
}
