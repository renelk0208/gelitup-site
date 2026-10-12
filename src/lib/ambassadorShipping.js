// Carrier detection and delivery estimates for ambassador PR packages.
//
// The carrier is worked out from the tracking link (or, failing that, the
// shape of the tracking number), so nobody has to pick it by hand.
// Delivery times are ESTIMATES in calendar days from the day the package is
// sent. Adjust TRANSIT_DAYS if a carrier is usually faster or slower.
// supabase/sql/ambassador_step2_shipments.sql uses the same numbers to fill
// in packages that were already sent.

export const CARRIERS = {
  geniki: { label: 'Geniki Taxydromiki' },
  speedy: { label: 'Speedy' },
  gls: { label: 'GLS' },
  bgpost: { label: 'Bulgarian Post' },
  other: { label: 'Other' },
}

const EU = new Set([
  'austria', 'belgium', 'bulgaria', 'croatia', 'cyprus', 'czech republic', 'denmark', 'estonia', 'finland',
  'france', 'germany', 'greece', 'hungary', 'ireland', 'italy', 'latvia', 'lithuania', 'luxembourg', 'malta',
  'netherlands', 'poland', 'portugal', 'romania', 'slovakia', 'slovenia', 'spain', 'sweden',
])

// Country names arrive in many spellings from the application form.
const COUNTRY_ALIASES = {
  'ελλάδα': 'Greece', 'ελλαδα': 'Greece', 'hellas': 'Greece', 'greece': 'Greece',
  'românia': 'Romania', 'romania': 'Romania',
  'polska': 'Poland', 'poland': 'Poland',
  'españa': 'Spain', 'espana': 'Spain', 'spain': 'Spain',
  'belgië': 'Belgium', 'belgie': 'Belgium', 'belgique': 'Belgium', 'belgium': 'Belgium',
  'deutschland': 'Germany', 'germany': 'Germany',
  'italia': 'Italy', 'italy': 'Italy',
  'portugal açores': 'Portugal', 'portugal acores': 'Portugal', 'azores': 'Portugal', 'portugal': 'Portugal',
  'srbija': 'Serbia', 'serbia': 'Serbia',
  'shqipëri': 'Albania', 'shqiperi': 'Albania', 'albania': 'Albania',
  'usa': 'United States', 'united states': 'United States', 'united states of america': 'United States',
  'uk': 'United Kingdom', 'united kingdom': 'United Kingdom', 'scotland': 'United Kingdom',
}

export function normalizeCountry(value) {
  const raw = String(value || '').trim().replace(/['"`´]+$/g, '').trim()
  if (!raw) return ''
  const key = raw.toLowerCase()
  if (COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key]
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
}

export function detectCarrier(trackingNumber, trackingUrl) {
  const url = String(trackingUrl || '').toLowerCase()
  const num = String(trackingNumber || '').trim().toUpperCase()
  if (url.includes('taxydromiki') || url.includes('geniki') || /^GEN[EI]KI\b/.test(num)) return 'geniki'
  if (url.includes('speedy')) return 'speedy'
  if (url.includes('gls')) return 'gls'
  if (url.includes('bgpost') || /^[A-Z]{2}\d{9}BG$/.test(num)) return 'bgpost'
  if (/^\d{13}$/.test(num)) return 'gls'
  if (/^\d{10}$/.test(num) && num.startsWith('55')) return 'geniki'
  return num || url ? 'other' : ''
}

// Estimated calendar days from sending to delivery.
export function transitDays(carrier, country) {
  const c = normalizeCountry(country).toLowerCase()
  const inEU = EU.has(c)
  switch (carrier) {
    case 'geniki': return c === 'greece' ? 3 : 7
    case 'speedy': return c === 'bulgaria' ? 2 : c === 'greece' || c === 'romania' ? 4 : 6
    case 'gls': return inEU ? 6 : 10
    case 'bgpost': return inEU ? 14 : 21
    default: return 10
  }
}

export function estimateDelivery(sentAt, carrier, country) {
  if (!sentAt) return null
  const d = new Date(sentAt)
  if (Number.isNaN(d.getTime())) return null
  d.setUTCDate(d.getUTCDate() + transitDays(carrier, country))
  return d.toISOString().slice(0, 10)
}

export function carrierLabel(carrier) {
  return CARRIERS[carrier]?.label || (carrier ? String(carrier) : '')
}

// Delivery state of one sent package, for badges.
//   received: confirmed by the ambassador or ticked by an admin
//   late:     past its estimated delivery date and not confirmed
//   on_the_way
export function deliveryState(shipment, today = new Date()) {
  if (!shipment) return null
  if (shipment.delivered_at) return 'received'
  const eta = shipment.expected_delivery
  if (eta && new Date(`${eta}T23:59:59Z`).getTime() < today.getTime()) return 'late'
  return 'on_the_way'
}
