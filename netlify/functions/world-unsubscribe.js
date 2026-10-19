import { createClient } from '@supabase/supabase-js'

// One-click unsubscribe from World of GEL.IT.UP competition emails.
// Link format: /.netlify/functions/world-unsubscribe?t=<email_unsubscribe_token>

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''

const page = (title, text) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' },
  body: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#F8F8F6;color:#1A1A1A;font-family:Arial,sans-serif">
<div style="max-width:420px;padding:24px;text-align:center">
<img src="/NEW%20LOGO%202024-02.png" alt="GEL.IT.UP" style="height:64px;width:auto">
<div style="margin-top:8px;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase">World of <span style="color:#D43790">GEL.IT.UP</span></div>
<p style="margin-top:20px;line-height:1.6">${text}</p>
<p><a href="https://gelitup.com/world" style="color:#D43790">gelitup.com/world</a></p>
</div></body></html>`,
})

export async function handler(event) {
  const token = String(event.queryStringParameters?.t || '')
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return page('Unsubscribe', 'This unsubscribe link is not valid.')
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return page('Unsubscribe', 'Something went wrong. Please email ambassadors@gelitup.com and we will remove you.')
  }
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { error } = await db
    .from('world_profiles')
    .update({ competition_emails_opt_in: false })
    .eq('email_unsubscribe_token', token)
  if (error) {
    return page('Unsubscribe', 'Something went wrong. Please email ambassadors@gelitup.com and we will remove you.')
  }
  return page('Unsubscribed',
    'You have been unsubscribed from World of GEL.IT.UP competition emails. You can switch them back on any time on the competition page.')
}
