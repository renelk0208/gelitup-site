// Netlify serverless function — creates a Stripe refund for a given PaymentIntent.
// POST { paymentIntentId, amountEur?, email? }
//   paymentIntentId  required  Stripe pi_... ID (find in Stripe Dashboard → Payments)
//   amountEur        optional  Partial refund amount in EUR; omit for a full refund
//   email            optional  Customer email for Stripe refund instruction email
// Returns { refundId, status, amount }
// Requires STRIPE_SECRET_KEY environment variable (set in Netlify dashboard, never exposed to client).

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

  let paymentIntentId, amountEur, email
  try {
    const body = JSON.parse(event.body || '{}')
    paymentIntentId = String(body.paymentIntentId || '').trim()
    amountEur = body.amountEur != null ? Number(body.amountEur) : null
    email = body.email ? String(body.email).trim().toLowerCase() : null
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Valid paymentIntentId (pi_...) is required' }) }
  }

  if (amountEur !== null && (!Number.isFinite(amountEur) || amountEur <= 0 || amountEur > 100000)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid amount — must be between 0.01 and 100000 EUR' }) }
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid email address' }) }
  }

  const params = new URLSearchParams()
  params.append('payment_intent', paymentIntentId)
  if (amountEur !== null) {
    params.append('amount', String(Math.round(amountEur * 100)))
  }
  if (email) {
    params.append('instructions_email', email)
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/refunds', {
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
        body: JSON.stringify({ error: data?.error?.message || 'Stripe refund error' }),
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ refundId: data.id, status: data.status, amount: data.amount }),
    }
  } catch {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to reach Stripe' }),
    }
  }
}
