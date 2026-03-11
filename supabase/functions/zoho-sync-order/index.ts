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

// Strip trailing variant tags (-HTF, -HTE, HEMA FREE, NEW) so that a short
// catalog code like "01" will also match "01 Ice Ice Baby -HTF" entries in the
// item map (which is pre-indexed under both forms by fetch-zoho-item-map.mjs).
// NOTE: # is preserved intentionally — Zoho SKUs containing # must stay intact.
function stripVariantSuffix(value: string) {
  return normalizeSkuCode(value).replace(/\s*[-–]\s*(HTF|HTE|HEMA[- ]FREE|NEW)\s*$/i, '').trim()
}

// Pad/unpad numeric part: "1" → ["1", "01", "001"]
function numVariants(n: string, sfx = ''): string[] {
  const i = parseInt(n, 10)
  return [String(i), String(i).padStart(2,'0'), String(i).padStart(3,'0')].map(p => `${p}${sfx}`)
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

  // Resolve an item.sku against the map trying multiple key forms so that
  // short catalog codes match full Zoho SKUs (e.g. "01" → "01 ICE ICE BABY -HTF",
  // "PMA 1" → "PMA #1 CHAMPAGNE BLIZZARD -HTF", "NYP01" → "NEW YORK PARTY #NYP01").
  // # is preserved in all keys — never stripped — because Zoho stores it.
  function resolveItemId(sku: string): string | undefined {
    if (itemMap[sku]) return itemMap[sku]

    const stripped = stripVariantSuffix(sku)
    if (stripped !== sku && itemMap[stripped]) return itemMap[stripped]

    // 1. Leading numeric code: "01 Ice Ice Baby" → try "01", "1", "001"
    const leadMatch = stripped.match(/^(\d+[A-Z]?)\s/)
    if (leadMatch) {
      const short = leadMatch[1]
      if (itemMap[short]) return itemMap[short]
      const num = short.match(/^(\d+)([A-Z]?)$/)
      if (num) {
        for (const k of numVariants(num[1], num[2] || '')) {
          if (itemMap[k]) return itemMap[k]
        }
      }
    }

    // 2. Series+hash prefix: "PMA #1" / "PMA 1" / "PMA01" — try all forms
    const seriesMatch = stripped.match(/^([A-Z]+)\s*#?\s*(\d+[A-Z]?)\b/i)
    if (seriesMatch) {
      const s = seriesMatch[1].toUpperCase()
      const n = seriesMatch[2]
      const numM = n.match(/^(\d+)([A-Z]?)$/)
      const nums = numM ? numVariants(numM[1], numM[2] || '') : [n]
      for (const p of nums) {
        for (const k of [`${s} ${p}`, `${s}${p}`, `${s} #${p}`, `${s}#${p}`]) {
          if (itemMap[k]) return itemMap[k]
        }
      }
    }

    // 3. Embedded #CODE: "NYP01" / "NYP 01" — try both with and without space
    const embeddedMatch = stripped.match(/#([A-Z]+)(\d+[A-Z]?)\b/i)
    if (embeddedMatch) {
      const s = embeddedMatch[1].toUpperCase()
      const n = embeddedMatch[2]
      const numM = n.match(/^(\d+)([A-Z]?)$/)
      const nums = numM ? numVariants(numM[1], numM[2] || '') : [n]
      for (const p of nums) {
        for (const k of [`${s} ${p}`, `${s}${p}`, `${s}#${p}`]) {
          if (itemMap[k]) return itemMap[k]
        }
      }
    }

    return undefined
  }

  const lineItems = parsed
    .map((item) => {
      const mappedItemId = resolveItemId(item.sku)
      if (!mappedItemId) return null

      return {
        item_id: mappedItemId,
        quantity: item.qty,
      }
    })
    .filter(Boolean)

  const unmappedSkus = parsed
    .filter((item) => !resolveItemId(item.sku))
    .map((item) => item.sku)

  return {
    parsed,
    lineItems,
    unmappedSkus,
  }
}

function readBooleanEnv(value: string | undefined, fallback = false) {
  if (value == null) return fallback
  const normalized = String(value).trim().toLowerCase()
  if (!normalized) return fallback
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

async function updateOrderInSupabase(orderId: string | number, updates: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return // non-critical — skip silently

  const url = `${supabaseUrl}/rest/v1/b2b_orders?id=eq.${orderId}`
  await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(updates),
  }).catch(() => undefined) // non-critical — never throw
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

    // Load item map from DB table (too large for a Supabase secret)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const itemMapResp = await fetch(
      `${supabaseUrl}/rest/v1/zoho_item_map?select=sku,item_id&limit=20000`,
      { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` } },
    )
    if (!itemMapResp.ok) {
      throw new Error(`Failed to load item map from database: HTTP ${itemMapResp.status}`)
    }
    const itemMapRows = await itemMapResp.json() as Array<{ sku: string; item_id: string }>
    const itemMap = Object.fromEntries(itemMapRows.map(r => [r.sku, r.item_id]))

    const { parsed, lineItems, unmappedSkus } = buildLineItems(payload.items, itemMap)
    if (!lineItems.length) {
      return new Response(JSON.stringify({
        error: 'No mapped line items. Ensure zoho_item_map table is populated (run supabase/sql/create_zoho_item_map.sql).',
        unmappedSkus,
      }), {
        status: 422,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allowPartialItemMap = readBooleanEnv(Deno.env.get('ZOHO_ALLOW_PARTIAL_ITEM_MAP'), false)
    if (unmappedSkus.length && !allowPartialItemMap) {
      return new Response(JSON.stringify({
        error: 'Unmapped SKUs detected. Sync aborted to prevent partial Zoho order. Re-run create_zoho_item_map.sql to refresh.',
        totalParsedItems: parsed.length,
        mappedItems: lineItems.length,
        unmappedItems: unmappedSkus.length,
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

    const salesorderId = salesOrderResult?.salesorder?.salesorder_id ?? null
    const salesorderNumber = salesOrderResult?.salesorder?.salesorder_number ?? null

    // Write zoho_salesorder_id back to Supabase (non-blocking)
    if (payload.orderId && salesorderId) {
      await updateOrderInSupabase(payload.orderId, {
        zoho_salesorder_id: salesorderId,
        zoho_salesorder_number: salesorderNumber,
        status: 'zoho_synced',
      })
    }

    return new Response(JSON.stringify({
      ok: true,
      message: 'Zoho sales order created',
      zohoTarget: payload.zohoTarget || 'books',
      salesorder_id: salesorderId,
      salesorder_number: salesorderNumber,
      totalParsedItems: parsed.length,
      mappedItems: lineItems.length,
      unmappedSkus,
      partialMappingUsed: unmappedSkus.length > 0,
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
