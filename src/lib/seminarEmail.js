// Booking email with the attendee's personal seminar access code.
// Shared by the website admin page and the Shopify order webhook.

const BRAND = '#D43790'
const escapeHtml = (v) => String(v ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export const SEMINAR_SITE = 'https://gelitup.com'

export function seminarSignInLink(email, code) {
  return `${SEMINAR_SITE}/seminars/login?email=${encodeURIComponent(email || '')}&code=${encodeURIComponent(code)}`
}

export function seminarCodeEmail({ name, email, codes, seminar }) {
  const list = Array.isArray(codes) ? codes : [codes]
  const when = new Date(seminar.starts_at).toLocaleString('en-GB', {
    timeZone: 'Europe/Athens', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  const many = list.length > 1
  const codeBlocks = list.map((c, i) => `
    <p style="font-size:22px;font-family:monospace;letter-spacing:3px;background:#f5f5f5;padding:14px;text-align:center;border-radius:8px;margin:8px 0">
      ${many ? `<span style="font-size:12px;letter-spacing:1px;color:#666;font-family:Arial">Seat ${i + 1}</span><br/>` : ''}<strong>${escapeHtml(c)}</strong>
    </p>`).join('')
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <p style="color:${BRAND};font-weight:bold;letter-spacing:2px;font-size:12px">GEL.IT.UP LIVE SEMINAR</p>
  <h1 style="font-size:22px;margin:4px 0 12px">${escapeHtml(seminar.title)}</h1>
  <p>Hi ${escapeHtml(name || 'there')},</p>
  <p>${many ? `Your ${list.length} seats are booked. Each person needs their own code — please forward one code to each attendee.` : 'Your seat is booked. Here is your personal access code:'}</p>
  ${codeBlocks}
  <p><strong>When:</strong> ${escapeHtml(when)} (Greece / Bulgaria time)</p>
  <p style="text-align:center;margin:24px 0"><a href="${seminarSignInLink(many ? '' : email, list[0])}" style="background:${BRAND};color:#fff;padding:14px 26px;border-radius:8px;text-decoration:none;font-weight:bold">Open my seminar</a></p>
  <p style="font-size:13px;color:#555">Sign in at gelitup.com/seminars with your email address and code. It works on phone, tablet or computer — nothing to install. Each code is personal and works on one device at a time. After the seminar you can rewatch the recording for ${Number(seminar.replay_days ?? 30)} days.</p>
  <p style="font-size:13px;color:#555"><strong>Cancellation:</strong> you can cancel free of charge, with a full refund of the seminar seat, up to 24 hours before the start — sign in at gelitup.com/seminars and choose "Cancel my booking". Within 24 hours of the start the seat cannot be refunded.</p>
  <p style="font-size:13px;color:#555">Questions? Just reply to this email.</p>
</div>`
  return { subject: `Your access code — ${seminar.title}`, html }
}
