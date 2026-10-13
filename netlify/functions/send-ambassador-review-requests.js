import { createClient } from '@supabase/supabase-js'
import { receivedItems } from '../../src/lib/reviewProducts.js'
import { buildAmbassadorReviewRequestEmail } from '../../src/lib/reviewEmail.js'

// Daily: asks ambassadors to review the products they received, one week after
// the package arrived. One email per ambassador, listing every product that is
// ready, in her language, each with a button to its Judge.me review form.
//
// "Arrived" = she (or the admin) marked it received, plus 7 days. Packages
// nobody marked as received count from 21 days after sending.
// Only products that match a shop product are included; generic lines such as
// "3 different Cat Eye shades" are left for the admin to pick by hand
// ("★ Ask for reviews" in Shipments). Products already asked about are never
// asked again (ambassador_applications.review_requests).

export const config = {
  schedule: '0 7 * * *', // every day 07:00 UTC (10:00 in Greece)
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const MAIN_SITE = 'https://gelitup.com'
const SHOP = 'https://shop.gelitup.com'
const DAY = 24 * 60 * 60 * 1000
const AFTER_RECEIVED_DAYS = 7
const AFTER_SENT_IF_UNCONFIRMED_DAYS = 21

async function loadShopProducts() {
  const out = []
  for (let page = 1; page <= 20; page += 1) {
    const res = await fetch(`${SHOP}/products.json?limit=250&page=${page}`, { headers: { Accept: 'application/json' } })
    if (!res.ok) throw new Error(`shop feed ${res.status}`)
    const list = (await res.json())?.products || []
    for (const p of list) {
      out.push({ handle: p.handle, title: String(p.title || '').replace(/\s*-\s*HTF\s*$/i, '').trim(), image: p.images?.[0]?.src || '' })
    }
    if (list.length < 250) break
  }
  return out
}

function readyForReview(shipment, now) {
  if (!shipment?.sent_at || shipment.lost_at || String(shipment.status || 'sent').toLowerCase() !== 'sent') return false
  if (shipment.delivered_at) return now - new Date(shipment.delivered_at).getTime() >= AFTER_RECEIVED_DAYS * DAY
  return now - new Date(shipment.sent_at).getTime() >= AFTER_SENT_IF_UNCONFIRMED_DAYS * DAY
}

async function sendEmail(to, subject, html) {
  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) { headers.apikey = WEBHOOK_KEY; headers.Authorization = `Bearer ${WEBHOOK_KEY}` }
  const res = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, subject, html, from: 'GEL.IT.UP Ambassadors <ambassadors@gelitup.com>', replyTo: 'ambassadors@gelitup.com' }),
  })
  if (!res.ok) throw new Error(`email webhook ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`)
}

export async function handler() {
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not the main site (${siteUrl})` }) }
  }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('send-ambassador-review-requests: missing email webhook or Supabase service credentials')
    return { statusCode: 500, body: JSON.stringify({ error: 'missing credentials' }) }
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const now = Date.now()

  const { data: rows, error } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('id, full_name, email, language, status, paused_at, review_requests')
    .ilike('status', 'approved')
    .is('paused_at', null)
  if (error) {
    console.error('send-ambassador-review-requests: load failed', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
  const ids = (rows || []).map((r) => r.id)
  const { data: shipments, error: shipError } = ids.length
    ? await supabase.from('ambassador_shipments').select('application_id, items, sent_at, delivered_at, lost_at, status').in('application_id', ids)
    : { data: [] }
  if (shipError) {
    console.error('send-ambassador-review-requests: shipments failed', shipError.message)
    return { statusCode: 500, body: JSON.stringify({ error: shipError.message }) }
  }

  let products
  try {
    products = await loadShopProducts()
  } catch (err) {
    console.error('send-ambassador-review-requests: shop products failed', err.message)
    return { statusCode: 502, body: JSON.stringify({ error: 'shop products unavailable' }) }
  }

  const sent = []
  const failed = []
  for (const row of rows || []) {
    const email = String(row.email || '').trim()
    if (!email) continue
    const ready = (shipments || []).filter((s) => s.application_id === row.id && readyForReview(s, now))
    if (!ready.length) continue
    const asked = row.review_requests || {}
    const picked = []
    for (const it of receivedItems(ready, products)) {
      for (const p of it.matches) if (!asked[p.handle] && !picked.some((x) => x.handle === p.handle)) picked.push(p)
    }
    if (!picked.length) continue
    try {
      const { subject, html } = buildAmbassadorReviewRequestEmail(row, picked)
      await sendEmail(email, subject, html)
      const at = new Date().toISOString()
      const next = { ...asked }
      for (const p of picked) next[p.handle] = { title: p.title, at, auto: true }
      await supabase.from(AMBASSADOR_TABLE).update({ review_requests: next, review_requested_at: at }).eq('id', row.id)
      sent.push(`${row.full_name}: ${picked.map((p) => p.title).join(', ')}`)
    } catch (err) {
      failed.push(`${row.full_name}: ${err.message}`)
    }
  }
  console.log('send-ambassador-review-requests', JSON.stringify({ sent, failed }))
  return { statusCode: 200, body: JSON.stringify({ ok: true, sent, failed }) }
}
