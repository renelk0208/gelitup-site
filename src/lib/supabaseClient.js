import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

// ────────────────────────────────────────────────────────────────────────────
// Resilient session storage
// ────────────────────────────────────────────────────────────────────────────
// Safari/iOS "Intelligent Tracking Prevention" purges script-writable
// localStorage (where Supabase keeps the auth session) after ~7 days of no
// first-party interaction. That forced returning clients to log in again and
// again — losing their pre-filled details and order history.
//
// To keep sessions alive as long as possible we mirror every session read/write
// into BOTH localStorage AND a first-party cookie. If one store is purged, the
// other can restore the session on the next visit. Cookies are chunked because a
// Supabase session token can exceed the ~4KB per-cookie limit.
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year (browser may cap lower)
const COOKIE_CHUNK_SIZE = 3200 // stay well under the ~4KB per-cookie limit

const isBrowser = typeof document !== 'undefined' && typeof window !== 'undefined'

function readCookie(name) {
  if (!isBrowser) return null
  const prefix = `${name}=`
  const parts = document.cookie ? document.cookie.split('; ') : []
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      try { return decodeURIComponent(part.slice(prefix.length)) } catch { return part.slice(prefix.length) }
    }
  }
  return null
}

function writeCookie(name, value) {
  if (!isBrowser) return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`
}

function deleteCookie(name) {
  if (!isBrowser) return
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`
}

// Read a (possibly chunked) value from cookies. `key.0` holds the chunk count.
function getFromCookies(key) {
  const countRaw = readCookie(`${key}.0`)
  if (countRaw == null) {
    // Non-chunked single cookie fallback
    return readCookie(key)
  }
  const count = Number(countRaw)
  if (!Number.isInteger(count) || count <= 0) return null
  let out = ''
  for (let i = 1; i <= count; i++) {
    const chunk = readCookie(`${key}.${i}`)
    if (chunk == null) return null // incomplete → treat as missing
    out += chunk
  }
  return out
}

function clearCookies(key) {
  const countRaw = readCookie(`${key}.0`)
  const count = Number(countRaw)
  if (Number.isInteger(count) && count > 0) {
    for (let i = 1; i <= count; i++) deleteCookie(`${key}.${i}`)
  }
  deleteCookie(`${key}.0`)
  deleteCookie(key)
}

function setToCookies(key, value) {
  // Clear any previous chunks first so stale data can't corrupt the read.
  clearCookies(key)
  const chunks = []
  for (let i = 0; i < value.length; i += COOKIE_CHUNK_SIZE) {
    chunks.push(value.slice(i, i + COOKIE_CHUNK_SIZE))
  }
  writeCookie(`${key}.0`, String(chunks.length))
  chunks.forEach((chunk, idx) => writeCookie(`${key}.${idx + 1}`, chunk))
}

const resilientStorage = {
  getItem(key) {
    if (!isBrowser) return null
    let value = null
    try { value = window.localStorage.getItem(key) } catch { value = null }
    if (value != null) {
      // Ensure the cookie mirror stays in sync (self-heals a purged cookie).
      try { setToCookies(key, value) } catch { /* ignore */ }
      return value
    }
    // localStorage was empty/purged — try to restore from the cookie mirror.
    const fromCookie = getFromCookies(key)
    if (fromCookie != null) {
      try { window.localStorage.setItem(key, fromCookie) } catch { /* ignore */ }
      return fromCookie
    }
    return null
  },
  setItem(key, value) {
    if (!isBrowser) return
    try { window.localStorage.setItem(key, value) } catch { /* ignore */ }
    try { setToCookies(key, value) } catch { /* ignore */ }
  },
  removeItem(key) {
    if (!isBrowser) return
    try { window.localStorage.removeItem(key) } catch { /* ignore */ }
    try { clearCookies(key) } catch { /* ignore */ }
  },
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gelitup.portal.session',
        storage: isBrowser ? resilientStorage : undefined,
      },
    })
  : null
