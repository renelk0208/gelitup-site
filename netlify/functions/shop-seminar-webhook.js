import { createClient } from '@supabase/supabase-js'
import { seminarCodeEmail } from '../../src/lib/seminarEmail.js'

// Shopify (shop.gelitup.com) calls this when an order is paid ("orders/paid").
// For every seminar seat in the order (matched by the seminar date's SKU, set
// in gelitup.com/seminars/admin), one personal access code is created and the
// codes are emailed to the buyer. Retries are safe: a repeated call returns the
// codes already made and does not email twice.
// The webhook address carries the private key SHOP_SEMINAR_WEBHOOK_KEY.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SHOP_SEMINAR_WEBHOOK_KEY || process.env.SHOP_ORDER_WEBHOOK_KEY || ''
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const EMAIL_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY

async function sendEmail(to, subject, html) {
  const res = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: EMAIL_KEY, Authorization: `Bearer ${EMAIL_KEY}` },
    body: JSON.stringify({ to, subject, html, from: 'GEL.IT.UP Seminars <info@gelitup.com>', replyTo: 'info@gelitup.com' }),
  })
  if (!res.ok) throw new Error(`email webhook ${res.status}`)
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  const key = String(event.queryStringParameters?.key || '')
  if (!WEBHOOK_KEY || key !== WEBHOOK_KEY) return { statusCode: 401, body: 'Unauthorized' }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: 'Not configured' }

  let order
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '')
    order = JSON.parse(raw)
  } catch {
    return { statusCode: 400, body: 'Bad JSON' }
  }

  const lines = (order?.line_items || []).filter((l) => String(l?.sku || '').trim())
  const email = order?.email || order?.contact_email || order?.customer?.email
  if (!lines.length || !email) return { statusCode: 200, body: JSON.stringify({ ok: true, seminars: [] }) }

  const name = [order?.customer?.first_name || order?.billing_address?.first_name, order?.customer?.last_name || order?.billing_address?.last_name].filter(Boolean).join(' ')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const issued = []

  for (const line of lines) {
    const { data, error } = await supabase.rpc('seminar_issue_order_codes', {
      p_sku: String(line.sku).trim(),
      p_order_id: String(order.id),
      p_order_ref: String(order.name || order.id),
      p_line_id: String(line.id),
      p_qty: Number(line.quantity || 1),
      p_email: email,
      p_name: name || null,
    })
    if (error) {
      console.error('shop-seminar-webhook:', error.message)
      return { statusCode: 500, body: 'Could not issue codes' } // Shopify retries
    }
    if (!data) continue // not a seminar SKU (e.g. the seminar kit or other products)
    issued.push(data.codes.length)
    if (data.fresh && EMAIL_WEBHOOK_URL) {
      const { subject, html } = seminarCodeEmail({ name, email, codes: data.codes, seminar: data.seminar, accessType: data.access_type })
      try {
        await sendEmail(email, subject, html)
        await supabase.from('seminar_access_codes').update({ emailed_at: new Date().toISOString() }).in('code', data.codes)
      } catch (err) {
        console.error('shop-seminar-webhook: email failed', order.name, err.message)
      }
    }
  }
  // Private 1-to-1 session paid via the link we emailed (cart attribute private_request=<request id>).
  const attrs = Array.isArray(order?.note_attributes) ? order.note_attributes : []
  const privateId = String(attrs.find((a) => a?.name === 'private_request')?.value || '').trim()
  if (/^[0-9a-f-]{36}$/i.test(privateId)) {
    const { data: reqRow, error: pErr } = await supabase.from('seminar_private_requests')
      .update({ status: 'paid', paid_at: new Date().toISOString(), order_ref: String(order.name || order.id) })
      .eq('id', privateId).is('paid_at', null).select('id, name, email, confirmed_start').maybeSingle()
    if (pErr) console.error('shop-seminar-webhook: private paid', pErr.message)
    if (reqRow && EMAIL_WEBHOOK_URL) {
      const when = reqRow.confirmed_start ? new Date(reqRow.confirmed_start).toLocaleString('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' }) : 'date to confirm'
      const esc = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      try {
        await sendEmail('seminars@gelitup.com', `PAID — private session — ${reqRow.name} (${order.name})`,
          `<div style="font-family:Arial,sans-serif"><h2 style="color:#D43790">Private session paid</h2><p><strong>${esc(reqRow.name)}</strong> (${esc(reqRow.email)}) has paid order <strong>${esc(order.name)}</strong>.</p><p>Session: <strong>${esc(when)}</strong>.</p><p>Next: send them the link to join (e.g. a private Vimeo or Zoom link) by replying to them.</p><p><a href="https://gelitup.com/seminars/admin/private/${privateId}">Open the request →</a></p></div>`)
      } catch (err) { console.error('shop-seminar-webhook: private email failed', err.message) }
    }
  }

  console.log('shop-seminar-webhook', order.name, JSON.stringify({ issued }))
  return { statusCode: 200, body: JSON.stringify({ ok: true, issued }) }
}
