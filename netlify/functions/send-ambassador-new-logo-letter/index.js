import { createClient } from '@supabase/supabase-js'
import LETTERS from './letters.json'

// One-off: the new high-resolution Ambassador logo letter.
// Runs once at 17:30 UTC (20:30 Athens / Greek time) on 13 October 2026.
export const config = {
  schedule: '30 17 13 10 *',
}

const AMBASSADOR_TABLE = process.env.AMBASSADOR_TABLE || 'ambassador_applications'
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const MAIN_SITE = 'https://gelitup.com'
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const SEND_DATE_UTC = '2026-10-13'
const MESSAGE_MARKER = '[AMBASSADOR_NEW_LOGO_LETTER_2026_10_SENT]'
const SUBJECT = 'Your new GEL.IT.UP Ambassador logo 💕'

const LOGO_BLACK_URL = 'https://www.gelitup.com/gelitup-content/ambassador-logo-black.png'
const LOGO_WHITE_URL = 'https://www.gelitup.com/gelitup-content/ambassador-logo-white.png'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildEmailHtml(firstName) {
  return `
  <div style="background-color:#f6f1ee;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
      <tr><td style="background-color:#B8418A;padding:22px 28px;text-align:center;">
        <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1.5px;">GEL.IT.UP</span>
        <div style="color:#ffffff;font-size:13px;margin-top:4px;letter-spacing:0.5px;">Ambassador Programme · Your New Logo</div>
      </td></tr>
      <tr><td style="padding:30px 30px 22px 30px;font-size:15px;color:#1f2937;line-height:1.65;">
        <p style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">Dear ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 14px 0;">We have a little gift for you: your new, high-resolution GEL.IT.UP Ambassador logo, in black and in white.</p>
        <p style="margin:0 0 14px 0;">The logo files we shared before did not always come out as crisp as they should, so we have remade them in much higher resolution with a fully transparent background. Please use these new files on your Instagram photos from now on (no need to add them to videos) and delete the old ones.</p>
        <p style="margin:0 0 18px 0;">Your personal letter with all the details and both logo files are attached to this email. You can also download the logos here:</p>
        <div style="background-color:#fafafa;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:22px;text-align:center;">
          <a href="${LOGO_BLACK_URL}" style="display:inline-block;background-color:#111827;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 18px;border-radius:6px;margin:4px 6px;">Download Black Logo (PNG)</a>
          <a href="${LOGO_WHITE_URL}" style="display:inline-block;background-color:#B8418A;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:10px 18px;border-radius:6px;margin:4px 6px;">Download White Logo (PNG)</a>
        </div>
        <p style="margin:0 0 16px 0;font-size:14px;color:#4b5563;">Keep tagging <strong>@gelitupinternational</strong> so we can see and share your beautiful work. If you have any trouble with the files, just reply to this email or message us on WhatsApp at +30 694 071 5234.</p>
        <p style="margin:0 0 22px 0;font-weight:600;color:#111827;">Thank you for being such a special part of the GEL.IT.UP family!</p>
        <p style="margin:0;color:#6b7280;font-size:14px;">With warm regards,<br/><strong style="color:#111827;">René Krallis</strong><br/>Marketing Director, GEL.IT.UP International</p>
      </td></tr>
      <tr><td style="background-color:#f9fafb;padding:18px 28px;text-align:center;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">
        <a href="https://www.gelitup.com" style="color:#9ca3af;">www.gelitup.com</a> · ambassadors@gelitup.com · WhatsApp/Viber: +30 694 071 5234
      </td></tr>
    </table>
  </div>`
}

async function fetchAsAttachment(url, filename) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    return { filename, content: buf.toString('base64'), contentType: 'image/png' }
  } catch {
    return null
  }
}

async function appendSendLog(supabase, row) {
  const entry = `[${new Date().toISOString()}] 📧 Sent to ${row.email} · “${SUBJECT}” ${MESSAGE_MARKER}`
  const next = row.admin_comment ? `${row.admin_comment}\n${entry}` : entry
  const { error } = await supabase.from(AMBASSADOR_TABLE).update({ admin_comment: next }).eq('id', row.id)
  if (error) throw new Error(`Email sent but send log failed: ${error.message}`)
}

// Only Netlify's scheduler may run this (its call carries "next_run" in the body).
function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

export async function handler(event) {
  if (!isScheduledRun(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `not the main site (${siteUrl})` }) }
  }
  if (new Date().toISOString().slice(0, 10) !== SEND_DATE_UTC) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, skipped: `only runs on ${SEND_DATE_UTC}` }) }
  }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing email webhook or Supabase service credentials' }) }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await supabase
    .from(AMBASSADOR_TABLE)
    .select('id,full_name,email,status,paused_at,admin_comment')
    .eq('status', 'approved')
    .is('paused_at', null)
  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: `Failed to load ambassadors: ${error.message}` }) }
  }

  const logos = (await Promise.all([
    fetchAsAttachment(LOGO_BLACK_URL, 'GELITUP_Ambassador_logo_black.png'),
    fetchAsAttachment(LOGO_WHITE_URL, 'GELITUP_Ambassador_logo_white.png'),
  ])).filter(Boolean)

  const seen = new Set()
  const results = []
  for (const row of data || []) {
    const email = String(row.email || '').trim().toLowerCase()
    const letter = LETTERS[email]
    // Only the ambassadors approved when the letters were made, still active now.
    if (!email || !letter || seen.has(email)) continue
    seen.add(email)
    if (String(row.admin_comment || '').includes(MESSAGE_MARKER)) {
      results.push({ email, status: 'skipped_already_sent' })
      continue
    }
    try {
      const response = await fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(WEBHOOK_KEY ? { apikey: WEBHOOK_KEY, Authorization: `Bearer ${WEBHOOK_KEY}` } : {}),
        },
        body: JSON.stringify({
          eventType: 'ambassador_new_logo_letter',
          to: email,
          subject: SUBJECT,
          html: buildEmailHtml(letter.firstName),
          from: 'GEL.IT.UP Ambassadors <ambassadors@gelitup.com>',
          replyTo: 'ambassadors@gelitup.com',
          attachments: [
            { filename: letter.filename, content: letter.pdf, contentType: 'application/pdf' },
            ...logos,
          ],
        }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Email webhook failed with ${response.status}: ${text.slice(0, 200)}`)
      }
      await appendSendLog(supabase, row)
      results.push({ email, status: 'sent' })
    } catch (sendError) {
      results.push({ email, status: 'failed', error: sendError instanceof Error ? sendError.message : String(sendError) })
    }
  }

  const failed = results.filter((r) => r.status === 'failed')
  console.log('send-ambassador-new-logo-letter', JSON.stringify({ logosAttached: logos.length, results }))
  return {
    statusCode: failed.length ? 500 : 200,
    body: JSON.stringify({
      ok: failed.length === 0,
      sent: results.filter((r) => r.status === 'sent').length,
      skipped: results.filter((r) => r.status === 'skipped_already_sent').length,
      failed: failed.length,
      logosAttached: logos.length,
      results,
    }),
  }
}
