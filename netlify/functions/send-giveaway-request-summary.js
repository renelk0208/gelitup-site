import { createClient } from '@supabase/supabase-js'
import { formatGiveawayMonth } from '../../src/lib/giveaway.js'

// 08:00 (Greece): one email to ambassadors@gelitup.com listing new giveaway
// requests from ambassadors since the last summary. Nothing is sent on days
// with no new request, and never at night.

export const config = {
  schedule: '0 5,6 * * *', // only the run that is 08:00 in Greece sends
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const INBOX = 'ambassadors@gelitup.com'
const MAIN_SITE = 'https://gelitup.com'

const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

export async function handler(event) {
  if (!isScheduledRun(event)) return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: 'not the main site' }) }
  const athensHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', hour: '2-digit', hour12: false }).format(new Date()))
  if (athensHour !== 8) return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not 08:00 in Greece (hour ${athensHour})` }) }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return { statusCode: 500, body: JSON.stringify({ error: 'missing credentials' }) }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: requests, error } = await supabase
    .from('ambassador_giveaway_requests')
    .select('id, created_at, application_id, products, preferred_month, idea, followers, other_links, notes')
    .eq('status', 'requested')
    .is('notified_at', null)
    .order('created_at', { ascending: true })
  if (error) return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  if (!requests?.length) return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0 }) }

  const { data: people } = await supabase.from(AMBASSADOR_TABLE).select('id, full_name, email, instagram, country')
    .in('id', [...new Set(requests.map((r) => r.application_id))])
  const byId = new Map((people || []).map((p) => [p.id, p]))

  const items = requests.map((r) => {
    const a = byId.get(r.application_id) || {}
    const products = (r.products || []).map((p) => esc(p.title)).join(', ')
    return `<li style="margin-bottom:14px">
      <strong>${esc(a.full_name || a.email || 'Ambassador')}</strong>${a.instagram ? ` · ${esc(a.instagram)}` : ''}${a.country ? ` · ${esc(a.country)}` : ''}<br/>
      Preferred month: <strong>${esc(formatGiveawayMonth(r.preferred_month))}</strong>${r.followers ? ` · Followers: ${esc(r.followers)}` : ''}<br/>
      Prize: ${products}<br/>
      Idea: ${esc(r.idea)}${r.other_links ? `<br/>Other accounts: ${esc(r.other_links)}` : ''}${r.notes ? `<br/>Notes: ${esc(r.notes)}` : ''}
    </li>`
  }).join('')
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.55">
    <p>${requests.length} new giveaway request${requests.length === 1 ? '' : 's'} from ambassadors:</p>
    <ul style="padding-left:18px">${items}</ul>
    <p>Approve them into a slot, waitlist or decline under <strong>Portal → Ambassadors → Shipments → Giveaway requests</strong>.</p>
  </div>`

  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) { headers.apikey = WEBHOOK_KEY; headers.Authorization = `Bearer ${WEBHOOK_KEY}` }
  const res = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: INBOX,
      subject: `New giveaway request${requests.length === 1 ? '' : 's'} (${requests.length})`,
      html,
      from: `GEL.IT.UP Ambassadors <${INBOX}>`,
      replyTo: INBOX,
    }),
  })
  if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: `email ${res.status}` }) }

  await supabase.from('ambassador_giveaway_requests').update({ notified_at: new Date().toISOString() }).in('id', requests.map((r) => r.id))
  return { statusCode: 200, body: JSON.stringify({ ok: true, sent: requests.length }) }
}
