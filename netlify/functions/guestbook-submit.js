const TABLE = 'guestbook'
const VALID_ROLES = ['Nail Technician', 'Salon Owner', 'Distributor', 'Educator']

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Database not configured.' }),
    }
  }

  let payload
  try {
    payload = JSON.parse(event.body)
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body.' }),
    }
  }

  // Honeypot — if the hidden field is filled, silently accept but don't store
  if (payload.website) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }
  }

  const { name, country, role, comment, anonymous, rating } = payload

  // Validation
  if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Name is required (max 100 chars).' }) }
  }
  if (!country || typeof country !== 'string' || country.trim().length < 1 || country.trim().length > 100) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Country is required (max 100 chars).' }) }
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Valid role is required.' }) }
  }
  if (!comment || typeof comment !== 'string' || comment.trim().length < 10 || comment.trim().length > 1000) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Comment must be 10–1,000 characters.' }) }
  }
  const ratingValue = rating != null && Number.isInteger(Number(rating)) && Number(rating) >= 1 && Number(rating) <= 5 ? Number(rating) : null

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${TABLE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        name: name.trim(),
        country: country.trim(),
        role,
        message: comment.trim(),
        rating: ratingValue,
        anonymous: !!anonymous,
        approved: false,
        featured: false,
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('[guestbook-submit] Insert error:', res.status, errBody)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to save entry.' }),
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    }
  } catch (err) {
    console.error('[guestbook-submit] Unexpected error:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Server error: ${err.message}` }),
    }
  }
}
