// @ts-nocheck
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZohoOrderPayload {
  orderId?: string | number
  customerEmail?: string | null
  generatedPackageTier?: string | null
  items?: string[]
  totalUnits?: number
  status?: string
  source?: string
  orderInboxEmail?: string
  shipping?: {
    name?: string
    phone?: string
    address?: string
  }
  zohoTarget?: string
  emittedAt?: string
}

interface ParsedOrderItem {
  sku: string
  qty: number
}

function normalizeSkuCode(value: string) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ')
}

function parseCartLineItem(rawItem: string): ParsedOrderItem {
  const normalized = String(rawItem || '').trim()
  if (!normalized) return { sku: '', qty: 0 }

  const match = normalized.match(/^(.*?)\s*x\s*(\d+)$/i)
  if (match) {
    return {
      sku: normalizeSkuCode(match[1]),
      qty: Number.parseInt(match[2], 10),
    }
  }

  return {
    sku: normalizeSkuCode(normalized),
    qty: 1,
  }
}

function readRequiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) {
    throw new Error(`Missing ${name} secret`)
  }
  return value
}

async function resolveZohoAccessToken() {
  const staticAccessToken = Deno.env.get('ZOHO_BOOKS_ACCESS_TOKEN')
  if (staticAccessToken) {
    return staticAccessToken
  }

  const refreshToken = Deno.env.get('ZOHO_BOOKS_REFRESH_TOKEN')
  const clientId = Deno.env.get('ZOHO_BOOKS_CLIENT_ID')
  const clientSecret = Deno.env.get('ZOHO_BOOKS_CLIENT_SECRET')

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error('Missing Zoho credentials. Set ZOHO_BOOKS_ACCESS_TOKEN or refresh-token credentials.')
  }

  const accountsBaseUrl = Deno.env.get('ZOHO_ACCOUNTS_BASE_URL') || 'https://accounts.zoho.com'
  const tokenUrl = new URL('/oauth/v2/token', accountsBaseUrl)
  tokenUrl.searchParams.set('refresh_token', refreshToken)
  tokenUrl.searchParams.set('client_id', clientId)
  tokenUrl.searchParams.set('client_secret', clientSecret)
  tokenUrl.searchParams.set('grant_type', 'refresh_token')

  const response = await fetch(tokenUrl.toString(), { method: 'POST' })
  const responseJson = await response.json().catch(() => null)

  if (!response.ok || !responseJson?.access_token) {
    throw new Error(`Unable to refresh Zoho access token: ${responseJson?.error || response.status}`)
  }

  return responseJson.access_token as string
}

function buildLineItems(items: string[], itemMap: Record<string, string>) {
  const parsed = items
    .map(parseCartLineItem)
    .filter((item) => item.sku && Number.isFinite(item.qty) && item.qty > 0)

  const lineItems = parsed
    .map((item) => {
      const mappedItemId = itemMap[item.sku]
      if (!mappedItemId) return null

      return {
        item_id: mappedItemId,
        quantity: item.qty,
      }
    })
    .filter(Boolean)

  const unmappedSkus = parsed
    .filter((item) => !itemMap[item.sku])
    .map((item) => item.sku)

  return {
    parsed,
    lineItems,
    unmappedSkus,
  }
}

async function zohoRequest(path: string, accessToken: string, options: RequestInit = {}) {
  const booksBaseUrl = Deno.env.get('ZOHO_BOOKS_BASE_URL') || 'https://www.zohoapis.com/books/v3'
  const organizationId = readRequiredEnv('ZOHO_BOOKS_ORGANIZATION_ID')
  const url = new URL(path, booksBaseUrl)
  url.searchParams.set('organization_id', organizationId)

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.message || `Zoho Books request failed (${response.status})`)
  }

  return data
}

async function findOrCreateContact(accessToken: string, payload: ZohoOrderPayload) {
  const email = payload.customerEmail || ''
  if (!email) {
    throw new Error('customerEmail is required for Zoho sync')
  }

  const listPath = `/contacts?email_contains=${encodeURIComponent(email)}`
  const listResult = await zohoRequest(listPath, accessToken)
  const existing = Array.isArray(listResult?.contacts)
    ? listResult.contacts.find((contact: { email?: string }) => (contact.email || '').toLowerCase() === email.toLowerCase())
    : null

  if (existing?.contact_id) {
    return existing.contact_id as string
  }

  const shipping = payload.shipping || {}
  const contactName = shipping.name || email

  const createResult = await zohoRequest('/contacts', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      contact_name: contactName,
      email,
      phone: shipping.phone || undefined,
      shipping_address: {
        attention: shipping.name || undefined,
        address: shipping.address || undefined,
      },
      contact_type: 'customer',
    }),
  })

  const contactId = createResult?.contact?.contact_id
  if (!contactId) {
    throw new Error('Zoho contact creation succeeded but no contact_id returned')
  }

  return contactId as string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const sharedSecret = Deno.env.get('ZOHO_SYNC_SHARED_SECRET')
    if (sharedSecret) {
      const authHeader = req.headers.get('authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      if (!token || token !== sharedSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const payload = (await req.json()) as ZohoOrderPayload

    if (!Array.isArray(payload?.items) || payload.items.length === 0) {
      return new Response(JSON.stringify({ error: 'Payload must include items[]' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const rawItemMap = Deno.env.get('ZOHO_BOOKS_ITEM_MAP_JSON') || '{}'
    const itemMap = JSON.parse(rawItemMap) as Record<string, string>

    const { lineItems, unmappedSkus } = buildLineItems(payload.items, itemMap)
    if (!lineItems.length) {
      return new Response(JSON.stringify({
        error: 'No mapped line items. Configure ZOHO_BOOKS_ITEM_MAP_JSON with SKU -> item_id entries.',
        unmappedSkus,
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await resolveZohoAccessToken()
    const contactId = await findOrCreateContact(accessToken, payload)

    const notes = [
      `Portal Order #${payload.orderId ?? '-'}`,
      `Tier: ${payload.generatedPackageTier || '-'}`,
      `Total Units: ${payload.totalUnits ?? '-'}`,
      `Source: ${payload.source || 'b2b_portal'}`,
      payload.shipping?.address ? `Ship To: ${payload.shipping.address}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    const salesOrderResult = await zohoRequest('/salesorders', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        customer_id: contactId,
        line_items: lineItems,
        reference_number: payload.orderId ? `PORTAL-${payload.orderId}` : undefined,
        notes,
      }),
    })

    return new Response(JSON.stringify({
      ok: true,
      message: 'Zoho sales order created',
      zohoTarget: payload.zohoTarget || 'books',
      salesorder_id: salesOrderResult?.salesorder?.salesorder_id || null,
      unmappedSkus,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown Zoho sync error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
