import { createClient } from '@supabase/supabase-js'
import CARDS from './cards.json'

// One-off: each ambassador's personal discount-code card (her photo + code), attached.
// Runs once on its schedule (see netlify.toml) on SEND_DATE_UTC.
const AMBASSADOR_TABLE = process.env.AMBASSADOR_TABLE || 'ambassador_applications'
const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const MAIN_SITE = 'https://gelitup.com'
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const SEND_DATE_UTC = '2026-10-14'
const MESSAGE_MARKER = '[AMBASSADOR_CODE_CARD_2026_10_SENT]'

const SIGN_OFF = '<strong style="color:#111827;">René Krallis</strong><br/>Marketing Director, GEL.IT.UP International'

const COPY = {
  en: {
    subject: 'Your GEL.IT.UP Ambassador card 💕',
    header: 'Ambassador Programme · Your Card',
    dear: (n) => `Dear ${n},`,
    p1: (c) => `Your official GEL.IT.UP Ambassador card is ready! It's attached to this email, with your photo and your personal code <strong>${c}</strong>.`,
    p2: 'Share it on your Instagram feed and Stories so your clients know they get 20% off with your code at shop.gelitup.com. Every order with your code earns you credit.',
    p3: 'Please tag <strong>@gelitupinternational</strong> so we can share it too.',
    thanks: 'Thank you for being part of the GEL.IT.UP family!',
    love: 'With love,',
  },
  el: {
    subject: 'Η κάρτα σου ως GEL.IT.UP Ambassador 💕',
    header: 'Πρόγραμμα Ambassador · Η κάρτα σου',
    dear: (n) => `Αγαπητή ${n},`,
    p1: (c) => `Η επίσημη κάρτα σου ως GEL.IT.UP Ambassador είναι έτοιμη! Θα τη βρεις συνημμένη σε αυτό το email, με τη φωτογραφία σου και τον προσωπικό σου κωδικό <strong>${c}</strong>.`,
    p2: 'Μοιράσου την στο Instagram (feed και Stories), ώστε οι πελάτισσές σου να ξέρουν ότι με τον κωδικό σου έχουν 20% έκπτωση στο shop.gelitup.com. Με κάθε παραγγελία με τον κωδικό σου κερδίζεις πίστωση.',
    p3: 'Μην ξεχάσεις να κάνεις tag το <strong>@gelitupinternational</strong> για να τη μοιραστούμε κι εμείς.',
    thanks: 'Σε ευχαριστούμε που είσαι μέρος της οικογένειας GEL.IT.UP!',
    love: 'Με αγάπη,',
  },
  ro: {
    subject: 'Cardul tău de Ambasador GEL.IT.UP 💕',
    header: 'Programul de Ambasadori · Cardul tău',
    dear: (n) => `Dragă ${n},`,
    p1: (c) => `Cardul tău oficial de Ambasador GEL.IT.UP este gata! Îl găsești atașat acestui email, cu fotografia ta și codul tău personal <strong>${c}</strong>.`,
    p2: 'Distribuie-l pe Instagram (feed și Stories), ca clientele tale să știe că primesc 20% reducere cu codul tău pe shop.gelitup.com. Pentru fiecare comandă cu codul tău primești credit.',
    p3: 'Te rugăm să ne etichetezi <strong>@gelitupinternational</strong> ca să-l putem distribui și noi.',
    thanks: 'Îți mulțumim că faci parte din familia GEL.IT.UP!',
    love: 'Cu drag,',
  },
  fr: {
    subject: "Votre carte d'Ambassadrice GEL.IT.UP 💕",
    header: 'Programme Ambassadrices · Votre carte',
    dear: (n) => `Chère ${n},`,
    p1: (c) => `Votre carte officielle d'Ambassadrice GEL.IT.UP est prête ! Vous la trouverez en pièce jointe, avec votre photo et votre code personnel <strong>${c}</strong>.`,
    p2: "Partagez-la sur Instagram (publication et Stories) pour que vos clientes sachent qu'elles bénéficient de 20 % de réduction avec votre code sur shop.gelitup.com. Chaque commande avec votre code vous rapporte du crédit.",
    p3: 'Pensez à identifier <strong>@gelitupinternational</strong> pour que nous puissions la partager aussi.',
    thanks: 'Merci de faire partie de la famille GEL.IT.UP !',
    love: 'Avec toute notre affection,',
  },
  es: {
    subject: 'Tu tarjeta de Embajadora GEL.IT.UP 💕',
    header: 'Programa de Embajadoras · Tu tarjeta',
    dear: (n) => `Querida ${n}:`,
    p1: (c) => `¡Tu tarjeta oficial de Embajadora GEL.IT.UP ya está lista! La encontrarás adjunta a este correo, con tu foto y tu código personal <strong>${c}</strong>.`,
    p2: 'Compártela en Instagram (publicación y Stories) para que tus clientas sepan que tienen un 20 % de descuento con tu código en shop.gelitup.com. Cada pedido con tu código te genera crédito.',
    p3: 'Etiqueta a <strong>@gelitupinternational</strong> para que también podamos compartirla.',
    thanks: '¡Gracias por formar parte de la familia GEL.IT.UP!',
    love: 'Con cariño,',
  },
  pt: {
    subject: 'O teu cartão de Embaixadora GEL.IT.UP 💕',
    header: 'Programa de Embaixadoras · O teu cartão',
    dear: (n) => `Querida ${n},`,
    p1: (c) => `O teu cartão oficial de Embaixadora GEL.IT.UP está pronto! Segue em anexo a este email, com a tua fotografia e o teu código pessoal <strong>${c}</strong>.`,
    p2: 'Partilha-o no Instagram (feed e Stories) para que as tuas clientes saibam que têm 20% de desconto com o teu código em shop.gelitup.com. Cada encomenda com o teu código dá-te crédito.',
    p3: 'Identifica a <strong>@gelitupinternational</strong> para que também o possamos partilhar.',
    thanks: 'Obrigada por fazeres parte da família GEL.IT.UP!',
    love: 'Com carinho,',
  },
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildEmail(card) {
  const t = COPY[card.lang] || COPY.en
  const p = 'margin:0 0 14px 0;'
  const html = `
  <div style="background-color:#f6f1ee;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
      <tr><td style="background-color:#B8418A;padding:22px 28px;text-align:center;">
        <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:1.5px;">GEL.IT.UP</span>
        <div style="color:#ffffff;font-size:13px;margin-top:4px;letter-spacing:0.5px;">${t.header}</div>
      </td></tr>
      <tr><td style="padding:30px 30px 22px 30px;font-size:15px;color:#1f2937;line-height:1.65;">
        <p style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#111827;">${t.dear(escapeHtml(card.firstName))}</p>
        <p style="${p}">${t.p1(escapeHtml(card.code))}</p>
        <p style="${p}">${t.p2}</p>
        <p style="margin:0 0 18px 0;">${t.p3}</p>
        <p style="margin:0 0 22px 0;font-weight:600;color:#111827;">${t.thanks}</p>
        <p style="margin:0;color:#6b7280;font-size:14px;">${t.love}<br/>${SIGN_OFF}</p>
      </td></tr>
      <tr><td style="background-color:#f9fafb;padding:18px 28px;text-align:center;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">
        <a href="https://www.gelitup.com" style="color:#9ca3af;">www.gelitup.com</a> · ambassadors@gelitup.com · WhatsApp/Viber: +30 694 071 5234
      </td></tr>
    </table>
  </div>`
  return { subject: t.subject, html }
}

async function appendSendLog(supabase, row, subject) {
  const entry = `[${new Date().toISOString()}] 📧 Sent to ${row.email} · “${subject}” ${MESSAGE_MARKER}`
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

  const seen = new Set()
  const results = []
  for (const row of data || []) {
    const email = String(row.email || '').trim().toLowerCase()
    const card = CARDS[email]
    if (!email || !card || seen.has(email)) continue
    seen.add(email)
    if (String(row.admin_comment || '').includes(MESSAGE_MARKER)) {
      results.push({ email, status: 'skipped_already_sent' })
      continue
    }
    const { subject, html } = buildEmail(card)
    try {
      const response = await fetch(EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(WEBHOOK_KEY ? { apikey: WEBHOOK_KEY, Authorization: `Bearer ${WEBHOOK_KEY}` } : {}),
        },
        body: JSON.stringify({
          eventType: 'ambassador_code_card',
          to: email,
          subject,
          html,
          from: 'GEL.IT.UP Ambassadors <ambassadors@gelitup.com>',
          replyTo: 'ambassadors@gelitup.com',
          attachments: [{ filename: card.filename, content: card.image, contentType: 'image/jpeg' }],
        }),
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Email webhook failed with ${response.status}: ${text.slice(0, 200)}`)
      }
      await appendSendLog(supabase, row, subject)
      results.push({ email, status: 'sent' })
    } catch (sendError) {
      results.push({ email, status: 'failed', error: sendError instanceof Error ? sendError.message : String(sendError) })
    }
  }

  const failed = results.filter((r) => r.status === 'failed')
  console.log('send-ambassador-code-card', JSON.stringify({ results }))
  return {
    statusCode: failed.length ? 500 : 200,
    body: JSON.stringify({
      ok: failed.length === 0,
      sent: results.filter((r) => r.status === 'sent').length,
      skipped: results.filter((r) => r.status === 'skipped_already_sent').length,
      failed: failed.length,
      results,
    }),
  }
}
