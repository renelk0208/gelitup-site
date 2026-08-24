import { createClient } from '@supabase/supabase-js'

export const config = {
  schedule: '@daily',
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const AMBASSADOR_TABLE = process.env.VITE_AMBASSADOR_TABLE || 'ambassador_applications'
const REMINDER_RECIPIENT = 'rene@gelitup.com'

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

function decodeReminderNote(value) {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function ensureTag(value, tagName, tagValue) {
  const notes = String(value || '')
  const cleaned = notes.replace(new RegExp(`\\[${tagName}:[^\\]]+\\]`, 'gi'), '').trim()
  return `${cleaned ? `${cleaned}\n` : ''}[${tagName}:${tagValue}]`
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function buildReminderEmail(row, dispatchedAt, nextPackageAt, items) {
  const ambassadorName = String(row?.full_name || row?.contact_name || row?.email || 'Unknown ambassador').trim()
  return {
    subject: `PR package reminder — ${ambassadorName}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.5">
      <p>This is the automatic three-week reminder to prepare the next ambassador PR package.</p>
      <p><strong>Ambassador:</strong> ${escapeHtml(ambassadorName)}<br/>
      <strong>Email:</strong> ${escapeHtml(row?.email || row?.contact_email || 'Not recorded')}<br/>
      <strong>Previous package dispatched:</strong> ${escapeHtml(formatDate(dispatchedAt))}<br/>
      <strong>Next package date:</strong> ${nextPackageAt ? escapeHtml(formatDate(nextPackageAt)) : 'Not set'}</p>
      <p><strong>Items that need to leave in the next PR package:</strong></p>
      <div style="white-space:pre-wrap;border-left:3px solid #d43790;padding:8px 12px;background:#fdf0f5;">${escapeHtml(items || 'No items were specified. Check the ambassador record before preparing the package.')}</div>
    </div>`,
  }
}

async function sendEmail(subject, html) {
  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(`Reminder email failed: ${text.slice(0, 200)}`)
  }
}

export async function handler() {
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing email webhook or Supabase service credentials' }),
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: rows, error } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('*')
    .not('admin_comment', 'is', null)
    .limit(1000)

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load ambassador reminders: ${error.message}` }),
    }
  }

  const now = Date.now()
  const results = []
  for (const row of rows || []) {
    const reminderAt = extractTag(row.admin_comment, 'SHIPMENT_OFFICE_REMINDER_AT')
    const reminderSentAt = extractTag(row.admin_comment, 'SHIPMENT_OFFICE_REMINDER_SENT_AT')
    const reminderTime = new Date(reminderAt).getTime()
    if (!reminderAt || reminderSentAt || !Number.isFinite(reminderTime) || reminderTime > now) continue

    const dispatchedAt = extractTag(row.admin_comment, 'SHIPMENT_OFFICE_REMINDER_DISPATCHED_AT')
      || extractTag(row.admin_comment, 'SHIPMENT_SENT_AT')
    const nextPackageAt = extractTag(row.admin_comment, 'SHIPMENT_OFFICE_REMINDER_NEXT_PACKAGE_AT')
      || extractTag(row.admin_comment, 'SHIPMENT_NEXT_REMINDER_AT')
    const items = decodeReminderNote(
      extractTag(row.admin_comment, 'SHIPMENT_OFFICE_REMINDER_ITEMS')
      || extractTag(row.admin_comment, 'SHIPMENT_REMINDER_NOTE'),
    )
    try {
      const email = buildReminderEmail(row, dispatchedAt || reminderAt, nextPackageAt, items)
      await sendEmail(email.subject, email.html)
      const sentAt = new Date().toISOString()
      const updatedComment = ensureTag(row.admin_comment, 'SHIPMENT_OFFICE_REMINDER_SENT_AT', sentAt)
      const { error: updateError } = await supabase
        .from(AMBASSADOR_TABLE)
        .update({ admin_comment: updatedComment })
        .eq('id', row.id)
      if (updateError) {
        results.push({ id: row.id, status: 'sent_but_not_marked', reason: updateError.message })
      } else {
        results.push({ id: row.id, status: 'sent' })
      }
    } catch (sendError) {
      results.push({
        id: row.id,
        status: 'failed',
        reason: sendError instanceof Error ? sendError.message : 'Unknown error',
      })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, checked: rows?.length || 0, results }),
  }
}
