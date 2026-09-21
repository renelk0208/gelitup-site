import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const productsTable = process.env.B2B_PRODUCTS_TABLE || 'b2b_products'
const productsApi = process.env.GELITUP_PRODUCTS_API || 'https://gelitup.gr/wp-json/wc/store/v1/products'
const perPage = Number.parseInt(process.env.GELITUP_PRODUCTS_PER_PAGE || '100', 10)
const maxPages = Number.parseInt(process.env.GELITUP_PRODUCTS_MAX_PAGES || '20', 10)

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false },
})

function stripHtml(value = '') {
  return String(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeProduct(item) {
  const sku = item.sku || `GIUP-${item.id}`
  const minorUnit = Number(item?.prices?.currency_minor_unit ?? 2)
  const rawPrice = Number(item?.prices?.price ?? 0)

  return {
    sku,
    name: stripHtml(item.name || sku),
    description: stripHtml(item.description || item.short_description || ''),
    category: item?.categories?.[0]?.name || 'Uncategorized',
    hex_color: null,
    price_wholesale: Number.isFinite(rawPrice) ? rawPrice / 10 ** minorUnit : null,
    currency: item?.prices?.currency_code || 'EUR',
    stock_qty: Number.isFinite(item.stock_quantity) ? item.stock_quantity : 0,
    is_active: item.is_in_stock !== false,
    image_url: item?.images?.[0]?.src || null,
    source: 'gelitup.gr',
    external_id: String(item.id),
    metadata: {
      permalink: item.permalink || null,
      on_sale: item.on_sale || false,
      average_rating: item.average_rating || null,
      review_count: item.review_count || 0,
    },
  }
}

async function fetchPage(page) {
  const url = new URL(productsApi)
  if (!url.searchParams.has('page')) url.searchParams.set('page', String(page))
  if (!url.searchParams.has('per_page')) url.searchParams.set('per_page', String(perPage))

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch products page ${page}: ${response.status}`)
  }

  const data = await response.json()
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected response format on page ${page}`)
  }

  return data
}

async function syncProducts() {
  const allProducts = []

  for (let page = 1; page <= maxPages; page += 1) {
    const pageItems = await fetchPage(page)
    if (pageItems.length === 0) break

    allProducts.push(...pageItems)
    console.log(`Fetched page ${page}: ${pageItems.length} items`)

    if (pageItems.length < perPage) break
  }

  if (!allProducts.length) {
    console.log('No products found to sync.')
    return
  }

  const normalized = allProducts.map(normalizeProduct)

  const { error } = await supabase
    .from(productsTable)
    .upsert(normalized, { onConflict: 'sku' })

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`)
  }

  console.log(`Synced ${normalized.length} products into ${productsTable}`)
}

syncProducts().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
