import { createClient } from '@supabase/supabase-js'
import { AMBASSADOR_FOLLOW_UP_PACKS_BY_TYPE } from '../../src/lib/ambassadorFollowUpPacks.js'
import { whereAlreadySent } from '../../src/lib/packageItems.js'

// Daily email to the office about ambassador PR packages that are coming up
// or overdue.
//
// The rule: the next package is due 4 weeks after the last one was sent
// (ambassador_applications.next_package_due, kept up to date by the database
// whenever a package is recorded). One email per ambassador goes out a week
// before that date. Ambassadors already past their date get one straight away.
// Each due date is emailed only once ([SHIPMENT_OFFICE_REMINDER_SENT_FOR:date]).
//
// When a SECOND package comes into that window with nothing planned, the
// follow-up pack for the ambassador's type (Standard / Super) is filled in automatically,
// leaving out anything they already received. The admin can still remove or
// add items. Extreme ambassadors are never filled in.

export const config = {
  schedule: '@daily',
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
// The email webhook is a Supabase edge function that only accepts calls with
// a Supabase key. Without this header every reminder was rejected, which is
// why no reminder email ever arrived.
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const REMINDER_RECIPIENT = 'rene@gelitup.com'
const DAYS_BEFORE_DUE = 7
// The same repo is deployed to gelitup.com, .ch, .eu and .nl. Only the main
// site sends, so each reminder arrives once rather than four times.
const MAIN_SITE = 'https://gelitup.com'
const SENT_FOR_TAG = 'SHIPMENT_OFFICE_REMINDER_SENT_FOR'
const AUTOFILL_TAG = 'SHIPMENT_FOLLOW_UP_AUTOFILLED_FOR'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function extractTag(value, tagName) {
  const match = String(value || '').match(new RegExp(`\\[${tagName}:([^\\]]+)\\]`, 'i'))
  return String(match?.[1] || '').trim()
}

function decodeNote(value) {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function ensureTag(value, tagName, tagValue) {
  const notes = String(value || '')
  const cleaned = notes.replace(new RegExp(`\\[${tagName}:[^\\]]*\\]`, 'gi'), '').trim()
  return `${cleaned ? `${cleaned}\n` : ''}[${tagName}:${tagValue}]`
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  const d = new Date(String(value).length === 10 ? `${value}T12:00:00Z` : value)
  if (Number.isNaN(d.getTime())) return 'Not recorded'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Athens' })
}

function todayInAthens() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Athens' }).format(new Date())
}

function daysBetween(fromYmd, toYmd) {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000)
}

function buildReminderEmail(row, lastShipment, packageNumber, due, today) {
  const name = String(row?.full_name || row?.email || 'Unknown ambassador').trim()
  const daysLeft = daysBetween(today, due)
  const when = daysLeft < 0
    ? `<strong style="color:#c0392b">OVERDUE by ${-daysLeft} day${daysLeft === -1 ? '' : 's'}</strong>`
    : daysLeft === 0 ? '<strong>due today</strong>' : `due in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  const plannedItems = String(row?.admin_comment || '')
    .split('\n')
    .map((line) => line.match(/^\[PACK_NOTE:([^\]]+)\]$/i)?.[1])
    .filter(Boolean)
    .map((encoded) => {
      const raw = decodeNote(encoded)
      try {
        return String(JSON.parse(raw)?.text || '').trim()
      } catch {
        return raw
      }
    })
    .filter(Boolean)
  const lastItems = Array.isArray(lastShipment?.items) ? lastShipment.items.filter(Boolean) : []
  const itemsBlock = plannedItems.length
    ? plannedItems.join('\n')
    : 'Nothing planned yet. Open the ambassador in the admin to choose the items.'
  return {
    subject: `${daysLeft < 0 ? 'OVERDUE: ' : ''}Package ${packageNumber} for ${name} — ${formatDate(due)}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>Package ${packageNumber} for <strong>${escapeHtml(name)}</strong> is ${when}.</p>
      <p><strong>Due date:</strong> ${escapeHtml(formatDate(due))} (4 weeks after the last package)<br/>
      <strong>Country:</strong> ${escapeHtml(row?.country || 'Not recorded')}<br/>
      <strong>Email:</strong> ${escapeHtml(row?.email || 'Not recorded')}<br/>
      <strong>Last package sent:</strong> ${escapeHtml(formatDate(lastShipment?.sent_at))}${lastShipment?.tracking_number ? ` · tracking ${escapeHtml(lastShipment.tracking_number)}` : ''}</p>
      <p><strong>Planned for the next package:</strong></p>
      <div style="white-space:pre-wrap;border-left:3px solid #d43790;padding:8px 12px;background:#fdf0f5;">${escapeHtml(itemsBlock)}</div>
      ${lastItems.length ? `<p style="color:#666;font-size:12px">Last package contained: ${escapeHtml(lastItems.join(', '))}</p>` : ''}
      <p><a href="https://gelitup.com/admin" style="color:#d43790">Open the ambassador admin</a></p>
    </div>`,
  }
}

async function sendEmail(subject, html) {
  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) {
    headers.apikey = WEBHOOK_KEY
    headers.Authorization = `Bearer ${WEBHOOK_KEY}`
  }
  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      to: REMINDER_RECIPIENT,
      subject,
      html,
      replyTo: 'info@gelitup.com',
      from: 'GEL.IT.UP <info@gelitup.com>',
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Reminder email failed (HTTP ${response.status}): ${text.slice(0, 200)}`)
  }
}

export async function handler() {
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not the main site (${siteUrl})` }) }
  }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('send-ambassador-pr-reminders: missing email webhook or Supabase service credentials')
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing email webhook or Supabase service credentials' }),
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const today = todayInAthens()
  const { data: rows, error } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('id, full_name, email, country, status, paused_at, admin_comment, next_package_due, ambassador_type')
    .eq('status', 'approved')
    .is('paused_at', null)
    .not('next_package_due', 'is', null)
    .limit(1000)

  if (error) {
    console.error('send-ambassador-pr-reminders: load failed', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load ambassadors: ${error.message}` }),
    }
  }

  const results = []
  for (const row of rows || []) {
    const due = String(row.next_package_due).slice(0, 10)
    if (daysBetween(today, due) > DAYS_BEFORE_DUE) continue
    const alreadyEmailed = extractTag(row.admin_comment, SENT_FOR_TAG) === due

    const { data: shipments } = await supabase
      .from('ambassador_shipments')
      .select('sent_at, tracking_number, items, lost_at')
      .eq('application_id', row.id)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
    const lastShipment = shipments?.[0] || null
    const packageNumber = (shipments?.length || 0) + 1

    // Fill in the follow-up pack once per due date, if nothing is planned yet
    // (if the admin then removes items, they are not put back).
    const hasPlan = /\[PACK_NOTE:[^\]]+\]/i.test(String(row.admin_comment || ''))
      || extractTag(row.admin_comment, AUTOFILL_TAG) === due
    const followUp = AMBASSADOR_FOLLOW_UP_PACKS_BY_TYPE[String(row.ambassador_type || '').toLowerCase()]
    // Only for the SECOND package (one package sent so far; the same tracking
    // number recorded twice counts once). Third packages are chosen by hand.
    const packagesSent = new Set((shipments || []).filter((sh) => !sh.lost_at).map((sh) => String(sh.tracking_number || sh.sent_at || '').trim().toLowerCase())).size
    if (!hasPlan && followUp && packagesSent === 1) {
      const toAdd = followUp.items.filter((item) => whereAlreadySent(item, shipments).length === 0)
      if (toAdd.length) {
        const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Europe/Athens' })
        const lines = toAdd.map((text) => `[PACK_NOTE:${encodeURIComponent(JSON.stringify({ stamp, author: 'automatic (follow-up pack)', text }))}]`)
        const filled = ensureTag(`${String(row.admin_comment || '').trim() ? `${String(row.admin_comment).trim()}\n` : ''}${lines.join('\n')}`, AUTOFILL_TAG, due)
        const { error: fillError } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: filled }).eq('id', row.id)
        if (!fillError) row.admin_comment = filled
        results.push({ id: row.id, status: fillError ? 'fill_failed' : 'follow_up_filled', items: toAdd.length })
      }
    }
    if (alreadyEmailed) continue

    try {
      const email = buildReminderEmail(row, lastShipment, packageNumber, due, today)
      await sendEmail(email.subject, email.html)
      const updatedComment = ensureTag(row.admin_comment, SENT_FOR_TAG, due)
      const { error: updateError } = await supabase
        .from(AMBASSADOR_TABLE)
        .update({ admin_comment: updatedComment })
        .eq('id', row.id)
      results.push(updateError
        ? { id: row.id, status: 'sent_but_not_marked', reason: updateError.message }
        : { id: row.id, status: 'sent', due })
    } catch (sendError) {
      const reason = sendError instanceof Error ? sendError.message : 'Unknown error'
      console.error(`send-ambassador-pr-reminders: ambassador ${row.id}`, reason)
      results.push({ id: row.id, status: 'failed', reason })
    }
  }

  console.log('send-ambassador-pr-reminders', JSON.stringify({ today, checked: rows?.length || 0, results }))
  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, today, checked: rows?.length || 0, results }),
  }
}
