// Netlify function: geo
//
// Returns the visitor's detected country using Cloudflare's automatic
// x-country header (injected by Netlify's CDN at zero cost — no API key needed).
// GET /.netlify/functions/geo
// Response: { countryCode: "ZA", countryName: "South Africa" }

// ISO 3166-1 alpha-2 → display name (matching COUNTRY_OPTIONS in App.jsx)
const ISO_TO_COUNTRY = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czech Republic',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  GB: 'United Kingdom',
  NO: 'Norway',
  CH: 'Switzerland',
  TR: 'Turkey',
  UA: 'Ukraine',
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  IL: 'Israel',
  EG: 'Egypt',
  ZA: 'South Africa',
  IN: 'India',
  CN: 'China',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
  AU: 'Australia',
  NZ: 'New Zealand',
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' }
  }

  // Cloudflare injects this header on all Netlify-hosted requests
  const raw = String(event.headers['x-country'] || event.headers['cf-ipcountry'] || '').toUpperCase().trim()
  const countryCode = /^[A-Z]{2}$/.test(raw) ? raw : ''
  const countryName = ISO_TO_COUNTRY[countryCode] || ''

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ countryCode, countryName }),
  }
}
