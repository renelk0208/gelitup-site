import { WORLD_LANGS } from './i18n'

// Language for World of GEL.IT.UP.
// Always English. The only exception is a link that explicitly asks for a
// language with ?lang=xx (used later by the embed on country sites).
// The visitor's location and the site's language switcher do NOT change it.

export const COUNTRY_LANG = {
  GR: 'el', CY: 'el',
  BG: 'bg',
  IT: 'it', SM: 'it', VA: 'it',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  RO: 'ro', MD: 'ro',
  PL: 'pl',
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  DE: 'de', AT: 'de', LI: 'de', CH: 'de',
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt',
  HU: 'hu',
}

const GEO_CACHE_KEY = 'gelitup.world.geo'

/** Visitor's country code from the existing /.netlify/functions/geo lookup (cached per session). */
export async function detectCountry({ timeoutMs = 1500 } = {}) {
  try {
    const cached = sessionStorage.getItem(GEO_CACHE_KEY)
    if (cached !== null) return cached
  } catch { /* ignore */ }
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch('/.netlify/functions/geo', { signal: ctrl.signal })
    clearTimeout(timer)
    const { countryCode } = await res.json()
    const code = /^[A-Z]{2}$/.test(countryCode || '') ? countryCode : ''
    try { sessionStorage.setItem(GEO_CACHE_KEY, code) } catch { /* ignore */ }
    return code
  } catch {
    return ''
  }
}

function explicitLang() {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (q && WORLD_LANGS.includes(q)) return q
  } catch { /* ignore */ }
  return ''
}

/** Resolve the competition language and the visitor's country. */
export async function detectWorldLang({ fallback = 'en', useExplicit = true } = {}) {
  const country = await detectCountry()
  const explicit = useExplicit ? explicitLang() : ''
  // Country is still detected (eligibility, default country), never the language.
  const lang = explicit || (WORLD_LANGS.includes(fallback) ? fallback : 'en')
  return { lang, country }
}
