const SOFIA_MIDNIGHT = {
  stage1: '2026-09-01T00:00:00+03:00',
  stage2: '2026-09-07T00:00:00+03:00',
  stage3: '2026-09-14T00:00:00+03:00',
  stage4: '2026-09-21T00:00:00+03:00',
}

const builderGlitters = [
  {
    code: '3-in-1 Glitter Builder Gels Copper Sunshine 20g -HTF',
    name: 'Copper Sunshine',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_copper_sunshine.webp',
    matchTerms: ['COPPER SUNSHINE'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Cosmic Glitter 20g -HTF',
    name: 'Cosmic Glitter',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_cosmic_dust.webp',
    matchTerms: ['COSMIC GLITTER', 'COSMIC DUST'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Copper Deep Sea Galaxy 20g -HTF',
    name: 'Deep Sea Galaxy',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_deep_sea_galaxy.webp',
    matchTerms: ['DEEP SEA GALAXY'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Copper Electric Orchid 20g -HTF',
    name: 'Electric Orchid',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_electric_orchid.webp',
    matchTerms: ['ELECTRIC ORCHID'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Copper Rose Stardust 20g -HTF',
    name: 'Rose Stardust',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_rose_stardust.webp',
    matchTerms: ['ROSE STARDUST'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Copper Stardust Plum 20g -HTF',
    name: 'Stardust Plum',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_stardust_plum.webp',
    matchTerms: ['STARDUST PLUM'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Copper Supernova Indigo 20g -HTF',
    name: 'Supernova Indigo',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_supernova_indigo.webp',
    matchTerms: ['SUPERNOVA INDIGO'],
  },
  {
    code: '3-in-1 Glitter Builder Gels Copper Warm Sand Glow 20g -HTF',
    name: 'Warm Sand Glow',
    imageUrl: '/gelitup-content/product-images/BUILDER GEL/3-IN-1 BUILDER/Glitter 3-in-1-Builder-Gel/3-in-1_builder_gel_glitter_warm_sand_glow.webp',
    matchTerms: ['WARM SAND GLOW'],
  },
]

const spiralShimmers = Array.from({ length: 5 }, (_, index) => {
  const number = String(index + 1).padStart(2, '0')
  return {
    code: `Spiral_shimmers_${number} -HTF`,
    name: `Spiral Shimmers ${number}`,
    imageUrl: `/gelitup-content/product-images/COLORS/SPIRAL SHIMMERS/spiral_shimmers_${number}.webp`,
    matchTerms: [`SPIRAL SHIMMERS ${number}`],
  }
})

const premiumBuilder20g = [
  ['Blue', 'blue'],
  ['Mint', 'mint'],
  ['Purple', 'purple'],
].map(([colour, slug]) => ({
  code: `Premium Builder Gel ${colour} - 20g -HTF`,
  name: `Premium Builder Gel ${colour} 20g`,
  imageUrl: `/gelitup-content/product-images/BUILDER GEL/PREMIUM BUILDER/20g-premium builder-gel/3-in-1_gelitup_premium_builder_gel_${slug}_20g.webp`,
  matchTerms: [`PREMIUM BUILDER GEL ${colour.toUpperCase()}`],
}))

const prismArtGels = [
  ['Clear', 'clear'],
  ['Blue', 'blue'],
  ['Copper', 'copper'],
  ['Mint', 'mint'],
  ['Pink', 'pink'],
  ['Purple', 'purple'],
].map(([colour, slug]) => ({
  code: `3D Prism Art Gel ${colour}${colour === 'Copper' ? ' - HTF' : ' -HTF'}`,
  name: `3D Prism Art Gel ${colour}`,
  imageUrl: `/gelitup-content/product-images/NAIL ART/PRISM ART GEL/3D_prism_art_gel_${slug}.webp`,
  matchTerms: [`PRISM ART GEL ${colour.toUpperCase()}`],
}))

export const VAULT_RELEASE_STAGES = [
  {
    id: 'builder-glitters',
    stage: 1,
    title: '3-in-1 Builder Gel Glitters',
    description: 'Eight sparkling 20g builder gels.',
    releaseAt: SOFIA_MIDNIGHT.stage1,
    cataloguePath: '/full-catalogue?subcategory=glitter-builder-gels',
    products: builderGlitters,
    requiredTerms: ['BUILDER', 'GLITTER'],
  },
  {
    id: 'spiral-shimmers',
    stage: 2,
    title: 'Spiral Shimmers',
    description: 'Five new Spiral Shimmers gel polish colours.',
    releaseAt: SOFIA_MIDNIGHT.stage2,
    cataloguePath: '/full-catalogue?subcategory=spiral-shimmers',
    products: spiralShimmers,
    requiredTerms: ['SPIRAL', 'SHIMMERS'],
  },
  {
    id: 'premium-builder-20g',
    stage: 3,
    title: 'Premium Builder Gels 20g',
    description: 'Premium Builder Gel in Blue, Mint, and Purple.',
    releaseAt: SOFIA_MIDNIGHT.stage3,
    cataloguePath: '/full-catalogue?subcategory=premium-builder',
    products: premiumBuilder20g,
    requiredTerms: ['PREMIUM', 'BUILDER', '20G'],
  },
  {
    id: 'prism-art-gel',
    stage: 4,
    title: '3D Prism Art Gel',
    description: 'Six dimensional art gels in Clear, Blue, Copper, Mint, Pink, and Purple.',
    releaseAt: SOFIA_MIDNIGHT.stage4,
    cataloguePath: '/full-catalogue?subcategory=prism-art-gel',
    products: prismArtGels,
    requiredTerms: ['PRISM', 'ART', 'GEL'],
  },
]

export const WINTER_VAULT_REVEAL_AT = VAULT_RELEASE_STAGES[0].releaseAt
export const SPIRAL_SHIMMERS_RELEASE_AT = VAULT_RELEASE_STAGES[1].releaseAt

function normalizeReleaseText(values) {
  return values
    .flat()
    .map((value) => String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
}

export function isReleaseDateReached(releaseAt, now = Date.now()) {
  const timestamp = now instanceof Date ? now.getTime() : Number(now)
  return timestamp >= new Date(releaseAt).getTime()
}

export function isWinterVaultOpen(now = Date.now()) {
  return isReleaseDateReached(WINTER_VAULT_REVEAL_AT, now)
}

export function getVaultReleaseStage(...values) {
  const normalized = normalizeReleaseText(values)
  if (!normalized) return null
  return VAULT_RELEASE_STAGES.find((stage) => (
    stage.requiredTerms.every((term) => normalized.includes(term))
    && stage.products.some((product) => product.matchTerms.some((term) => normalized.includes(term)))
  )) || null
}

export function isVaultProductReleased(now, ...values) {
  const stage = getVaultReleaseStage(...values)
  return !stage || isReleaseDateReached(stage.releaseAt, now)
}

export function filterReleaseGatedImageMap(payload, now = Date.now()) {
  if (!payload || typeof payload !== 'object') return payload
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => isVaultProductReleased(now, key, value)),
  )
}
