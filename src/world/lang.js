import { WORLD_LANGS } from './i18n'

// Language for World of GEL.IT.UP.
// English by default; otherwise the language of the visitor's location.
//
// Order:
//   1. ?lang=xx in the link (carried over from the widget on country sites)
//   2. a language the visitor picked with the site's language switcher
//   3. the visitor's country (Netlify geo lookup) → that country's language
//   4. English

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
  try {
    // Only set when the visitor chooses a language with the site's switcher
    const picked = localStorage.getItem('gelitup_lang')
    if (picked && WORLD_LANGS.includes(picked)) return picked
  } catch { /* ignore */ }
  return ''
}

/** Resolve the competition language and the visitor's country. */
export async function detectWorldLang({ fallback = 'en', useExplicit = true } = {}) {
  const country = await detectCountry()
  const explicit = useExplicit ? explicitLang() : ''
  const lang = explicit || COUNTRY_LANG[country] || (WORLD_LANGS.includes(fallback) ? fallback : 'en')
  return { lang, country }
}
