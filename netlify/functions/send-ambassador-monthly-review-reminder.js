import { createClient } from '@supabase/supabase-js'
import { buildStatus, loadShopProducts } from './giveaway-request.js'
import { buildAmbassadorReviewRequestEmail } from '../../src/lib/reviewEmail.js'

// Once a month (1st of the month, 10:00 Greece): ONE email to each active
// ambassador who still has received products she hasn't reviewed, listing
// them, and reminding her that without reviews she can't host a giveaway.
// Only runs when switched on in admin (app_settings 'monthly_review_reminder_on').
// Never more than one per ambassador in 25 days (monthly_review_reminder_at).

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const INBOX = 'ambassadors@gelitup.com'
const MAIN_SITE = 'https://gelitup.com'
const DAY = 24 * 60 * 60 * 1000

function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

export async function handler(event) {
  if (!isScheduledRun(event)) return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'not the main site' }) }
  const athensHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hour12: false }).format(new Date()))
  if (athensHour !== 10) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not 10:00 in Greece (hour ${athensHour})` }) }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'missing credentials' }) }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'monthly_review_reminder_on').maybeSingle()
  if (setting?.value !== true) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'switched off' }) }

  const { data: people, error } = await supabase.from(AMBASSADOR_TABLE)
    .select('id, full_name, email, status, paused_at, language, followers, tiktok, instagram, ambassador_type, country, giveaway_invited_at, monthly_review_reminder_at')
    .ilike('status', 'approved').is('paused_at', null)
  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) }

  let shopProducts
  try { shopProducts = await loadShopProducts() } catch { return { statusCode: 502, body: JSON.stringify({ error: 'shop products unavailable' }) } }

  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) { headers.apikey = WEBHOOK_KEY; headers.Authorization = `Bearer ${WEBHOOK_KEY}` }
  const sent = []
  const failed = []
  for (const a of people || []) {
    if (!String(a.email || '').trim()) continue
    if (a.monthly_review_reminder_at && Date.now() - new Date(a.monthly_review_reminder_at).getTime() < 25 * DAY) continue
    let st
    try { st = await buildStatus(supabase, a, { shopProducts }) } catch (err) { failed.push({ id: a.id, reason: err.message }); continue }
    if (!(st.notReviewed || []).length) continue
    const { subject, html } = buildAmbassadorReviewRequestEmail(a, st.notReviewed, a.language, { monthly: true })
    try {
      const res = await fetch(EMAIL_WEBHOOK_URL, { method: 'POST', headers, body: JSON.stringify({ to: a.email, subject, html, from: `GEL.IT.UP Ambassadors <${INBOX}>`, replyTo: INBOX }) })
      if (!res.ok) throw new Error(`email ${res.status}`)
      await supabase.from(AMBASSADOR_TABLE).update({ monthly_review_reminder_at: new Date().toISOString() }).eq('id', a.id)
      sent.push(a.id)
    } catch (err) {
      failed.push({ id: a.id, reason: err.message })
    }
  }
  console.log('send-ambassador-monthly-review-reminder', JSON.stringify({ sent: sent.length, failed }))
  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: sent.length, failed }) }
}
