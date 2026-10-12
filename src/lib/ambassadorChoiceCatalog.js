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
    out.push({ name, category: CATEGORY_LABELS[category] || 'Other', image })
  }
  return out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, undefined, { numeric: true }))
}
