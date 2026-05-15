/**
 * auto-approve-b2b.mjs
 *
 * Runs on a 15-minute GitHub Actions schedule.
 * Finds B2B client applications (application_type = 'b2b_order') that have been
 * waiting in 'pending' or 'submitted' status for more than 1 hour, approves them,
 * and sends each client a welcome email with their portal login link.
 *
 * Required env vars (GitHub Actions secrets):
 *   SUPABASE_URL              Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY Supabase service role key (bypasses RLS)
 *   NOTIFY_SMTP_SERVER
 *   NOTIFY_SMTP_PORT
 *   NOTIFY_SMTP_USERNAME
 *   NOTIFY_SMTP_PASSWORD
 */

import nodemailer from 'nodemailer'

const SUPABASE_URL  = process.env.SUPABASE_URL  || ''
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SMTP_SERVER   = process.env.NOTIFY_SMTP_SERVER   || ''
const SMTP_PORT     = parseInt(process.env.NOTIFY_SMTP_PORT || '587', 10)
const SMTP_USER     = process.env.NOTIFY_SMTP_USERNAME || ''
const SMTP_PASS     = process.env.NOTIFY_SMTP_PASSWORD || ''
const PORTAL_URL    = process.env.PORTAL_URL || 'https://gelitup.com/portal/login'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ─── 1. Find pending B2B applications older than 1 hour ──────────────────────
const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString()

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const selectRes = await fetch(
  `${SUPABASE_URL}/rest/v1/b2b_registrations` +
  `?status=in.(pending,submitted)` +
  `&created_at=lt.${cutoff}` +
  `&select=id,contact_email,contact_name,company_name,application_type`,
  { headers }
)

if (!selectRes.ok) {
  const txt = await selectRes.text()
  console.error('Supabase query failed:', selectRes.status, txt)
  process.exit(1)
}

const allPending = await selectRes.json()

// Only auto-approve B2B buyers (not distributors — those need manual tier assignment)
const toApprove = allPending.filter(r => {
  const type = (r.application_type || 'b2b_order').toLowerCase()
  return type === 'b2b_order' || type === ''
})

if (toApprove.length === 0) {
  console.log('No pending B2B applications to auto-approve.')
  process.exit(0)
}

console.log(`Found ${toApprove.length} application(s) to auto-approve.`)

// ─── 2. Approve each application ─────────────────────────────────────────────
const ids = toApprove.map(r => r.id)

const updateRes = await fetch(
  `${SUPABASE_URL}/rest/v1/b2b_registrations?id=in.(${ids.join(',')})`,
  {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      status:           'approved',
      prices_allocated: true,
      reviewed_at:      new Date().toISOString(),
    }),
  }
)

if (!updateRes.ok) {
  const txt = await updateRes.text()
  console.error('Supabase update failed:', updateRes.status, txt)
  process.exit(1)
}

console.log(`Auto-approved ${ids.length} application(s): ${ids.join(', ')}`)

// ─── 3. Send welcome email to each approved client ───────────────────────────
if (!SMTP_SERVER || !SMTP_USER || !SMTP_PASS) {
  console.warn('SMTP not configured — skipping welcome emails.')
  process.exit(0)
}

const transporter = nodemailer.createTransport({
  host:   SMTP_SERVER,
  port:   SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth:   { user: SMTP_USER, pass: SMTP_PASS },
})

for (const row of toApprove) {
  if (!row.contact_email) continue

  const loginLink = `${PORTAL_URL}?email=${encodeURIComponent(row.contact_email)}`
  const name      = row.contact_name  || 'there'
  const company   = row.company_name  || 'your business'

  try {
    await transporter.sendMail({
      from:    `GEL.IT.UP Distributors <${SMTP_USER}>`,
      to:      row.contact_email,
      subject: `Your GEL.IT.UP B2B account is ready — sign in now`,
      text: [
        `Hi ${name},`,
        ``,
        `Great news — your GEL.IT.UP B2B account for ${company} has been approved!`,
        ``,
        `You can sign in now at:`,
        loginLink,
        ``,
        `If you have any questions, contact us at distribution@gelitup.com.`,
        ``,
        `The GEL.IT.UP Team`,
      ].join('\n'),
      html: `
        <div style="font-family:sans-serif;font-size:14px;color:#333;max-width:480px">
          <p>Hi ${name},</p>
          <p>Great news — your <strong>GEL.IT.UP B2B account</strong> for <strong>${company}</strong> has been approved!</p>
          <p>You can sign in to the portal right now:</p>
          <p style="margin-top:16px">
            <a href="${loginLink}"
               style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:bold;display:inline-block">
              Sign In to the B2B Portal →
            </a>
          </p>
          <p style="margin-top:20px">If you have any questions, contact us at <a href="mailto:distribution@gelitup.com">distribution@gelitup.com</a>.</p>
          <p>The GEL.IT.UP Team</p>
          <p style="margin-top:16px;font-size:12px;color:#aaa">GEL.IT.UP by GIUP® — gelitup.com</p>
        </div>
      `,
    })
    console.log(`Welcome email sent to ${row.contact_email}`)
  } catch (err) {
    console.error(`Failed to send email to ${row.contact_email}:`, err.message)
  }
}

console.log('Auto-approve run complete.')
