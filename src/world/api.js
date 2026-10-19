import { worldSupabase } from './worldClient'
import { WORLD_BUCKET, WORLD_SITE } from './config'

const db = () => {
  if (!worldSupabase) throw new Error('NOT_CONFIGURED')
  return worldSupabase
}

export const ENTRY_SELECT =
  'id, created_at, round_id, user_id, country, image_path, caption, products, vote_count, status, source_site, ' +
  'profile:world_profiles!world_entries_user_id_fkey(handle, display_name, instagram, country)'

/** Public photo URL. thumb=true gives the 600px version made at upload time. */
export function imageUrl(path, { thumb = false } = {}) {
  if (!path || !worldSupabase) return ''
  const p = thumb ? thumbPath(path) : path
  const { data } = worldSupabase.storage.from(WORLD_BUCKET).getPublicUrl(p)
  return data?.publicUrl || ''
}

export function thumbPath(path) {
  return String(path || '').replace(/\.jpg$/i, '_t.jpg')
}

export function entryUrl(id, params = {}) {
  const qs = new URLSearchParams(params).toString()
  return `${WORLD_SITE}/world/${id}${qs ? `?${qs}` : ''}`
}

/** Where the person is browsing from — used to credit traffic to each GEL.IT.UP site. */
export function currentSourceSite() {
  if (typeof window === 'undefined') return 'gelitup.com'
  const params = new URLSearchParams(window.location.search)
  const src = params.get('src')
  if (src && /^[a-z0-9.-]{3,80}$/i.test(src)) {
    try { sessionStorage.setItem('gelitup.world.src', src.toLowerCase()) } catch { /* ignore */ }
    return src.toLowerCase()
  }
  try {
    const saved = sessionStorage.getItem('gelitup.world.src')
    if (saved) return saved
  } catch { /* ignore */ }
  return window.location.hostname.replace(/^www\./, '') || 'gelitup.com'
}

// ── Rounds ──────────────────────────────────────────────────────────────────
export async function fetchCurrentRound() {
  const now = new Date().toISOString()
  const { data, error } = await db()
    .from('world_rounds')
    .select('*')
    .eq('is_published', true)
    .lte('starts_at', now)
    .order('ends_at', { ascending: false })
    .limit(5)
  if (error) throw error
  const rounds = data || []
  return rounds.find(r => r.ends_at > now) || rounds[0] || null
}

export async function fetchPastRounds(limit = 12) {
  const now = new Date().toISOString()
  const { data, error } = await db()
    .from('world_rounds')
    .select('*')
    .eq('is_published', true)
    .lt('ends_at', now)
    .order('ends_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ── Entries ─────────────────────────────────────────────────────────────────
export async function fetchEntries({ roundId, country, sort = 'new', limit = 48, offset = 0, userIds } = {}) {
  let q = db().from('world_entries').select(ENTRY_SELECT).eq('status', 'published')
  if (roundId) q = q.eq('round_id', roundId)
  if (country) q = q.eq('country', country)
  if (userIds) q = q.in('user_id', userIds)
  q = sort === 'popular'
    ? q.order('vote_count', { ascending: false }).order('created_at', { ascending: true })
    : q.order('created_at', { ascending: false })
  const { data, error } = await q.range(offset, offset + limit - 1)
  if (error) throw error
  return data || []
}

export async function fetchEntry(id) {
  const { data, error } = await db().from('world_entries').select(ENTRY_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function fetchLeader(roundId, country) {
  const rows = await fetchEntries({ roundId, country, sort: 'popular', limit: 1 })
  return rows[0] || null
}

/** Winners of a finished round: top 3 overall plus the top entry per country. */
export async function fetchRoundWinners(roundId) {
  const top = await fetchEntries({ roundId, sort: 'popular', limit: 200 })
  const overall = top.slice(0, 3)
  const byCountry = {}
  for (const e of top) {
    if (!byCountry[e.country]) byCountry[e.country] = e
  }
  return { overall, byCountry }
}

export async function fetchProfileByHandle(handle) {
  const { data, error } = await db()
    .from('world_profiles')
    .select('user_id, handle, display_name, instagram, country, created_at')
    .eq('handle', String(handle || '').toLowerCase())
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Auth & profile ──────────────────────────────────────────────────────────
export async function getSessionUser() {
  if (!worldSupabase) return null
  const { data } = await worldSupabase.auth.getSession()
  return data?.session?.user || null
}

export function onAuthChange(cb) {
  if (!worldSupabase) return () => {}
  const { data } = worldSupabase.auth.onAuthStateChange((_event, session) => cb(session?.user || null))
  return () => data.subscription.unsubscribe()
}

export async function sendSignInLink(email, nextPath) {
  const next = nextPath && nextPath.startsWith('/world') ? nextPath : '/world'
  const { error } = await db().auth.signInWithOtp({
    email: String(email || '').trim().toLowerCase(),
    options: {
      emailRedirectTo: `${window.location.origin}/world-auth.html?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  })
  if (error) throw error
}

export async function signOut() {
  if (worldSupabase) await worldSupabase.auth.signOut()
}

export async function fetchMyProfile(userId) {
  if (!userId) return null
  // Full own profile (incl. email preferences) comes through a function, because
  // the public can only read name / handle / Instagram / country.
  const { data, error } = await db().rpc('world_my_profile')
  if (error) throw error
  return (Array.isArray(data) ? data[0] : data) || null
}

export async function saveMyProfile(userId, profile, { isNew } = {}) {
  const row = {
    user_id: userId,
    handle: profile.handle,
    display_name: profile.display_name,
    instagram: profile.instagram || null,
    country: profile.country,
    adult_confirmed: true,
    marketing_opt_in: Boolean(profile.marketing_opt_in),
    competition_emails_opt_in: Boolean(profile.competition_emails_opt_in),
    preferred_lang: profile.preferred_lang || 'en',
  }
  if (isNew) row.signup_source = currentSourceSite()
  const { error } = await db().from('world_profiles').upsert(row, { onConflict: 'user_id' })
  if (error) throw error
  return fetchMyProfile(userId)
}

export async function setCompetitionEmails(userId, optIn) {
  const { error } = await db()
    .from('world_profiles')
    .update({ competition_emails_opt_in: Boolean(optIn) })
    .eq('user_id', userId)
  if (error) throw error
}

// ── Votes ───────────────────────────────────────────────────────────────────
export async function fetchMyVotes(userId, entryIds) {
  if (!userId || !entryIds?.length) return new Set()
  const { data, error } = await db().from('world_votes').select('entry_id').eq('user_id', userId).in('entry_id', entryIds)
  if (error) return new Set()
  return new Set((data || []).map(r => r.entry_id))
}

export async function castVote(userId, entryId) {
  const { error } = await db().from('world_votes').insert({ entry_id: entryId, user_id: userId, source_site: currentSourceSite() })
  if (error && error.code !== '23505') throw error
}

export async function removeVote(userId, entryId) {
  const { error } = await db().from('world_votes').delete().eq('entry_id', entryId).eq('user_id', userId)
  if (error) throw error
}

export async function reportEntry(userId, entryId, reason) {
  const { error } = await db().from('world_reports').insert({ entry_id: entryId, user_id: userId, reason: reason || null })
  if (error && error.code !== '23505') throw error
}

// ── Upload ──────────────────────────────────────────────────────────────────

/** Shrink a photo in the browser (max 1600px, JPEG) before upload. */
export async function compressImage(file, maxSide = 1600, quality = 0.86) {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return file
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality))
  return blob || file
}

export async function submitEntry({ userId, roundId, file, caption, products }) {
  const [blob, thumb] = await Promise.all([compressImage(file), compressImage(file, 600, 0.8)])
  const path = `${userId}/${roundId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
  const opts = { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }
  const { error: upErr } = await db().storage.from(WORLD_BUCKET).upload(path, blob, opts)
  if (upErr) throw upErr
  // Thumbnail for the grid; if it fails the grid falls back to the full photo
  await db().storage.from(WORLD_BUCKET).upload(thumbPath(path), thumb, opts).catch(() => {})
  const { data, error } = await db()
    .from('world_entries')
    .insert({
      round_id: roundId,
      user_id: userId,
      country: 'XX', // replaced by the database with the profile's country
      image_path: path,
      caption: caption?.trim() || null,
      products: (products || []).map(p => ({ name: p.name, sku: p.sku })),
      source_site: currentSourceSite(),
    })
    .select('id')
    .single()
  if (error) {
    await db().storage.from(WORLD_BUCKET).remove([path, thumbPath(path)]).catch(() => {})
    throw error
  }
  return data.id
}

export async function countMyEntries(userId, roundId) {
  if (!userId || !roundId) return 0
  const { count } = await db()
    .from('world_entries')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('round_id', roundId)
  return count || 0
}

export async function deleteMyEntry(entry) {
  const { error } = await db().from('world_entries').delete().eq('id', entry.id)
  if (error) throw error
  await db().storage.from(WORLD_BUCKET).remove([entry.image_path, thumbPath(entry.image_path)]).catch(() => {})
}

/** Map database error codes raised by the triggers to translation keys. */
export function errorKey(err) {
  const msg = String(err?.message || err || '')
  for (const k of ['ROUND_CLOSED', 'ENTRY_LIMIT', 'PROFILE_REQUIRED', 'ACCOUNT_BLOCKED', 'VOTE_RATE_LIMIT', 'ENTRY_UNAVAILABLE']) {
    if (msg.includes(k)) return `err_${k}`
  }
  if (/duplicate key.*handle/i.test(msg) || /world_profiles_handle_key/.test(msg)) return 'err_HANDLE_TAKEN'
  if (/rate limit|too many/i.test(msg)) return 'err_EMAIL_RATE'
  return 'err_generic'
}
