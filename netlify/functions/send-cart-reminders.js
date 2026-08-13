import { createClient } from '@supabase/supabase-js'

export const config = {
  schedule: '@weekly',
}

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://gelitup.com'
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const REMINDER_LOOKBACK_DAYS = 7
const REMINDER_CUTOFF_MS = REMINDER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return null
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(amount)
}

function normalizeDraftCartItems(cart) {
  const rawItems = cart?.items
  if (!rawItems) return []

  if (typeof rawItems === 'string') {
    try {
      return normalizeDraftCartItems({ ...cart, items: JSON.parse(rawItems) })
    } catch {
      return []
    }
  }

  const toLine = (item, fallbackKey = '') => {
    const qty = Math.max(1, Number(item?.qty ?? item?.quantity ?? item?.count ?? 1) || 1)
    const label = String(item?.name || item?.description || item?.label || fallbackKey || 'Cart item').trim()
    const code = String(item?.code || item?.sku || '').trim()
    return {
      label: code ? `${label} (${code})` : label,
      qty,
    }
  }

  if (Array.isArray(rawItems)) {
    return rawItems.map((item) => toLine(item))
  }

  if (Array.isArray(rawItems.products) || Array.isArray(rawItems.packages)) {
    return [
      ...(Array.isArray(rawItems.products) ? rawItems.products.map((item) => toLine(item, item?.code || item?.sku || '')) : []),
      ...(Array.isArray(rawItems.packages) ? rawItems.packages.map((item) => toLine(item, item?.sku || '')) : []),
    ]
  }

  if (typeof rawItems === 'object') {
    return Object.entries(rawItems).map(([key, value]) => {
      const qty = Math.max(1, Number(value) || 1)
      const [namePart, codePart] = String(key || '').split('::')
      const label = String(namePart || codePart || key || 'Cart item').trim()
      return {
        label: codePart ? `${label} (${codePart.trim()})` : label,
        qty,
      }
    })
  }

  return []
}

function buildReminderEmail(cart, items) {
  const resumeLink = `${SITE_ORIGIN}/portal/login`
  const email = String(cart?.customer_email || '').trim()
  const subject = 'Your GEL.IT.UP cart is waiting'
  const itemList = items.length
    ? `<ul style="margin:16px 0;padding-left:20px;">${items.map((item) => `<li>${escapeHtml(item.label)} x ${item.qty}</li>`).join('')}</ul>`
    : '<p style="margin:16px 0;">Your saved cart is still waiting.</p>'

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1f2937">
      <p>Hi${email ? ` ${escapeHtml(email)}` : ''},</p>
      <p>You still have items left in your GEL.IT.UP cart.</p>
      ${itemList}
      <p><strong>Total units:</strong> ${Number(cart?.total_units || 0)}</p>
      ${cart?.total_estimated != null ? `<p><strong>Estimated total:</strong> ${escapeHtml(formatMoney(cart.total_estimated) || '')}</p>` : ''}
      <p>
        <a href="${resumeLink}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700">
          Resume your cart
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px">If you already completed your order, you can ignore this email.</p>
    </div>
  `

  return { subject, html, replyTo: 'distribution@gelitup.com' }
}

async function sendReminderEmail(cart, items) {
  if (!EMAIL_WEBHOOK_URL) {
    throw new Error('Missing email webhook URL')
  }

  const { subject, html, replyTo } = buildReminderEmail(cart, items)
  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: cart.customer_email,
      subject,
      html,
      replyTo,
      from: 'GEL.IT.UP Distributors <distributors@gelitup.com>',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Reminder email failed: ${text.slice(0, 200)}`)
  }
}

export async function handler() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase service credentials for cart reminders' }),
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  const cutoffIso = new Date(Date.now() - REMINDER_CUTOFF_MS).toISOString()
  const { data: carts, error } = await supabase
    .from('b2b_draft_carts')
    .select('id,user_id,customer_email,items,total_units,total_estimated,source,updated_at,created_at,last_reminder_sent_at,reminder_count')
    .not('customer_email', 'is', null)
    .neq('customer_email', '')
    .gt('total_units', 0)
    .lte('updated_at', cutoffIso)
    .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lte.${cutoffIso}`)
    .order('updated_at', { ascending: true })
    .limit(100)

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load draft carts: ${error.message}` }),
    }
  }

  const results = []

  for (const cart of carts || []) {
    const items = normalizeDraftCartItems(cart)

    if (!items.length) {
      results.push({ id: cart.id, status: 'skipped', reason: 'empty_items' })
      continue
    }

    try {
      await sendReminderEmail(cart, items)
      const { error: updateError } = await supabase
        .from('b2b_draft_carts')
        .update({
          last_reminder_sent_at: new Date().toISOString(),
          reminder_count: Number(cart.reminder_count || 0) + 1,
        })
        .eq('id', cart.id)

      if (updateError) {
        results.push({ id: cart.id, status: 'sent_but_not_marked', reason: updateError.message })
        continue
      }

      results.push({ id: cart.id, status: 'sent' })
    } catch (sendError) {
      results.push({ id: cart.id, status: 'failed', reason: sendError instanceof Error ? sendError.message : 'Unknown error' })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      checked: carts?.length || 0,
      results,
    }),
  }
}
