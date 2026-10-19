// World of GEL.IT.UP — central competition settings.
// Everything brand- or market-specific lives here so it can be changed in one place.

export const WORLD_SITE = 'https://gelitup.com'
export const WORLD_BASE_PATH = '/world'

// LAUNCH SWITCH. While false, the competition (pages and widget) is only visible
// to GEL.IT.UP admins logged in through the portal admin login; everyone else
// sees a "coming soon" message. Set to true to go public.
export const WORLD_PUBLIC = false
export const WORLD_BUCKET = 'world-entries'

// Names shown on the page. Winners are the "GEL.IT.UP Icons" of the month the
// round is named for (world_rounds.icon_month, else the month the round ends),
// shown in the Hall of Fame. "Angels" stays GEL.IT.UP Greece's own term.
export const COMPETITION_NAME = 'World of GEL.IT.UP'

/** The month a round's winners are named for, e.g. "November 2026" in the visitor's language. */
export function iconMonth(round, lang = 'en') {
  if (!round) return ''
  const base = round.icon_month ? new Date(`${round.icon_month}T12:00:00Z`) : new Date(round.ends_at)
  try {
    return base.toLocaleDateString(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' })
  } catch {
    return base.toLocaleDateString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }
}

// Version of the competition rules people accept at registration. Change it when
// the rules change; everyone then re-accepts before their next entry or vote.
export const RULES_VERSION = '2026-10'

export const INSTAGRAM_TAG = '@gelitupinternational'
export const HASHTAG = '#WorldOfGELITUP'

// Where "Shop the look" sends people, by the entrant's / viewer's country.
// searchUrl: {q} is replaced with the product name. Without a searchUrl the
// product links go to the shop home page.
const DEFAULT_SHOP = {
  label: 'GEL.IT.UP Shop',
  shopUrl: 'https://shop.gelitup.com',
  searchUrl: 'https://shop.gelitup.com/search?q={q}',
}

export const COUNTRY_SHOPS = {
  GR: { label: 'GEL.IT.UP Greece', shopUrl: 'https://gelitup.gr' },
  IT: { label: 'GEL.IT.UP Italy', shopUrl: 'https://www.gelitup.it', searchUrl: 'https://www.gelitup.it/search?q={q}' },
}

export function shopFor(countryCode) {
  return COUNTRY_SHOPS[String(countryCode || '').toUpperCase()] || DEFAULT_SHOP
}

export function productShopLink(productName, countryCode, handle) {
  const shop = shopFor(countryCode)
  // Products picked from shop.gelitup.com link straight to their page there
  if (handle && shop === DEFAULT_SHOP) return `${DEFAULT_SHOP.shopUrl}/products/${encodeURIComponent(handle)}`
  if (!shop.searchUrl) return shop.shopUrl
  return shop.searchUrl.replace('{q}', encodeURIComponent(cleanProductName(productName)))
}

export function cleanProductName(name) {
  let s = String(name || '')
  // Repair UTF-8 text that was decoded as Latin-1 (e.g. "CulottÃ©" → "Culotté")
  if (/[ÃÂ][\x80-\xBF]/.test(s)) {
    try { s = decodeURIComponent(escape(s)) } catch { /* keep as is */ }
  }
  return s.replace(/\s*-HTF\s*$/i, '').replace(/\s+/g, ' ').trim()
}

// Countries offered in the "country of origin" picker. Markets with GEL.IT.UP
// presence first, then the rest alphabetically by English name.
export const COUNTRIES = [
  ['GR', 'Greece'], ['BG', 'Bulgaria'], ['IT', 'Italy'], ['ES', 'Spain'], ['LT', 'Lithuania'],
  ['AU', 'Australia'], ['LB', 'Lebanon'], ['RO', 'Romania'], ['PL', 'Poland'], ['RS', 'Serbia'],
  ['ZA', 'South Africa'], ['US', 'United States'],
  ['AL', 'Albania'], ['AT', 'Austria'], ['BE', 'Belgium'], ['BA', 'Bosnia and Herzegovina'],
  ['BR', 'Brazil'], ['CA', 'Canada'], ['HR', 'Croatia'], ['CY', 'Cyprus'], ['CZ', 'Czechia'],
  ['AD', 'Andorra'], ['GE', 'Georgia'], ['LI', 'Liechtenstein'], ['MC', 'Monaco'], ['SM', 'San Marino'], ['VA', 'Vatican City'],
  ['DK', 'Denmark'], ['EG', 'Egypt'], ['EE', 'Estonia'], ['FI', 'Finland'], ['FR', 'France'],
  ['DE', 'Germany'], ['HU', 'Hungary'], ['IS', 'Iceland'], ['IN', 'India'], ['IE', 'Ireland'],
  ['IL', 'Israel'], ['JO', 'Jordan'], ['KE', 'Kenya'], ['XK', 'Kosovo'], ['LV', 'Latvia'],
  ['LU', 'Luxembourg'], ['MT', 'Malta'], ['MX', 'Mexico'], ['MD', 'Moldova'], ['ME', 'Montenegro'],
  ['MA', 'Morocco'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NG', 'Nigeria'],
  ['MK', 'North Macedonia'], ['NO', 'Norway'], ['PT', 'Portugal'], ['SA', 'Saudi Arabia'],
  ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['SE', 'Sweden'], ['CH', 'Switzerland'],
  ['TR', 'Türkiye'], ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'],
]

// Who may ENTER (the database enforces each round's eligible_countries; this is the
// default shown in the profile form). Everyone, anywhere, may register and vote.
// The EU plus the non-EU European countries listed on gelitup.com, excluding the
// United Kingdom, Türkiye, Belarus and Ukraine.
export const ENTRY_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'AL', 'AD', 'BA', 'GE', 'IS', 'XK', 'LI', 'MD', 'MC', 'ME', 'MK', 'NO', 'SM', 'RS', 'CH', 'VA',
]

/** Can someone from this country enter the given round? */
export function canEnterFrom(countryCode, round) {
  const list = round?.eligible_countries?.length ? round.eligible_countries : ENTRY_COUNTRIES
  return list.includes(String(countryCode || '').toUpperCase())
}

const COUNTRY_NAME = Object.fromEntries(COUNTRIES)

export function countryName(code) {
  return COUNTRY_NAME[String(code || '').toUpperCase()] || code || ''
}

export function flagEmoji(code) {
  const c = String(code || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(c)) return '🌍'
  if (c === 'XK') return '🇽🇰'
  return String.fromCodePoint(...[...c].map(ch => 0x1f1e6 + ch.charCodeAt(0) - 65))
}

// Guess a sensible default country from the language in use
export const LANG_DEFAULT_COUNTRY = {
  el: 'GR', bg: 'BG', it: 'IT', es: 'ES', ro: 'RO', pl: 'PL', hu: 'HU', pt: 'PT', fr: 'FR', de: 'DE', lt: 'LT',
}

export const THEMES = [
  'autumn', 'everyday', 'halloween', 'best-french', '3d-design', 'movember', 'christmas', 'valentines', 'summer', 'chrome', 'other',
]
