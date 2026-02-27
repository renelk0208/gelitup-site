// @ts-nocheck
/**
 * zoho-webhook-receiver
 *
 * Receives Zoho Books webhook events (salesorder.confirmed, invoice.created,
 * invoice.updated, etc.) and updates the matching b2b_orders row in Supabase.
 *
 * Configure in Zoho Books → Settings → Automation → Webhooks:
 *   URL: https://<project-ref>.functions.supabase.co/zoho-webhook-receiver
 *   Events: Invoice Created, Sales Order Confirmed
 *
 * Required Supabase secrets:
 *   SUPABASE_URL                  — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY     — bypass RLS
 *   ZOHO_WEBHOOK_SHARED_SECRET    — optional, Zoho custom header value for auth
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zoho-webhook-token',
}

// ── Supabase REST helper ───────────────────────────────────────────────────────
async function supabaseUpdate(
  table: string,
  match: Record<string, unknown>,
  updates: Record<string, unknown>,
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  // Build WHERE filter from match object
  const filters = Object.entries(match)
    .map(([k, v]) => `${k}=eq.${encodeURIComponent(String(v))}`)
    .join('&')

  const url = `${supabaseUrl}/rest/v1/${table}?${filters}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(updates),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase PATCH failed (${res.status}): ${body}`)
  }

  return await res.json().catch(() => null)
}

// ── Parse PORTAL-{id} reference number ───────────────────────────────────────
function parsePortalOrderId(referenceNumber: string | null | undefined): number | null {
  if (!referenceNumber) return null
  const match = String(referenceNumber).match(/PORTAL-(\d+)/i)
  return match ? Number.parseInt(match[1], 10) : null
}

// ── Handlers ──────────────────────────────────────────────────────────────────
async function handleInvoiceEvent(data: Record<string, unknown>) {
  const invoice = (data?.invoice ?? data) as Record<string, unknown>
  const orderId = parsePortalOrderId(invoice?.reference_number as string)
  if (!orderId) {
    return { handled: false, reason: 'No PORTAL-{id} reference_number on invoice' }
  }

  const updates: Record<string, unknown> = {
    zoho_invoice_id: invoice?.invoice_id ?? null,
    zoho_invoice_number: invoice?.invoice_number ?? null,
    zoho_invoice_total: invoice?.total != null ? Number(invoice.total) : null,
    zoho_invoice_currency: invoice?.currency_code ?? null,
    payment_status: 'invoice_ready',
    status: 'invoice_ready',
  }

  const updated = await supabaseUpdate('b2b_orders', { id: orderId }, updates)
  return { handled: true, orderId, updated }
}

async function handleSalesOrderEvent(data: Record<string, unknown>) {
  const salesorder = (data?.salesorder ?? data) as Record<string, unknown>
  const orderId = parsePortalOrderId(salesorder?.reference_number as string)
  if (!orderId) {
    return { handled: false, reason: 'No PORTAL-{id} reference_number on salesorder' }
  }

  const updates: Record<string, unknown> = {
    zoho_salesorder_id: salesorder?.salesorder_id ?? null,
    zoho_salesorder_number: salesorder?.salesorder_number ?? null,
    status: 'confirmed',
  }

  const updated = await supabaseUpdate('b2b_orders', { id: orderId }, updates)
  return { handled: true, orderId, updated }
}

// ── Main serve ────────────────────────────────────────────────────────────────
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

  // Optional shared-secret auth
  const sharedSecret = Deno.env.get('ZOHO_WEBHOOK_SHARED_SECRET')
  if (sharedSecret) {
    const token
      = req.headers.get('x-zoho-webhook-token')
      || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
      || ''
    if (!token || token !== sharedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const body = await req.json()

    // Zoho Books webhook format: { event_type, data: { invoice | salesorder } }
    const eventType = String(body?.event_type || body?.type || '').toLowerCase()
    const data = body?.data ?? body

    let result: Record<string, unknown>

    if (eventType.includes('invoice')) {
      result = await handleInvoiceEvent(data)
    }
    else if (eventType.includes('salesorder')) {
      result = await handleSalesOrderEvent(data)
    }
    else {
      // Unknown event — acknowledge but don't fail (Zoho retries on non-200)
      result = { handled: false, reason: `Unhandled event_type: ${eventType}` }
    }

    return new Response(JSON.stringify({ ok: true, eventType, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
