// World of GEL.IT.UP — central competition settings.
// Everything brand- or market-specific lives here so it can be changed in one place.

export const WORLD_SITE = 'https://gelitup.com'
export const WORLD_BASE_PATH = '/world'
export const WORLD_BUCKET = 'world-entries'

// Names shown on the page. "Angel" naming is pending alignment with GEL.IT.UP Bulgaria
// (owners of GEL.IT.UP Angels) — change WINNER_TITLE here if a different title is agreed.
export const COMPETITION_NAME = 'World of GEL.IT.UP'
export const WINNER_TITLE = 'GEL.IT.UP Angel of the Month'

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

export function productShopLink(productName, countryCode) {
  const shop = shopFor(countryCode)
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
  ['DK', 'Denmark'], ['EG', 'Egypt'], ['EE', 'Estonia'], ['FI', 'Finland'], ['FR', 'France'],
  ['DE', 'Germany'], ['HU', 'Hungary'], ['IS', 'Iceland'], ['IN', 'India'], ['IE', 'Ireland'],
  ['IL', 'Israel'], ['JO', 'Jordan'], ['KE', 'Kenya'], ['XK', 'Kosovo'], ['LV', 'Latvia'],
  ['LU', 'Luxembourg'], ['MT', 'Malta'], ['MX', 'Mexico'], ['MD', 'Moldova'], ['ME', 'Montenegro'],
  ['MA', 'Morocco'], ['NL', 'Netherlands'], ['NZ', 'New Zealand'], ['NG', 'Nigeria'],
  ['MK', 'North Macedonia'], ['NO', 'Norway'], ['PT', 'Portugal'], ['SA', 'Saudi Arabia'],
  ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['SE', 'Sweden'], ['CH', 'Switzerland'],
  ['TR', 'Türkiye'], ['UA', 'Ukraine'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'],
]

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
  'everyday', 'halloween', 'best-french', '3d-design', 'movember', 'christmas', 'valentines', 'summer', 'chrome', 'other',
]
