import { createClient } from '@supabase/supabase-js'
import { tr } from '../../src/world/emailTexts.js'

// Automatic World of GEL.IT.UP emails — only to creators who ticked
// "send me automatic emails about the competition" (world_profiles.competition_emails_opt_in).
//
//   entry_live  — soon after a look is published, with the share link
//   progress    — Monday mornings while a round is open: hearts + rank
//   final_call  — about 48 hours before the round closes
//   results     — after the round closes: final rank, winner news
//   new_round   — when a new round starts (to everyone opted in)
//
// Runs every hour; only sends between 08:00 and 21:59 Greek time. Every email
// is logged in world_email_log, so nobody gets the same email twice and a run
// that stops early simply continues next hour. Every email has a one-click
// unsubscribe link.

export const config = {
  schedule: '20 * * * *',
}

const EMAIL_WEBHOOK_URL = process.env.VITE_EMAIL_WEBHOOK_URL || process.env.EMAIL_WEBHOOK_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const WEBHOOK_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY
const MAIN_SITE = 'https://gelitup.com'
const FROM = 'World of GEL.IT.UP <competition@gelitup.com>'
const REPLY_TO = 'ambassadors@gelitup.com'
const MAX_PER_RUN = 80 // stay well inside the function time limit; the rest goes next hour

function athensParts(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Athens', weekday: 'short', hour: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
  const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]))
  return { weekday: p.weekday, hour: Number(p.hour), ymd: `${p.year}-${p.month}-${p.day}` }
}

function escapeHtml(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function localizedTitle(round, lang) {
  const t = round.title || {}
  return t[lang] || t.en || round.slug
}

function countryLabel(code, lang) {
  try { return new Intl.DisplayNames([lang, 'en'], { type: 'region' }).of(code) || code } catch { return code }
}

function formatDate(iso, lang) {
  try {
    return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'long', timeZone: 'Europe/Athens' })
  } catch {
    return new Date(iso).toISOString().slice(0, 10)
  }
}

function photoUrl(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/world-entries/${encodeURI(path)}`
}

function emailHtml({ lang, name, paragraphs, imagePath, button, unsubscribeToken }) {
  const unsubscribe = `${MAIN_SITE}/.netlify/functions/world-unsubscribe?t=${unsubscribeToken}`
  return `<!doctype html><html><body style="margin:0;background:#F8F8F6">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F8F6"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;border:1px solid #E8E8E8">
      <tr><td style="background:#D43790;height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
      <tr><td style="background:#ffffff;padding:24px 28px 16px;text-align:center;border-bottom:1px solid #E8E8E8">
        <img src="${MAIN_SITE}/NEW%20LOGO%202024-02.png" alt="GEL.IT.UP" height="48" style="display:inline-block;height:48px;width:auto">
        <div style="margin-top:10px;font-size:13px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;color:#1A1A1A">World of <span style="color:#D43790">GEL.IT.UP</span></div>
      </td></tr>
      ${imagePath ? `<tr><td><img src="${escapeHtml(photoUrl(imagePath))}" alt="" width="560" style="display:block;width:100%;max-height:520px;object-fit:cover"></td></tr>` : ''}
      <tr><td style="padding:26px 28px 8px;font-size:15px;line-height:1.6">
        <p style="margin:0 0 12px">${escapeHtml(tr(lang, 'greet', { name }))}</p>
        ${paragraphs.map(p => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join('')}
      </td></tr>
      ${button ? `<tr><td align="center" style="padding:8px 28px 28px">
        <a href="${escapeHtml(button.href)}" style="display:inline-block;background:#D43790;color:#ffffff;text-decoration:none;font-weight:bold;font-size:13px;letter-spacing:1px;text-transform:uppercase;padding:14px 26px;border-radius:12px">${escapeHtml(button.label)}</a>
      </td></tr>` : ''}
      <tr><td style="padding:18px 28px;border-top:1px solid #eeeeee;font-size:11px;line-height:1.5;color:#888888;text-align:center">
        ${escapeHtml(tr(lang, 'footer'))}<br>
        <a href="${escapeHtml(unsubscribe)}" style="color:#888888">${escapeHtml(tr(lang, 'unsubscribe'))}</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`
}

async function sendEmail(to, subject, html) {
  const headers = { 'Content-Type': 'application/json' }
  if (WEBHOOK_KEY) { headers.apikey = WEBHOOK_KEY; headers.Authorization = `Bearer ${WEBHOOK_KEY}` }
  const res = await fetch(EMAIL_WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, subject, html, from: FROM, replyTo: REPLY_TO, eventType: 'world_competition' }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

/** Ranking for a round: best entry per user, with country and overall rank. */
async function rankRound(db, roundId) {
  const { data } = await db
    .from('world_entries')
    .select('id, user_id, country, vote_count, image_path, created_at')
    .eq('round_id', roundId)
    .eq('status', 'published')
    .order('vote_count', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(5000)
  const entries = data || []
  const best = new Map()
  const countryCounter = {}
  entries.forEach((e, i) => {
    countryCounter[e.country] = (countryCounter[e.country] || 0) + 1
    if (!best.has(e.user_id)) best.set(e.user_id, { ...e, rankGlobal: i + 1, rankCountry: countryCounter[e.country] })
  })
  return { entries, best }
}

function isScheduledRun(event) {
  try { return Boolean(JSON.parse(event?.body || '{}')?.next_run) } catch { return false }
}

export async function handler(event) {
  if (!isScheduledRun(event)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'This job only runs on its schedule.' }) }
  }
  const siteUrl = String(process.env.URL || '').replace(/\/+$/, '')
  if (siteUrl && siteUrl !== MAIN_SITE) {
    return { statusCode: 200, body: JSON.stringify({ skipped: `not the main site (${siteUrl})` }) }
  }
  if (!EMAIL_WEBHOOK_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Missing email webhook or Supabase settings' }) }
  }
  const athens = athensParts()
  if (athens.hour < 8 || athens.hour > 21) {
    return { statusCode: 200, body: JSON.stringify({ skipped: 'outside sending hours' }) }
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const now = Date.now()
  const nowIso = new Date(now).toISOString()
  const weekAgo = new Date(now - 7 * 86400000).toISOString()

  const { data: rounds } = await db.from('world_rounds').select('*').eq('is_published', true).gte('ends_at', weekAgo)
  const openRounds = (rounds || []).filter(r => r.starts_at <= nowIso && r.ends_at > nowIso)
  const endedRounds = (rounds || []).filter(r => r.ends_at <= nowIso)

  const { data: profiles } = await db
    .from('world_profiles')
    .select('user_id, display_name, handle, country, preferred_lang, email_unsubscribe_token')
    .eq('competition_emails_opt_in', true)
    .eq('is_banned', false)
  const optedIn = new Map((profiles || []).map(p => [p.user_id, p]))
  if (!optedIn.size) return { statusCode: 200, body: JSON.stringify({ sent: 0, reason: 'nobody opted in' }) }

  const { data: logRows } = await db.from('world_email_log').select('user_id, kind, ref').in('user_id', [...optedIn.keys()])
  const sentKeys = new Set((logRows || []).map(r => `${r.user_id}|${r.kind}|${r.ref}`))

  const emailCache = new Map()
  const emailFor = async (userId) => {
    if (emailCache.has(userId)) return emailCache.get(userId)
    const { data } = await db.auth.admin.getUserById(userId)
    const email = data?.user?.email || null
    emailCache.set(userId, email)
    return email
  }

  // Build the queue of emails to send this run
  const queue = []
  const add = (userId, kind, ref, build) => {
    if (!optedIn.has(userId) || sentKeys.has(`${userId}|${kind}|${ref}`)) return
    queue.push({ userId, kind, ref, build })
    sentKeys.add(`${userId}|${kind}|${ref}`)
  }

  for (const round of openRounds) {
    const { entries, best } = await rankRound(db, round.id)
    const endsInMs = new Date(round.ends_at).getTime() - now

    // entry_live: looks published in the last 48 hours
    for (const e of entries) {
      if (now - new Date(e.created_at).getTime() > 48 * 3600000) continue
      add(e.user_id, 'entry_live', e.id, (p, lang) => ({
        subject: tr(lang, 'entry_live_subject', { round: localizedTitle(round, lang) }),
        paragraphs: [tr(lang, 'entry_live_body', { round: localizedTitle(round, lang) })],
        imagePath: e.image_path,
        button: { label: tr(lang, 'btn_share'), href: `${MAIN_SITE}/world/${e.id}` },
      }))
    }

    const vars = (b, lang) => ({
      round: localizedTitle(round, lang), votes: b.vote_count, rankCountry: b.rankCountry, rankGlobal: b.rankGlobal,
      country: countryLabel(b.country, lang), date: formatDate(round.ends_at, lang),
    })

    // final_call: ~48 hours before closing
    if (endsInMs > 0 && endsInMs <= 48 * 3600000) {
      for (const [userId, b] of best) {
        add(userId, 'final_call', round.id, (p, lang) => ({
          subject: tr(lang, 'final_subject', { round: localizedTitle(round, lang) }),
          paragraphs: [tr(lang, 'final_body', vars(b, lang))],
          imagePath: b.image_path,
          button: { label: tr(lang, 'btn_share'), href: `${MAIN_SITE}/world/${b.id}` },
        }))
      }
    } else if (athens.weekday === 'Mon' && athens.hour >= 10 && endsInMs > 72 * 3600000) {
      // progress: Monday mornings, not in the final 3 days
      for (const [userId, b] of best) {
        add(userId, 'progress', `${round.id}:${athens.ymd}`, (p, lang) => ({
          subject: tr(lang, 'progress_subject', { name: p.display_name, votes: b.vote_count }),
          paragraphs: [tr(lang, 'progress_body', vars(b, lang))],
          imagePath: b.image_path,
          button: { label: tr(lang, 'btn_share'), href: `${MAIN_SITE}/world/${b.id}` },
        }))
      }
    }

    // new_round: started in the last 3 days, to everyone opted in who hasn't entered yet
    if (now - new Date(round.starts_at).getTime() <= 3 * 86400000) {
      for (const userId of optedIn.keys()) {
        if (best.has(userId)) continue
        add(userId, 'new_round', round.id, (p, lang) => ({
          subject: tr(lang, 'new_round_subject', { round: localizedTitle(round, lang) }),
          paragraphs: [tr(lang, 'new_round_body', { round: localizedTitle(round, lang), date: formatDate(round.ends_at, lang) })],
          button: { label: tr(lang, 'btn_upload'), href: `${MAIN_SITE}/world/upload` },
        }))
      }
    }
  }

  // results: rounds that closed in the last 7 days
  for (const round of endedRounds) {
    const { best } = await rankRound(db, round.id)
    for (const [userId, b] of best) {
      add(userId, 'results', round.id, (p, lang) => {
        const v = {
          round: localizedTitle(round, lang), votes: b.vote_count, rankCountry: b.rankCountry,
          rankGlobal: b.rankGlobal, country: countryLabel(b.country, lang),
        }
        const paragraphs = []
        if (b.rankCountry === 1 && b.vote_count > 0) paragraphs.push(tr(lang, 'results_country_winner', v))
        if (b.rankGlobal <= 3 && b.vote_count > 0) paragraphs.push(tr(lang, 'results_top', v))
        paragraphs.push(tr(lang, 'results_body', v))
        return {
          subject: tr(lang, 'results_subject', v),
          paragraphs,
          imagePath: b.image_path,
          button: { label: tr(lang, 'btn_winners'), href: `${MAIN_SITE}/world?tab=winners` },
        }
      })
    }
  }

  let sent = 0
  const failures = []
  for (const item of queue.slice(0, MAX_PER_RUN)) {
    const p = optedIn.get(item.userId)
    const lang = p.preferred_lang || 'en'
    try {
      const to = await emailFor(item.userId)
      if (!to) continue
      const content = item.build(p, lang)
      const html = emailHtml({ lang, name: p.display_name, paragraphs: content.paragraphs, imagePath: content.imagePath, button: content.button, unsubscribeToken: p.email_unsubscribe_token })
      await sendEmail(to, content.subject, html)
      await db.from('world_email_log').insert({ user_id: item.userId, kind: item.kind, ref: item.ref })
      sent++
    } catch (err) {
      failures.push(`${item.kind}:${item.userId}: ${err.message}`)
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ sent, queued: queue.length, remainingForNextRun: Math.max(0, queue.length - MAX_PER_RUN), failures: failures.slice(0, 10) }),
  }
}
