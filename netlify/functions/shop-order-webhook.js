import { createClient } from '@supabase/supabase-js'

// Shopify (shop.gelitup.com) calls this for every new order ("orders/create").
// When the order used an ambassador code, it is recorded for that ambassador:
// it appears on her profile with the credit earned, and the hourly
// send-ambassador-code-order-congrats job emails her.
// The webhook address carries a private key (SHOP_ORDER_WEBHOOK_KEY); calls
// without it are refused.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SHOP_ORDER_WEBHOOK_KEY || ''

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  const key = String(event.queryStringParameters?.key || '')
  if (!WEBHOOK_KEY || key !== WEBHOOK_KEY) return { statusCode: 401, body: 'Unauthorized' }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: 'Not configured' }

  let order
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '')
    order = JSON.parse(raw)
  } catch {
    return { statusCode: 400, body: 'Bad JSON' }
  }

  const codes = (order?.discount_codes || []).filter((d) => d?.code)
  if (!codes.length || order?.test) return { statusCode: 200, body: JSON.stringify({ ok: true, recorded: [] }) }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const subtotal = Number(order.current_subtotal_price ?? order.subtotal_price ?? 0)
  const country = order.shipping_address?.country_code || order.billing_address?.country_code || null
  const recorded = []
  for (const d of codes) {
    const { data, error } = await supabase.rpc('record_shop_ambassador_redemption', {
      p_code: String(d.code),
      p_order_ref: String(order.name || order.id),
      p_customer_email: order.email || order.contact_email || null,
      p_discount_amount: Number(d.amount || 0),
      p_order_total: subtotal,
      p_country: country,
      p_ordered_at: order.created_at || new Date().toISOString(),
    })
    if (error) {
      console.error('shop-order-webhook:', error.message)
      return { statusCode: 500, body: 'Could not record' } // Shopify retries
    }
    if (data) recorded.push(String(d.code).toUpperCase())
  }
  console.log('shop-order-webhook', order.name, JSON.stringify({ recorded }))
  return { statusCode: 200, body: JSON.stringify({ ok: true, recorded }) }
}
