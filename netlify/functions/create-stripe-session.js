// Netlify serverless function — creates a Stripe Checkout Session for B2B / distributor order payment.
// POST { orderId, amountEur, email, countryCode }
// Returns { url } — the Stripe-hosted checkout page URL (supports cards, Google Pay, Apple Pay).
// Requires STRIPE_SECRET_KEY environment variable (set in Netlify dashboard, never exposed to client).

const SITE_ORIGIN = 'https://gelitup.com'

// EU member states (no VAT for B2B within EU)
const EU_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return { statusCode: 503, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Payment service not configured' }) }
  }

  let orderId, amountEur, email, countryCode
  try {
    const body = JSON.parse(event.body || '{}')
    orderId = String(body.orderId || '').trim()
    amountEur = Number(body.amountEur)
    email = String(body.email || '').trim().toLowerCase()
    countryCode = String(body.countryCode || '').trim().toUpperCase()
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!orderId) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'orderId is required' }) }
  }
  if (!Number.isFinite(amountEur) || amountEur < 1 || amountEur > 100000) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid amount' }) }
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Valid email is required' }) }
  }

  const amountCents = Math.round(amountEur * 100)
  const successUrl = `${SITE_ORIGIN}/?payment=success&order=${encodeURIComponent(orderId)}`
  const cancelUrl = `${SITE_ORIGIN}/`

  // Determine if customer is within EU
  const isEU = EU_COUNTRIES.has(countryCode)

  // Build Stripe API request using application/x-www-form-urlencoded (no SDK needed)
  const params = new URLSearchParams()
  params.append('mode', 'payment')
  params.append('success_url', successUrl)
  params.append('cancel_url', cancelUrl)
  params.append('customer_email', email)
  
  // EU customers: no VAT. Non-EU customers: enable automatic tax calculation
  if (!isEU) {
    params.append('automatic_tax[enabled]', 'true')
  } else {
    params.append('automatic_tax[enabled]', 'false')
  }
  
  params.append('line_items[0][price_data][currency]', 'eur')
  params.append('line_items[0][price_data][product_data][name]', `GEL.IT.UP Order #${orderId}`)
  params.append('line_items[0][price_data][unit_amount]', String(amountCents))
  params.append('line_items[0][price_data][tax_behavior]', 'exclusive')
  params.append('line_items[0][quantity]', '1')
  // Google Pay and Apple Pay are enabled automatically by Stripe Checkout when cards are configured

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: data?.error?.message || 'Stripe error' }),
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ url: data.url }),
    }
  } catch {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to reach Stripe' }),
    }
  }
}
