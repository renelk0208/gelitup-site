import { createClient } from '@supabase/supabase-js'

export const config = {
  schedule: '0 7 23 8 *',
}

const AMBASSADOR_TABLE = process.env.AMBASSADOR_TABLE || 'ambassador_applications'
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const SEND_DATE_UTC = '2026-08-23'
const MESSAGE_MARKER = '[AMBASSADOR_AGREEMENT_V5_UPDATE_SENT]'
const SUBJECT = 'A small but important update to the Ambassador Agreement'

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailHtml(row) {
  const firstName = String(row?.full_name || '').trim().split(/\s+/)[0] || 'there'

  return `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Hope you're doing well! We wanted to reach out with a quick update to the GEL.IT.UP Ambassador Agreement.</p>
    <p>We have been clear about this rule, and we want to be upfront and clear about it to be sure you understand: <strong>no other nail brand's products can appear in the same photo, video or post as GEL.IT.UP.</strong> This means not in the same shot, not in the background, not on the table next to your GEL.IT.UP products — nothing from another brand alongside ours in the same piece of content.</p>
    <p>To be clear, this isn't about anything anyone has done — we just want to get ahead of it and make sure everyone's on the same page going forward. You're just as welcome as ever to use and love other products; we simply ask that when you're creating content that features GEL.IT.UP, it's GEL.IT.UP only in that post. The reason is simple: when other brands show up alongside ours, your followers naturally ask what they're seeing, and we're not able to have other companies named or shown alongside our brand.</p>
    <p>This one's firm and won't have exceptions, so we wanted to flag it clearly rather than bury it in fine print — you'll see it called out in bold in the updated agreement.</p>
    <p>Everything else about the programme stays exactly the same, and we're so grateful to have you as part of the GEL.IT.UP family. If anything here is unclear, just reply to this email and we're happy to talk it through.</p>
    <p>Thank you for everything you do for the brand!</p>
    <p>With love,</p>
    <p>The GEL.IT.UP Team</p>
  </div>`
}

async function sendUpdateEmail(row) {
  const response = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType: 'ambassador_agreement_v5_update',
      to: row.email,
      subject: SUBJECT,
      html: buildEmailHtml(row),
      from: 'GEL.IT.UP <info@gelitup.com>',
      replyTo: 'info@gelitup.com',
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Email webhook failed with ${response.status}: ${text.slice(0, 200)}`)
  }
}

function buildLogEntry(row) {
  const stamp = new Date().toISOString()
  return `[${stamp}] 📧 Sent to ${row.email} · “${SUBJECT}” ${MESSAGE_MARKER}`
}

async function appendSendLog(supabase, row) {
  const entry = buildLogEntry(row)
  const nextMessageLog = row.message_log ? `${row.message_log}\n${entry}` : entry
  const { error } = await supabase
    .from(AMBASSADOR_TABLE)
    .update({ message_log: nextMessageLog })
    .eq('id', row.id)

  if (!error) return

  const nextAdminComment = row.admin_comment ? `${row.admin_comment}\n${entry}` : entry
  const { error: fallbackError } = await supabase
    .from(AMBASSADOR_TABLE)
    .update({ admin_comment: nextAdminComment })
    .eq('id', row.id)

  if (fallbackError) {
    throw new Error(`Email sent but send log failed: ${fallbackError.message}`)
  }
}

export async function handler() {
  if (new Date().toISOString().slice(0, 10) !== SEND_DATE_UTC) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, skipped: true, reason: 'outside_one_time_send_date' }),
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase service credentials' }),
    }
  }
  if (!EMAIL_WEBHOOK_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing email webhook URL' }),
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data, error } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('id,full_name,email,status,message_log,admin_comment')
    .eq('status', 'approved')
    .not('email', 'is', null)
    .neq('email', '')

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load approved ambassadors: ${error.message}` }),
    }
  }

  const recipientsByEmail = new Map()
  for (const row of data || []) {
    const email = String(row.email || '').trim().toLowerCase()
    if (!email || recipientsByEmail.has(email)) continue
    recipientsByEmail.set(email, { ...row, email })
  }

  const results = []
  for (const row of recipientsByEmail.values()) {
    const priorLogs = `${row.message_log || ''}\n${row.admin_comment || ''}`
    if (priorLogs.includes(MESSAGE_MARKER)) {
      results.push({ id: row.id, email: row.email, status: 'skipped_already_sent' })
      continue
    }

    try {
      await sendUpdateEmail(row)
      await appendSendLog(supabase, row)
      results.push({ id: row.id, email: row.email, status: 'sent' })
    } catch (sendError) {
      results.push({
        id: row.id,
        email: row.email,
        status: 'failed',
        error: sendError instanceof Error ? sendError.message : String(sendError),
      })
    }
  }

  const failed = results.filter((result) => result.status === 'failed')
  return {
    statusCode: failed.length ? 500 : 200,
    body: JSON.stringify({
      ok: failed.length === 0,
      approvedRecipients: recipientsByEmail.size,
      sent: results.filter((result) => result.status === 'sent').length,
      skipped: results.filter((result) => result.status === 'skipped_already_sent').length,
      failed: failed.length,
      results,
    }),
  }
}
