// Shared rules for ambassador giveaways (portal card, Netlify function, admin).
//
// Monthly plan: 3 giveaways a month, one live at a time.
//   Slot 1 = week 1, Slot 2 = week 2, Slot 3 = week 3 (Monday to Sunday),
//   week 4 = last draw + shipping all prizes.
// Week 1 starts on the first Monday of the month.
//
// Eligibility (all must be true):
//   - at least 2 packages confirmed as received (not lost)
//   - at least 8 products she received in her packages AND reviewed on
//     shop.gelitup.com (Judge.me); she picks 8–10 prize items from these
//   - no approved giveaway in the last 6 months
//   - no request already waiting (requested / waitlisted)

export const GIVEAWAY_SLOTS = [1, 2, 3]
export const GIVEAWAY_MIN_PACKAGES = 2
export const GIVEAWAY_GAP_MONTHS = 6
// To qualify: at least 8 products she received AND reviewed.
// Prize: up to 10 products, every one of them received and reviewed by her
// (so to put more than 8 in the prize she reviews more first).
export const GIVEAWAY_MIN_REVIEWS = 8
export const GIVEAWAY_MAX_PRODUCTS = 10
const DAY = 24 * 60 * 60 * 1000

// Only packages she (or the admin) CONFIRMED as received count.
export function packageCountsAsReceived(shipment) {
  if (!shipment?.sent_at || shipment.lost_at) return false
  if (String(shipment.status || 'sent').toLowerCase() !== 'sent') return false
  return Boolean(shipment.delivered_at)
}

export function receivedPackageCount(shipments) {
  return (shipments || []).filter((s) => packageCountsAsReceived(s)).length
}

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

// month = 'YYYY-MM', slot = 1..3 -> { start: 'YYYY-MM-DD' (Monday), end: 'YYYY-MM-DD' (Sunday) }
export function giveawaySlotDates(month, slot) {
  const [y, m] = String(month || '').split('-').map(Number)
  if (!y || !m || !GIVEAWAY_SLOTS.includes(Number(slot))) return null
  const first = new Date(Date.UTC(y, m - 1, 1))
  const toMonday = (8 - first.getUTCDay()) % 7 // 0 when the 1st is a Monday
  const start = new Date(first.getTime() + (toMonday + (Number(slot) - 1) * 7) * DAY)
  const end = new Date(start.getTime() + 6 * DAY)
  return { start: ymd(start), end: ymd(end) }
}

// The next `count` calendar months, starting with next month: ['YYYY-MM', ...]
export function upcomingGiveawayMonths(count = 3, now = new Date()) {
  const out = []
  for (let i = 1; i <= count; i += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`)
  }
  return out
}

export function nextMonth(month) {
  const [y, m] = String(month || '').split('-').map(Number)
  if (!y || !m) return ''
  const d = new Date(Date.UTC(y, m, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`
}

export function formatGiveawayMonth(month) {
  const [y, m] = String(month || '').split('-').map(Number)
  if (!y || !m) return ''
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function formatGiveawayDate(value) {
  if (!value) return ''
  const d = new Date(`${String(value).slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// Did she have an approved giveaway in the last 6 months?
export function recentApprovedGiveaway(requests, now = new Date()) {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - GIVEAWAY_GAP_MONTHS, now.getUTCDate()))
  return (requests || [])
    .filter((r) => r.status === 'approved' && r.slot_start && new Date(`${r.slot_start}T12:00:00Z`) >= cutoff)
    .sort((a, b) => String(b.slot_start).localeCompare(String(a.slot_start)))[0] || null
}

export function openGiveawayRequest(requests) {
  return (requests || []).find((r) => r.status === 'requested' || r.status === 'waitlisted') || null
}

// When she can ask again after an approved giveaway: 6 months after its start.
export function nextGiveawayAllowedFrom(approved) {
  if (!approved?.slot_start) return ''
  const d = new Date(`${approved.slot_start}T12:00:00Z`)
  return ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + GIVEAWAY_GAP_MONTHS, d.getUTCDate())))
}
