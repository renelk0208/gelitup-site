/**
 * notify-pending-b2b.mjs  (formerly auto-approve-b2b.mjs)
 *
 * Runs on a 15-minute GitHub Actions schedule.
 * Finds NEW B2B registrations (pending/submitted, created in the last 16 minutes)
 * and emails the admin a notification so they can review and approve manually.
 *
 * Required env vars (GitHub Actions secrets):
 *   SUPABASE_URL              Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY Supabase service role key (bypasses RLS)
 *   NOTIFY_ADMIN_EMAIL        Admin email address to notify
 *   NOTIFY_SMTP_SERVER
 *   NOTIFY_SMTP_PORT
 *   NOTIFY_SMTP_USERNAME
 *   NOTIFY_SMTP_PASSWORD
 */

import nodemailer from 'nodemailer'

const SUPABASE_URL     = process.env.SUPABASE_URL  || ''
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ADMIN_EMAIL      = process.env.NOTIFY_ADMIN_EMAIL || ''
const SMTP_SERVER      = process.env.NOTIFY_SMTP_SERVER   || ''
const SMTP_PORT        = parseInt(process.env.NOTIFY_SMTP_PORT || '587', 10)
const SMTP_USER        = process.env.NOTIFY_SMTP_USERNAME || ''
const SMTP_PASS        = process.env.NOTIFY_SMTP_PASSWORD || ''
const ADMIN_DASHBOARD  = 'https://gelitup.com/portal/admin-login'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('Supabase not configured — skipping B2B notification run.')
  process.exit(0)
}

// ─── 1. Find NEW registrations (created in the last 16 minutes) ──────────────
// 16-minute window is slightly wider than the 15-min cron interval to avoid gaps.
const cutoff = new Date(Date.now() - 16 * 60 * 1000).toISOString()

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/b2b_registrations` +
  `?status=in.(pending,submitted)` +
  `&created_at=gt.${cutoff}` +
  `&select=id,contact_email,contact_name,company_name,application_type,created_at` +
  `&order=created_at.asc`,
  { headers }
)

if (!res.ok) {
  const txt = await res.text()
  console.error('Supabase query failed:', res.status, txt)
  process.exit(1)
}

const newRegistrations = await res.json()

if (newRegistrations.length === 0) {
  console.log('No new B2B registrations in the last 16 minutes.')
  process.exit(0)
}

console.log(`Found ${newRegistrations.length} new registration(s) — sending admin notification.`)

// ─── 2. Send admin notification email ────────────────────────────────────────
if (!SMTP_SERVER || !SMTP_USER || !SMTP_PASS || !ADMIN_EMAIL) {
  console.warn('SMTP / admin email not configured — skipping notification.')
  process.exit(0)
}

const transporter = nodemailer.createTransport({
  host:   SMTP_SERVER,
  port:   SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth:   { user: SMTP_USER, pass: SMTP_PASS },
})

const rows = newRegistrations.map(r => ({
  ...r,
  type: r.application_type || 'b2b_order',
  time: new Date(r.created_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }),
}))

const isSingle  = rows.length === 1
const subject   = isSingle
  ? `🆕 New B2B Registration — ${rows[0].company_name || rows[0].contact_email}`
  : `🆕 ${rows.length} New B2B Registrations`

const textBody = [
  `You have ${rows.length} new B2B registration${rows.length > 1 ? 's' : ''} awaiting your approval.`,
  ``,
  ...rows.map((r, i) => [
    `${i + 1}. ${r.contact_name || '(no name)'} — ${r.company_name || '(no company)'}`,
    `   Email:    ${r.contact_email}`,
    `   Type:     ${r.type}`,
    `   Received: ${r.time}`,
  ].join('\n')),
  ``,
  `Approve at: ${ADMIN_DASHBOARD}`,
].join('\n')

const htmlRows = rows.map(r => `
  <tr>
    <td style="padding:8px 12px;border-bottom:1px solid #eee">${r.contact_name || '—'}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee">${r.company_name || '—'}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee">${r.contact_email}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;text-transform:capitalize">${r.type.replace(/_/g, ' ')}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #eee;white-space:nowrap">${r.time}</td>
  </tr>`).join('')

const htmlBody = `
  <div style="font-family:sans-serif;font-size:14px;color:#333;max-width:640px">
    <h2 style="font-size:16px;margin-bottom:4px">New B2B Registration${rows.length > 1 ? 's' : ''}</h2>
    <p style="color:#666;margin-top:0">${rows.length} application${rows.length > 1 ? 's' : ''} waiting for your approval.</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:20px">
      <thead>
        <tr style="background:#f5f5f5;font-size:12px;text-transform:uppercase;letter-spacing:.5px">
          <th style="padding:8px 12px;text-align:left">Name</th>
          <th style="padding:8px 12px;text-align:left">Company</th>
          <th style="padding:8px 12px;text-align:left">Email</th>
          <th style="padding:8px 12px;text-align:left">Type</th>
          <th style="padding:8px 12px;text-align:left">Received (SAST)</th>
        </tr>
      </thead>
      <tbody>${htmlRows}</tbody>
    </table>
    <a href="${ADMIN_DASHBOARD}"
       style="background:#111;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:bold;display:inline-block">
      Go to Admin Dashboard →
    </a>
    <p style="margin-top:20px;font-size:12px;color:#aaa">GEL.IT.UP by GIUP® — gelitup.com</p>
  </div>`

await transporter.sendMail({
  from:    `GEL.IT.UP Monitor <${SMTP_USER}>`,
  to:      ADMIN_EMAIL,
  subject,
  text:    textBody,
  html:    htmlBody,
})

console.log(`Notification sent to ${ADMIN_EMAIL} for ${rows.length} registration(s).`)
