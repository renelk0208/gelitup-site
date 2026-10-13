import { createClient } from '@supabase/supabase-js'
import { buildCodeOrderCongratsEmail } from '../../src/lib/codeOrderEmail.js'

// Hourly during the day (09:00–20:00 Greek time): emails each ambassador whose
// code was used in new orders — "Congratulations, people are using your code!" —
// in her language, with the orders and the credit she earned. One email per
// ambassador per run, never at night (orders placed at night wait for the morning).

export const config = {
  schedule: '5 * * * *',
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const MAIN_SITE = 'https://gelitup.com'

function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

function athensHour(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hour12: false }).format(date))
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

export async function handler(event) {
  if (!isScheduledRun(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not the main site (${siteUrl})` }) }
  }
  const hour = athensHour()
  if (hour < 9 || hour > 20) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `night time in Greece (${hour}:00)` }) }
  }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('send-ambassador-code-order-congrats: missing email webhook or Supabase service credentials')
    return { statusCode: 500, body: JSON.stringify({ error: 'missing credentials' }) }
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: pending, error } = await supabase
    .from('ambassador_redemptions')
    .select('id, code, created_at, order_total_eur, discount_amount_eur, discount_pct, commission_amount_eur')
    .is('notified_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('send-ambassador-code-order-congrats: load failed', error.message)
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
  if (!pending?.length) return { statusCode: 200, body: JSON.stringify({ ok: true, sent: [] }) }

  const codes = [...new Set(pending.map((r) => String(r.code || '').toUpperCase()))]
  const { data: codeRows } = await supabase
    .from('ambassador_codes')
    .select('code, ambassador_email, ambassador_name, application_id')
    .in('code', codes)
  const byCode = new Map((codeRows || []).map((c) => [String(c.code).toUpperCase(), c]))

  // Group the new orders per ambassador (by email: she may have more than one code).
  const groups = new Map()
  for (const r of pending) {
    const c = byCode.get(String(r.code || '').toUpperCase())
    const email = String(c?.ambassador_email || '').trim().toLowerCase()
    if (!email) continue
    if (!groups.has(email)) groups.set(email, { code: c.code, name: c.ambassador_name, applicationId: c.application_id, rows: [] })
    groups.get(email).rows.push(r)
  }

  const sent = []
  const failed = []
  for (const [email, g] of groups) {
    try {
      let app = null
      if (g.applicationId) {
        const { data } = await supabase.from('ambassador_applications').select('full_name, language, status, paused_at').eq('id', g.applicationId).maybeSingle()
        app = data
      }
      if (!app) {
        const { data } = await supabase.from('ambassador_applications').select('full_name, language, status, paused_at').ilike('email', email).order('created_at', { ascending: false }).limit(1).maybeSingle()
        app = data
      }
      const { data: bal } = await supabase.rpc('ambassador_balance_for', { p_email: email })
      const b = Array.isArray(bal) ? bal[0] : bal
      const availableEur = Math.max(0, Number(b?.earned || 0) - Number(b?.spent || 0))
      const orders = g.rows.map((r) => ({
        ordered_at: r.created_at,
        order_total_eur: r.order_total_eur != null
          ? r.order_total_eur
          : (r.discount_pct > 0 ? Number(r.discount_amount_eur) / (Number(r.discount_pct) / 100) - Number(r.discount_amount_eur) : 0),
        commission_amount_eur: r.commission_amount_eur || 0,
      }))
      const { subject, html } = buildCodeOrderCongratsEmail({
        fullName: app?.full_name || g.name,
        email,
        language: app?.language,
        code: g.code,
        orders,
        availableEur,
      })
      await sendEmail(email, subject, html)
      const at = new Date().toISOString()
      await supabase.from('ambassador_redemptions').update({ notified_at: at }).in('id', g.rows.map((r) => r.id))
      sent.push(`${g.code}: ${g.rows.length} order(s)`)
    } catch (err) {
      failed.push(`${g.code}: ${err.message}`)
    }
  }
  console.log('send-ambassador-code-order-congrats', JSON.stringify({ sent, failed }))
  return { statusCode: 200, body: JSON.stringify({ ok: true, sent, failed }) }
}
