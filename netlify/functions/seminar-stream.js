import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// Live seminars on Cloudflare Stream.
//   action "create"  (trainer / seminar team, signed in): makes the OBS stream for a seminar
//                    and stores the server address + stream key.
//   action "play"    (attendee with her session token, or trainer / team signed in): returns a
//                    short-lived signed player link — the live stream while the seminar is on,
//                    the recording afterwards. Videos can't be watched without such a link.
// Needs the Netlify env vars CF_ACCOUNT_ID and CF_STREAM_API_TOKEN (Stream: Edit).

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || ''
const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
const CF_ACCOUNT = process.env.CF_ACCOUNT_ID || ''
const CF_TOKEN = process.env.CF_STREAM_API_TOKEN || ''
const ALLOWED_ORIGINS = ['gelitup.com', 'www.gelitup.com', '*.netlify.app']

const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) })

async function cf(path, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) throw new Error(data?.errors?.[0]?.message || `Cloudflare ${res.status}`)
  return data.result
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

// One signing key for the account, created on first use and kept server-side in Supabase.
async function signingKey(admin) {
  const { data } = await admin.from('seminar_secrets').select('value').eq('name', 'cf_signing_key').maybeSingle()
  if (data?.value?.id && data?.value?.pem) return data.value
  const k = await cf('/keys', { method: 'POST' })
  const value = { id: k.id, pem: k.pem }
  await admin.from('seminar_secrets').upsert({ name: 'cf_signing_key', value, updated_at: new Date().toISOString() })
  return value
}

function signedPlayerUrl(key, uid, hours) {
  const header = { alg: 'RS256', kid: key.id }
  const payload = { sub: uid, kid: key.id, exp: Math.floor(Date.now() / 1000) + hours * 3600 }
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
  const pem = Buffer.from(key.pem, 'base64').toString('utf8')
  const sig = crypto.createSign('RSA-SHA256').update(body).sign(pem)
  return `https://iframe.videodelivery.net/${body}.${b64url(sig)}`
}

// The recording Cloudflare made from the live stream (newest ready one).
// Only recordings made from 45 minutes before the start count, so a test stream never becomes the replay.
async function findRecording(admin, seminarId, liveUid, startsAt, save = true) {
  const vids = await cf(`/live_inputs/${liveUid}/videos`)
  const from = startsAt ? new Date(startsAt).getTime() - 45 * 60000 : 0
  const all = (vids || []).filter((v) => v.readyToStream).sort((a, b) => new Date(b.created) - new Date(a.created))
  const ready = all.find((v) => new Date(v.created).getTime() >= from)
  if (!ready) return save ? null : all[0]?.uid || null
  if (!save) return ready.uid
  await cf(`/${ready.uid}`, { method: 'POST', body: JSON.stringify({ uid: ready.uid, requireSignedURLs: true, allowedOrigins: ALLOWED_ORIGINS }) }).catch(() => {})
  await admin.from('seminar_media').update({ cf_recording_uid: ready.uid, updated_at: new Date().toISOString() }).eq('seminar_id', seminarId)
  return ready.uid
}

async function staffCheck(authHeader, seminarId) {
  const jwt = String(authHeader || '').replace(/^Bearer\s+/i, '')
  if (!jwt) return false
  const user = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false } })
  const { data } = await user.rpc('seminar_is_staff_of', { p_seminar: seminarId })
  return data === true
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method' })
  if (!SUPABASE_URL || !SERVICE_KEY) return json(500, { error: 'not_configured' })
  if (!CF_ACCOUNT || !CF_TOKEN) return json(503, { error: 'stream_not_configured' })
  let body
  try { body = JSON.parse(event.body || '{}') } catch { return json(400, { error: 'bad_json' }) }
  const seminarId = String(body.seminar_id || '')
  if (!/^[0-9a-f-]{36}$/i.test(seminarId)) return json(400, { error: 'seminar' })
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

  try {
    const { data: media } = await admin.from('seminar_media').select('*').eq('seminar_id', seminarId).maybeSingle()

    if (body.action === 'create') {
      if (!(await staffCheck(event.headers.authorization || event.headers.Authorization, seminarId))) return json(403, { error: 'forbidden' })
      if (media?.cf_live_input_uid) return json(200, { ok: true, server: media.cf_rtmps_url, key: media.cf_stream_key })
      const { data: sem } = await admin.from('seminars').select('title, starts_at').eq('id', seminarId).maybeSingle()
      const li = await cf('/live_inputs', {
        method: 'POST',
        body: JSON.stringify({ meta: { name: `${sem?.title || 'Seminar'} — ${String(sem?.starts_at || '').slice(0, 10)}`, seminar_id: seminarId }, recording: { mode: 'automatic', timeoutSeconds: 300, requireSignedURLs: true, allowedOrigins: ALLOWED_ORIGINS } }),
      })
      await admin.from('seminar_media').upsert({ seminar_id: seminarId, cf_live_input_uid: li.uid, cf_rtmps_url: li.rtmps?.url || 'rtmps://live.cloudflare.com:443/live/', cf_stream_key: li.rtmps?.streamKey, updated_at: new Date().toISOString() })
      return json(200, { ok: true, server: li.rtmps?.url, key: li.rtmps?.streamKey })
    }

    if (body.action === 'play') {
      if (!media?.cf_live_input_uid) return json(404, { error: 'no_stream' })
      let mode = null
      if (body.token) {
        // Attendee: the room decides whether she may watch live or the replay right now.
        const { data: room } = await admin.rpc('seminar_room', { p_token: String(body.token) })
        const s = (room?.seminars || []).find((x) => x.id === seminarId)
        if (!s || !s.cf_stream) return json(403, { error: 'forbidden' })
        if (s.phase === 'live') mode = 'live'
        else if (s.phase === 'replay') mode = 'replay'
        else return json(403, { error: 'forbidden' })
      } else {
        if (!(await staffCheck(event.headers.authorization || event.headers.Authorization, seminarId))) return json(403, { error: 'forbidden' })
        mode = body.mode === 'replay' ? 'replay' : 'live'
      }
      const key = await signingKey(admin)
      if (mode === 'live') return json(200, { ok: true, mode, url: signedPlayerUrl(key, media.cf_live_input_uid, 6) })
      const { data: sem } = await admin.from('seminars').select('starts_at').eq('id', seminarId).maybeSingle()
      // Staff can look at the newest recording at any time (e.g. after the test) without fixing it as the replay.
      const rec = media.cf_recording_uid || (await findRecording(admin, seminarId, media.cf_live_input_uid, sem?.starts_at, Boolean(body.token)))
      if (!rec) return json(200, { ok: true, mode, pending: true })
      return json(200, { ok: true, mode, url: signedPlayerUrl(key, rec, 4) })
    }

    return json(400, { error: 'action' })
  } catch (e) {
    return json(502, { error: 'stream_error', message: String(e?.message || e) })
  }
}
