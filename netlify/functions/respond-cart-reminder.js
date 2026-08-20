import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://gelitup.com'
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const CART_REMINDER_ACTION_SECRET = process.env.CART_REMINDER_ACTION_SECRET || SUPABASE_SERVICE_ROLE_KEY

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildCartReminderSignature({ cartId, action, stamp }) {
  return crypto
    .createHmac('sha256', CART_REMINDER_ACTION_SECRET)
    .update(`${cartId}:${action}:${stamp}`)
    .digest('hex')
}

function signaturesMatch(expected, actual) {
  const left = Buffer.from(String(expected || ''), 'utf8')
  const right = Buffer.from(String(actual || ''), 'utf8')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function renderHtml({ title, message, accent = '#111827', ctaHref = `${SITE_ORIGIN}/portal/login`, ctaLabel = 'Open portal' }) {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
      <div style="max-width:560px;margin:0 auto;padding:32px 20px">
        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px;box-shadow:0 12px 32px rgba(15,23,42,0.08)">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8">GEL.IT.UP</p>
          <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:${accent}">${escapeHtml(title)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.6">${message}</p>
          <a href="${escapeHtml(ctaHref)}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:9999px;font-weight:700">${escapeHtml(ctaLabel)}</a>
        </div>
      </div>
    </body>
  </html>`
}

function htmlResponse(statusCode, html) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
    body: html,
  }
}

export async function handler(event) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !CART_REMINDER_ACTION_SECRET) {
    return htmlResponse(500, renderHtml({
      title: 'This link is not ready',
      message: 'The cart action service is missing configuration. Please contact GEL.IT.UP support if you still need help with your cart.',
      accent: '#b91c1c',
      ctaHref: `${SITE_ORIGIN}/contact`,
      ctaLabel: 'Contact support',
    }))
  }

  const action = String(event?.queryStringParameters?.action || '').trim().toLowerCase()
  const cartId = String(event?.queryStringParameters?.cart || '').trim()
  const stamp = String(event?.queryStringParameters?.stamp || '').trim()
  const signature = String(event?.queryStringParameters?.sig || '').trim()

  if (!cartId || !stamp || !signature || !['delete', 'keep'].includes(action)) {
    return htmlResponse(400, renderHtml({
      title: 'Invalid cart link',
      message: 'This cart action link is incomplete or invalid.',
      accent: '#b91c1c',
      ctaHref: SITE_ORIGIN,
      ctaLabel: 'Back to GEL.IT.UP',
    }))
  }

  const expectedSignature = buildCartReminderSignature({ cartId, action, stamp })
  if (!signaturesMatch(expectedSignature, signature)) {
    return htmlResponse(403, renderHtml({
      title: 'This link could not be verified',
      message: 'For your security, this cart action link is no longer valid.',
      accent: '#b91c1c',
      ctaHref: `${SITE_ORIGIN}/portal/login`,
      ctaLabel: 'Open portal',
    }))
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const { data: cart, error: cartError } = await supabase
    .from('b2b_draft_carts')
    .select('id,customer_email,updated_at,created_at')
    .eq('id', cartId)
    .maybeSingle()

  if (cartError) {
    return htmlResponse(500, renderHtml({
      title: 'Could not open cart action',
      message: `We could not load this cart right now (${escapeHtml(cartError.message)}).`,
      accent: '#b91c1c',
      ctaHref: `${SITE_ORIGIN}/portal/login`,
      ctaLabel: 'Open portal',
    }))
  }

  if (!cart) {
    return htmlResponse(404, renderHtml({
      title: 'Cart not found',
      message: 'This saved cart could not be found anymore.',
      accent: '#b91c1c',
      ctaHref: SITE_ORIGIN,
      ctaLabel: 'Back to GEL.IT.UP',
    }))
  }

  const currentStamp = String(cart.updated_at || cart.created_at || '').trim()
  if (currentStamp !== stamp) {
    return htmlResponse(409, renderHtml({
      title: 'This cart has changed',
      message: 'Your cart was updated after this email was sent, so this old link can no longer be used. Please open your latest cart instead.',
      accent: '#1d4ed8',
      ctaHref: `${SITE_ORIGIN}/portal/login`,
      ctaLabel: 'Open portal',
    }))
  }

  const nowIso = new Date().toISOString()
  const updatePayload = action === 'delete'
    ? {
        items: {},
        total_units: 0,
        total_estimated: 0,
        updated_at: nowIso,
        customer_action: 'delete',
        customer_action_at: nowIso,
        customer_action_note: 'Customer clicked "Delete contents of cart" from the abandoned cart reminder email.',
      }
    : {
        updated_at: nowIso,
        customer_action: 'keep',
        customer_action_at: nowIso,
        customer_action_note: 'Customer clicked "I will check out later (keep contents)" from the abandoned cart reminder email.',
      }

  const { error: updateError } = await supabase
    .from('b2b_draft_carts')
    .update(updatePayload)
    .eq('id', cartId)

  if (updateError) {
    return htmlResponse(500, renderHtml({
      title: 'Could not save your choice',
      message: `We could not record your cart preference right now (${escapeHtml(updateError.message)}).`,
      accent: '#b91c1c',
      ctaHref: `${SITE_ORIGIN}/portal/login`,
      ctaLabel: 'Open portal',
    }))
  }

  if (action === 'delete') {
    return htmlResponse(200, renderHtml({
      title: 'Your saved cart has been cleared',
      message: 'We removed the saved items from your cart and recorded your request for the GEL.IT.UP team.',
      accent: '#b91c1c',
      ctaHref: SITE_ORIGIN,
      ctaLabel: 'Continue shopping',
    }))
  }

  return htmlResponse(200, renderHtml({
    title: 'Your cart has been kept for later',
    message: 'We kept your saved cart and paused future reminder emails until you change the cart again.',
    accent: '#1d4ed8',
    ctaHref: `${SITE_ORIGIN}/portal/login`,
    ctaLabel: 'Resume cart later',
  }))
}
