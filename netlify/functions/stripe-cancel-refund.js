// Netlify serverless function — cancels a pending Stripe refund.
// POST { refundId }
//   refundId  required  Stripe re_... ID (returned when the refund was created)
// Returns { refundId, status }
// Requires STRIPE_SECRET_KEY environment variable (set in Netlify dashboard, never exposed to client).
// Note: Only refunds with status "pending" can be cancelled. Succeeded refunds cannot be reversed.

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

  let refundId
  try {
    const body = JSON.parse(event.body || '{}')
    refundId = String(body.refundId || '').trim()
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid request body' }) }
  }

  if (!refundId || !refundId.startsWith('re_')) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Valid refundId (re_...) is required' }) }
  }

  try {
    const res = await fetch(`https://api.stripe.com/v1/refunds/${encodeURIComponent(refundId)}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return {
        statusCode: res.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: data?.error?.message || 'Stripe cancel error' }),
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ refundId: data.id, status: data.status }),
    }
  } catch {
    return {
      statusCode: 502,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Failed to reach Stripe' }),
    }
  }
}
