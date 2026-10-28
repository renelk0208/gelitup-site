import { createClient } from '@supabase/supabase-js'

// 10:00 (Greece): ONE reminder email to an ambassador whose latest package
// should have arrived (expected delivery, or 7 days after sending, + 3 days)
// but which she hasn't confirmed. Her next package is on hold until she does.
//
// Only runs when switched on in admin (app_settings 'receipt_reminders_on').
// Each package gets at most one reminder (ambassador_shipments.receipt_reminder_at).
// Packages sent more than 60 days ago are left alone (handled by hand).

export const config = {
  schedule: '0 7,8 * * *', // only the run that is 10:00 in Greece sends
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const INBOX = 'ambassadors@gelitup.com'
const MAIN_SITE = 'https://gelitup.com'
const DAY = 24 * 60 * 60 * 1000
const GRACE_DAYS = 3
const MAX_AGE_DAYS = 60

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const fmt = (v) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Athens' })

function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

export function reminderDue(shipment, now = Date.now()) {
  if (!shipment?.sent_at || shipment.delivered_at || shipment.lost_at || shipment.receipt_reminder_at) return false
  const sent = new Date(shipment.sent_at).getTime()
  if (now - sent > MAX_AGE_DAYS * DAY) return false
  const arrives = shipment.expected_delivery ? new Date(`${shipment.expected_delivery}T00:00:00Z`).getTime() : sent + 7 * DAY
  return now >= arrives + GRACE_DAYS * DAY
}

export function buildReceiptReminderEmail(row, shipment) {
  const first = String(row?.full_name || '').trim().split(/\s+/)[0] || 'there'
  const name = first.charAt(0).toUpperCase() + first.slice(1)
  const link = shipment.receipt_token ? `https://gelitup.com/package-received?t=${encodeURIComponent(shipment.receipt_token)}` : 'https://gelitup.com/portal/login'
  const items = (shipment.items || []).slice(0, 8).map((i) => `<li>${esc(i)}</li>`).join('')
  return {
    subject: 'Did your GEL.IT.UP package arrive? Please confirm 📦',
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">
      <p>Hi ${esc(name)},</p>
      <p>Your GEL.IT.UP PR package was sent on <strong>${esc(fmt(shipment.sent_at))}</strong> and should have arrived by now, but we haven't had your confirmation yet.</p>
      ${items ? `<ul>${items}</ul>` : ''}
      <p><strong>Please confirm you received it.</strong> Your next package can only be sent once you've confirmed this one, and only confirmed packages count towards a GEL.IT.UP giveaway.</p>
      <p>It's important for us to know your packages arrived. If we don't hear from you, we'll assume you're not active and your collaboration may be paused.</p>
      <p style="margin:20px 0"><a href="${esc(link)}" style="display:inline-block;background:#16a34a;color:#ffffff;padding:12px 20px;border-radius:9999px;text-decoration:none;font-weight:700">✅ I've received my package</a></p>
      <p>If it hasn't arrived, just reply to this email and we'll look into it.</p>
      <p>With love,<br/>René Krallis<br/>Marketing Director, GEL.IT.UP International</p>
    </div>`,
  }
}

export async function handler(event) {
  if (!isScheduledRun(event)) return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'not the main site' }) }
  const athensHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hour12: false }).format(new Date()))
  if (athensHour !== 10) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not 10:00 in Greece (hour ${athensHour})` }) }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'missing credentials' }) }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'receipt_reminders_on').maybeSingle()
  if (setting?.value !== true) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'reminders switched off' }) }

  const { data: people, error } = await supabase.from(AMBASSADOR_TABLE).select('id, full_name, email, status, paused_at').ilike('status', 'approved').is('paused_at', null)
  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  const ids = (people || []).map((p) => p.id)
  if (!ids.length) return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0 }) }
  const { data: shipments, error: shipError } = await supabase.from('ambassador_shipments')
    .select('id, application_id, items, sent_at, expected_delivery, delivered_at, lost_at, status, receipt_token, receipt_reminder_at')
    .in('application_id', ids).eq('status', 'sent')
  if (shipError) return { statusCode: 500, body: JSON.stringify({ error: shipError.message }) }

  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) { headers.apikey = WEBHOOK_KEY; headers.Authorization = `Bearer ${WEBHOOK_KEY}` }
  const sent = []
  const failed = []
  for (const row of people || []) {
    if (!String(row.email || '').trim()) continue
    // Only her latest package.
    const latest = (shipments || []).filter((s) => s.application_id === row.id && s.sent_at)
      .sort((a, b) => String(b.sent_at).localeCompare(String(a.sent_at)))[0]
    if (!latest || !reminderDue(latest)) continue
    const { subject, html } = buildReceiptReminderEmail(row, latest)
    try {
      const res = await fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST', headers,
        body: JSON.stringify({ to: row.email, subject, html, from: `GEL.IT.UP Ambassadors <${INBOX}>`, replyTo: INBOX }),
      })
      if (!res.ok) throw new Error(`email ${res.status}`)
      await supabase.from('ambassador_shipments').update({ receipt_reminder_at: new Date().toISOString() }).eq('id', latest.id)
      sent.push(row.id)
    } catch (err) {
      failed.push({ id: row.id, reason: err.message })
    }
  }
  console.log('send-ambassador-receipt-reminders', JSON.stringify({ sent: sent.length, failed }))
  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: sent.length, failed }) }
}
