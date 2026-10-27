import { createClient } from '@supabase/supabase-js'
import { formatGiveawayMonth } from '../../src/lib/giveaway.js'

// 08:00 (Greece): one email to ambassadors@gelitup.com listing, since the last
// summary, ambassadors who paused / asked to end their collaboration from their
// profile, and new giveaway requests. Nothing is sent on days with neither,
// and never at night.

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
  // Ambassadors who paused or asked to end their collaboration from their profile.
  const { data: optOuts, error: optError } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('id, full_name, email, instagram, country, opt_out_type, opt_out_at, opt_out_until, opt_out_reason')
    .not('opt_out_at', 'is', null)
    .is('opt_out_notified_at', null)
  if (optError) return { statusCode: 500, body: JSON.stringify({ error: optError.message }) }
  if (!requests?.length && !optOuts?.length) return { statusCode: 200, body: JSON.stringify({ ok: true, sent: 0 }) }

  const { data: people } = requests?.length
    ? await supabase.from(AMBASSADOR_TABLE).select('id, full_name, email, instagram, country').in('id', [...new Set(requests.map((r) => r.application_id))])
    : { data: [] }
  const byId = new Map((people || []).map((p) => [p.id, p]))

  const items = (requests || []).map((r) => {
    const a = byId.get(r.application_id) || {}
    const products = (r.products || []).map((p) => esc(p.title)).join(', ')
    return `<li style="margin-bottom:14px">
      <strong>${esc(a.full_name || a.email || 'Ambassador')}</strong>${a.instagram ? ` · ${esc(a.instagram)}` : ''}${a.country ? ` · ${esc(a.country)}` : ''}<br/>
      Preferred month: <strong>${esc(formatGiveawayMonth(r.preferred_month))}</strong>${r.followers ? ` · Followers: ${esc(r.followers)}` : ''}<br/>
      Prize: ${products}<br/>
      Idea: ${esc(r.idea)}${r.other_links ? `<br/>Other accounts: ${esc(r.other_links)}` : ''}${r.notes ? `<br/>Notes: ${esc(r.notes)}` : ''}
    </li>`
  }).join('')
  const fmtDay = (v) => (v ? new Date(`${String(v).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
  const optItems = (optOuts || []).map((o) => `<li style="margin-bottom:10px">
      <strong>${esc(o.full_name || o.email)}</strong>${o.instagram ? ` · ${esc(o.instagram)}` : ''}${o.country ? ` · ${esc(o.country)}` : ''}<br/>
      ${o.opt_out_type === 'end' ? '<strong style="color:#c0392b">Asked to END the collaboration</strong>' : `<strong>Paused</strong> ${o.opt_out_until ? `until ${esc(fmtDay(o.opt_out_until))}` : 'until she is ready'}`}
      ${o.opt_out_reason ? `<br/>Her reason: “${esc(o.opt_out_reason)}”` : ''}
    </li>`).join('')
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.55">
    ${optItems ? `<p><strong>${optOuts.length} ambassador${optOuts.length === 1 ? '' : 's'} paused or asked to end the collaboration</strong> from her profile. No packages or reminders go to them while paused.</p><ul style="padding-left:18px">${optItems}</ul>` : ''}
    ${items ? `<p><strong>${requests.length} new giveaway request${requests.length === 1 ? '' : 's'}:</strong></p><ul style="padding-left:18px">${items}</ul>
    <p>Approve them into a slot, waitlist or decline under <strong>Portal → Ambassadors → Shipments → Giveaway requests</strong>.</p>` : ''}
  </div>`
  const subjectParts = []
  if (optOuts?.length) subjectParts.push(`${optOuts.length} paused/ending`)
  if (requests?.length) subjectParts.push(`${requests.length} giveaway request${requests.length === 1 ? '' : 's'}`)

  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) { headers.apikey = WEBHOOK_KEY; headers.Authorization = `Bearer ${WEBHOOK_KEY}` }
  const res = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: INBOX,
      subject: `Ambassadors: ${subjectParts.join(', ')}`,
      html,
      from: `GEL.IT.UP Ambassadors <${INBOX}>`,
      replyTo: INBOX,
    }),
  })
  if (!res.ok) return { statusCode: 502, body: JSON.stringify({ error: `email ${res.status}` }) }

  const now = new Date().toISOString()
  if (requests?.length) await supabase.from('ambassador_giveaway_requests').update({ notified_at: now }).in('id', requests.map((r) => r.id))
  if (optOuts?.length) await supabase.from(AMBASSADOR_TABLE).update({ opt_out_notified_at: now }).in('id', optOuts.map((o) => o.id))
  return { statusCode: 200, body: JSON.stringify({ ok: true, requests: requests?.length || 0, optOuts: optOuts?.length || 0 }) }
}
