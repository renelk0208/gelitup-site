const TIER_DISCOUNTS = {
  salon: {
    name: 'Salon',
    defaultDiscount: 12,
    products: {
      'Professional System Essentials': 12,
    },
  },
  distributor: {
    name: 'Distributor',
    defaultDiscount: 25,
    products: {
      'Branded Display Stands': 30,
      'Marketing Swatch Books': 22,
    },
  },
  privateLabel: {
    name: 'Private Label',
    defaultDiscount: 18,
    products: {
      'Label Compliance Review': 18,
      'Bulk Packaging Fulfillment': 20,
    },
  },
}

const DEFAULT_UPSELLS = {
  salon: {
    productName: 'Professional System Essentials',
    basePrice: 79,
  },
  distributor: {
    productName: 'Branded Display Stands',
    basePrice: 320,
  },
  privateLabel: {
    productName: 'Label Compliance Review',
    basePrice: 590,
  },
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(payload),
  }
}

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase()
}

function resolveTier({ totalItems = 0, userRole = '' }) {
  const role = normalizeRole(userRole)

  if (role.includes('manufacturer')) {
    return 'privateLabel'
  }

  if (Number(totalItems) >= 500) {
    return 'distributor'
  }

  if (Number(totalItems) >= 20) {
    return 'salon'
  }

  return null
}

async function validateUserToken(accessToken) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseApiKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseApiKey) {
    return { ok: false, message: 'Supabase auth environment variables are missing.' }
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseApiKey,
    },
  })

  if (!response.ok) {
    return { ok: false, message: 'Invalid or expired token.' }
  }

  const user = await response.json()
  return { ok: true, user }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true })
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed.' })
  }

  const authHeader = event.headers.authorization || event.headers.Authorization
  const accessToken = String(authHeader || '').replace(/^Bearer\s+/i, '').trim()

  if (!accessToken) {
    return json(401, { ok: false, message: 'Missing Bearer token.' })
  }

  const authResult = await validateUserToken(accessToken)
  if (!authResult.ok) {
    return json(401, { ok: false, message: authResult.message })
  }

  let payload = {}
  try {
    payload = event.body ? JSON.parse(event.body) : {}
  }
  catch {
    return json(400, { ok: false, message: 'Invalid JSON payload.' })
  }

  const userMeta = authResult.user?.user_metadata || {}
  const totalItems = Number(payload.totalItems || 0)
  const userRole = payload.userRole || userMeta.role || userMeta.account_type || userMeta.customer_type || ''
  const tierKey = resolveTier({ totalItems, userRole })

  if (!tierKey) {
    return json(200, {
      ok: true,
      eligible: false,
      message: 'No tier eligible for upsell pricing yet.',
    })
  }

  const tier = TIER_DISCOUNTS[tierKey]
  const fallback = DEFAULT_UPSELLS[tierKey]
  const productName = String(payload.productName || fallback.productName)
  const basePrice = Number(payload.basePrice || fallback.basePrice)
  const productDiscount = Number(tier.products[productName] ?? tier.defaultDiscount)
  const discountedPrice = Number((Math.max(0, basePrice) * (1 - productDiscount / 100)).toFixed(2))

  return json(200, {
    ok: true,
    eligible: true,
    tierKey,
    tierName: tier.name,
    productName,
    discountPercent: productDiscount,
    basePrice,
    discountedPrice,
  })
}
