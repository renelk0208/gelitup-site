import { createClient } from '@supabase/supabase-js'

// "I've received my package" link in the ambassador's tracking email.
//
//   GET  /package-received?t=<token>  -> page with a confirm button
//   POST /package-received?t=<token>  -> marks the package received
//
// Opening the link does NOT confirm on its own: email programs often open
// links automatically to scan them, which would tick packages that never
// arrived. Only pressing the button confirms.

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
// Works with the public (anon) key: the two database functions below only ever
// touch the one package whose private token is in the link.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
  || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function fmtDate(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Athens' })
}

function page(title, body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · GEL.IT.UP</title><meta name="robots" content="noindex">
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b0b;color:#fff;font-family:Arial,Helvetica,sans-serif;padding:16px;box-sizing:border-box}
  .card{max-width:440px;width:100%;background:#151515;border:1px solid #2a2a2a;border-radius:18px;padding:32px 26px;text-align:center}
  .brand{letter-spacing:.18em;font-weight:700;font-size:13px;color:#d43790;margin-bottom:18px}
  h1{font-size:22px;margin:0 0 10px}
  p{color:#cfcfcf;line-height:1.55;font-size:15px;margin:8px 0}
  button{margin-top:18px;background:#16a34a;color:#fff;border:0;border-radius:999px;padding:14px 26px;font-size:16px;font-weight:700;cursor:pointer;width:100%}
  button:hover{background:#15803d}
  a{color:#d43790}
  .small{font-size:12px;color:#8a8a8a;margin-top:18px}
</style></head><body><main class="card"><div class="brand">GEL.IT.UP</div>${body}</main></body></html>`,
  }
}

export async function handler(event) {
  const token = String(event.queryStringParameters?.t || '').trim()
  if (!TOKEN_RE.test(token)) {
    return page('Link not valid', '<h1>This link isn\'t valid</h1><p>Please use the button in your tracking email, or reply to that email and we\'ll sort it out.</p>', 400)
  }
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return page('Please try later', '<h1>Something went wrong</h1><p>Please try again later, or reply to your tracking email.</p>', 500)
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })

  const { data: found, error } = await supabase.rpc('get_package_by_receipt_token', { p_token: token })
  const shipment = Array.isArray(found) ? found[0] : found
  if (error || !shipment) {
    console.error('package-received: lookup failed', error?.message || 'no row')
    return page('Link not valid', '<h1>We couldn\'t find this package</h1><p>Please reply to your tracking email and we\'ll check it for you.</p>', 404)
  }
  const rawFirst = String(shipment.first_name || '').trim()
  const firstName = rawFirst // full name, already capitalised by the database
  const sentLine = `${shipment.sent_at ? `sent on ${esc(fmtDate(shipment.sent_at))}` : ''}${shipment.tracking_number ? ` · tracking ${esc(shipment.tracking_number)}` : ''}`

  if (shipment.delivered_at) {
    return page('Already confirmed', `<h1>Thank you${firstName ? `, ${esc(firstName)}` : ''}! 💖</h1><p>We already have your package as received (${esc(fmtDate(shipment.delivered_at))}).</p><p>We can't wait to see what you create — tag <strong>@gelitupinternational</strong>.</p>`)
  }

  if (event.httpMethod === 'POST') {
    const { error: updateError } = await supabase.rpc('confirm_package_by_receipt_token', { p_token: token })
    if (updateError) {
      console.error('package-received: update failed', updateError.message)
      return page('Please try later', '<h1>Something went wrong</h1><p>Please try again in a moment, or reply to your tracking email.</p>', 500)
    }
    return page('Thank you', `<h1>Thank you${firstName ? `, ${esc(firstName)}` : ''}! 💖</h1><p>We've noted that your GEL.IT.UP package arrived.</p><p>We can't wait to see what you create — tag <strong>@gelitupinternational</strong> and send your looks to our WhatsApp/Viber.</p>`)
  }

  return page('Confirm your package', `<h1>Has your package arrived${firstName ? `, ${esc(firstName)}` : ''}?</h1>
    <p>Your GEL.IT.UP PR package${sentLine ? `<br><span class="small">${sentLine}</span>` : ''}</p>
    <form method="POST" action="/package-received?t=${encodeURIComponent(token)}"><button type="submit">✅ Yes, I've received my package</button></form>
    <p class="small">Not arrived yet? No need to do anything — just come back to this email when it does.</p>`)
}
