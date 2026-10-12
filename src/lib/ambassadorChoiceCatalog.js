// Products an ambassador can pick from for their next PR package.
// Built from the B2B price list (what we actually sell), with the category and
// photo taken from the product image map. Left out: equipment, hidden and
// out-of-stock products.

const EXCLUDED_CATEGORIES = new Set(['EQUIPMENT'])

const norm = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const normLoose = (value) => String(value || '').replace(/[_.-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

export function displayName(name) {
  return String(name || '').replace(/\s*-\s*HTF\s*$/i, '').replace(/\s+/g, ' ').trim()
}

const CATEGORY_LABELS = {
  COLORS: 'Colours',
  'BUILDER GEL': 'Builder gels',
  'NAIL ART': 'Nail art',
  TOOLS: 'Tools',
  CONSUMABLES: 'Consumables',
  'NAIL HAND & FOOT CARE': 'Hand & foot care',
  MULTIMIX: 'MultiMix',
  TOPS: 'Top coats',
  BASES: 'Base coats',
  'LINE-IT-UP': 'Line It Up',
  BRUSHES: 'Brushes',
  ACRYLIC: 'Acrylic',
  'BY THE OCEAN': 'By the Ocean',
  'NAIL PREPARATIONS': 'Nail preparations',
  COBWEB: 'Cobweb',
}

// The product line an item belongs to, from its photo folder, e.g.
// BUILDER GEL/PREMIUM BUILDER. Ambassadors may choose one product of each
// type (gel polish colours: up to 3). Size folders (MultiMix 30gr / 60gr) count
// as one type. Products without a photo folder are their own type.
const titleCase = (v) => String(v || '').toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase())
// Gel polish colours and effects (solid, glitter, cat eye, French, By the Ocean…)
// count as one type, and up to 3 of them can be chosen.
const GEL_POLISH_CATEGORIES = new Set(['COLORS', 'BY THE OCEAN'])
export const TYPE_LIMITS = { 'GEL POLISH': 3 }
export const typeLimit = (type) => TYPE_LIMITS[type] || 1
export function productType(parts, name) {
  if (!parts || parts.length <= 4) return { type: `item:${norm(name)}`, typeLabel: name }
  const category = parts[3]
  if (GEL_POLISH_CATEGORIES.has(category)) return { type: 'GEL POLISH', typeLabel: 'gel polish colour' }
  const sub = parts.length > 5 ? parts[4] : ''
  const sizeFolder = /^\d+\s*(g|gr|ml)?$/i.test(sub)
  if (!sub || sizeFolder) return { type: category, typeLabel: CATEGORY_LABELS[category] || titleCase(category) }
  return { type: `${category}/${sub}`, typeLabel: titleCase(sub) }
}

export function buildChoiceCatalog({ priceList, imageMap, outOfStock = [], hidden = [] }) {
  const imageByName = new Map(Object.entries(imageMap || {}).map(([k, v]) => [norm(k), v]))
  const oos = new Set((outOfStock || []).map(normLoose))
  const hiddenSet = new Set((hidden || []).map(norm))
  const seen = new Set()
  const out = []
  for (const item of priceList?.items || []) {
    const name = displayName(item.name)
    const key = norm(name)
    if (!name || seen.has(key)) continue
    if (hiddenSet.has(norm(item.name)) || hiddenSet.has(key)) continue
    if (oos.has(normLoose(item.name)) || oos.has(normLoose(name))) continue
    const image = imageByName.get(norm(item.name)) || imageByName.get(key) || ''
    const parts = image.split('/')
    const category = parts.length > 4 ? parts[3] : 'OTHER'
    if (EXCLUDED_CATEGORIES.has(category)) continue
    seen.add(key)
    const { type, typeLabel } = productType(parts, name)
    out.push({ name, category: CATEGORY_LABELS[category] || 'Other', image, type, typeLabel })
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, undefined, { numeric: true }))
}
