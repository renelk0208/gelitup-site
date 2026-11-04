// Standard and Super ambassador packs, one line per product.
//
// Every line is either an exact shop product (matched on the packing list by
// its shop title or a known alias, e.g. "Pink Buffer") or a "Choose: …" slot
// for ONE product that varies (a colour, a Cat Eye shade, a tool…). Choose
// slots must be picked before the package goes out. Any line can be swapped
// for another shop product in the package plan.
//
// Used by the admin (first package, when the type is chosen) and by the daily
// job that fills in the second package (ambassadorFollowUpPacks.js).
// Extreme ambassadors keep their pack as written (not split).

import { STARTER_LINE_PRODUCTS } from './reviewProducts.js'

export const CHOOSE_PREFIX = 'Choose: '
export const isChooseSlot = (text) => /^\s*choose\s*:/i.test(String(text || ''))
export const chooseSlotLabel = (text) => String(text || '').replace(/^\s*choose\s*:\s*/i, '').trim()
const choose = (what, count = 1) => Array.from({ length: count }, () => `${CHOOSE_PREFIX}${what}`)

// The Standard Sample Box, product by product. The shop has no Nude Brush on
// Builder Gel, so that one is picked.
export const SAMPLE_BOX_ITEMS = STARTER_LINE_PRODUCTS.standardsamplebox
  .map((title) => (title === 'Brush on Builder Gel Nude 15ml' ? `${CHOOSE_PREFIX}Brush on Builder Gel 15ml` : title))

export const SPLIT_STARTER_PACKS = {
  standard_ambassador: [
    ...SAMPLE_BOX_ITEMS,
    'All-In-One Liquid 200ml',
    'Nail Files 100/100',
    'Photo Perfect Cuticle Oil',
    'Cooling Coconut Cuticle Oil 5ml',
    'GEL.IT.UP Hand & Body Cream 100ml – Silky Bliss',
  ],
  super_ambassador: [
    ...SAMPLE_BOX_ITEMS,
    ...choose('Premium Builder Gel (clear)'),
    ...choose('Premium Builder Gel (colour)'),
    ...choose('MultiMix 30g'),
    ...choose('MultiMix 60g'),
    ...choose('3-in-1 Builder Gel (clear)'),
    ...choose('3-in-1 Builder Gel (colour)'),
    ...choose('All in One Liquid (size)'),
    'Nail Files 100/100',
    'Cooling Coconut Cuticle Oil 5ml',
    'Photo Perfect Cuticle Oil',
    ...choose('Cat Eye shade', 3),
    ...choose('shimmer shade'),
    ...choose('metallic shade'),
    ...choose('chrome / mirror powder'),
    'Mirror Top Coat',
    ...choose('dual form box of tips'),
    ...choose('Flexi tips'),
    ...choose('dual extension tip box'),
    ...choose('cuticle nipper'),
    ...choose('nail scissors'),
    ...choose('cuticle pusher'),
  ],
}

export const SPLIT_FOLLOW_UP_PACKS = {
  standard_ambassador: [
    'Nail Files 100/120 Pink Sponge Buffer',
    'Nail Files 180/180 Purple Sponge Buffer',
    ...choose('Autumn / Winter colour', 3),
    'Blossom Flower Power 15ml',
    ...choose('Glitter Gel'),
  ],
  super_ambassador: [
    ...choose('New Dual Forms'),
    'Nail Forms',
    'Nail Files 100/120 Pink Sponge Buffer',
    'Nail Files 180/180 Purple Sponge Buffer',
    'LINE IT UP BLACK',
    'LINE IT UP WHITE',
    ...choose('Autumn / Winter colour', 5),
    ...choose('Glitter Builder Gel'),
  ],
}

export const isSplitPackType = (type) => Object.prototype.hasOwnProperty.call(SPLIT_STARTER_PACKS, String(type || '').toLowerCase())

// Package-plan lines added from the starter pack carry this author.
export const STARTER_PACK_AUTHOR_PREFIX = 'starter pack'
export const starterPackAuthor = (type) => `${STARTER_PACK_AUTHOR_PREFIX} (${String(type || '').toLowerCase() === 'super_ambassador' ? 'Super' : 'Standard'})`
export const isStarterPackAuthor = (author) => String(author || '').toLowerCase().startsWith(STARTER_PACK_AUTHOR_PREFIX)
// Tag on her record once the starter pack has been put in the plan.
export const STARTER_PACK_TAG = 'STARTER_PACK_SPLIT'
