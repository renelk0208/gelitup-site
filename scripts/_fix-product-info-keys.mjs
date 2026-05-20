import { readFileSync, writeFileSync } from 'fs'

const json = JSON.parse(readFileSync('src/data/product-info.json', 'utf8'))

// 1. Fix BUILDER GEL::LIQUID POLYGEL → BUILDER GEL SYSTEMS::LIQUID POLYGEL
if (json['BUILDER GEL::LIQUID POLYGEL'] && !json['BUILDER GEL SYSTEMS::LIQUID POLYGEL']) {
  json['BUILDER GEL SYSTEMS::LIQUID POLYGEL'] = json['BUILDER GEL::LIQUID POLYGEL']
  delete json['BUILDER GEL::LIQUID POLYGEL']
  console.log('Fixed: BUILDER GEL::LIQUID POLYGEL → BUILDER GEL SYSTEMS::LIQUID POLYGEL')
}

// 2. Add 30 ML and 60 ML lookup aliases pointing to the same MULTIMIX content
if (json['BUILDER GEL SYSTEMS::MULTIMIX']) {
  json['BUILDER GEL SYSTEMS::30 ML'] = json['BUILDER GEL SYSTEMS::MULTIMIX']
  json['BUILDER GEL SYSTEMS::60 ML'] = json['BUILDER GEL SYSTEMS::MULTIMIX']
  console.log('Added: BUILDER GEL SYSTEMS::30 ML and ::60 ML (aliases of MULTIMIX content)')
}

// 3. Normalise all cure time phrases to canonical bold form everywhere
const boldCure = (val) => {
  if (typeof val === 'string') {
    // Strip any existing bold markers first so we can reformat cleanly
    let v = val.replace(/\*\*([Cc]ure:[^*]+)\*\*/g, '$1')
    // Normalise: remove optional space before "48W", add "Lamp" if missing
    v = v.replace(/([Cc]ure: 60[–\-]90s) ?(48W UV\/LED)(?: Lamp)?/g, 'Cure: 60–90s 48W UV/LED Lamp')
    // Now bold all occurrences
    return v.replace(/(Cure: 60–90s 48W UV\/LED Lamp)/g, '**$1**')
  }
  if (Array.isArray(val)) return val.map(boldCure)
  if (val && typeof val === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(val)) out[k] = boldCure(v)
    return out
  }
  return val
}

// 4. Restore TOPS::SHIMMER TOP (not in Excel — managed here)
json['TOPS::SHIMMER TOP'] = {
  paragraphs: [
    'Add a luminous finishing touch to any manicure with our Non-Wipe Shimmer Top Coats. Designed to seal, protect and enhance gel polish colour, they deliver a high-gloss finish with a delicate shimmer effect \u2014 no cleansing required after curing.',
    'Perfect for adding soft sparkle, dimension and a refined salon finish over solid colours, nudes, pastels or seasonal shades. Long-lasting, easy to apply and ideal for professional nail services. Cure: 60\u201390s 48W UV/LED Lamp'
  ],
  listItems: []
}
console.log('Restored: TOPS::SHIMMER TOP')

// 5. Bold product names in TOPS::CLASSIC TOP COATS paragraphs
if (json['TOPS::CLASSIC TOP COATS']) {
  json['TOPS::CLASSIC TOP COATS'].paragraphs = json['TOPS::CLASSIC TOP COATS'].paragraphs.map(p => {
    return p
      .replace(/^(Non Wipe Top Coat)( —)/, '**$1**$2')
      .replace(/^(Perfect Shape Non-Wipe Top Coat)( —)/, '**$1**$2')
      .replace(/^(Milky Non-Wipe Top Coat)( —)/, '**$1**$2')
  })
  console.log('Bolded: Classic Top Coat product names')
}

// 6. Override TOPS::SPOT MY TOPS with updated range description
json['TOPS::SPOT MY TOPS'] = {
  paragraphs: [
    'Create playful, high-impact nail finishes with our Spot My Top Coat range. Available in glossy and matte effects, these specialty top coats add a unique speckled detail over any gel polish colour, transforming a simple manicure into a modern nail art look.',
    'Perfect for salons that want fast, creative designs with minimal effort, Spot My Top delivers a durable finish, professional shine or soft matte texture, and a striking decorative effect in just one step. Cure: 60\u201390s 48W UV/LED Lamp'
  ],
  listItems: []
}
console.log('Updated: TOPS::SPOT MY TOPS')

// 7. Restructure BASES::5IN1 SUPERIOR BASE using sections — order matches the Excel exactly:
//    features list → gel polish base coat steps → important note → reinforced base → shaping gel → rhinestones → small extensions
json['BASES::5IN1 SUPERIOR BASE'] = {
  paragraphs: [
    'The GEL.IT.UP 5-in-1 base coat is a multi-function base system that delivers five distinct applications in a single bottle \u2014 reducing kit complexity while maximising service versatility.'
  ],
  listItems: [
    'A base coat before applying semi-permanent gel polish colours.',
    'A shaping gel for targeted nail correction.',
    'An adhesive base for rhinestones and 3D nail decorations.',
    'A gel for slight nail extension and natural nail strengthening.'
  ],
  sections: [
    {
      header: null,
      items: [
        'Application \u2014 Prepare your nails for a dry manicure.',
        'Application \u2014 Apply Superbond and let it dry on its own for a few seconds.',
        'Application \u2014 When applying 5-in-1 Superior Clear as a gel polish base, apply one thin layer and Cure: 60\u201390s 48W UV/LED Lamp.',
        'Application \u2014 Proceed with your preferred gel polish color. Cure: 60\u201390s 48W UV/LED Lamp'
      ]
    },
    {
      header: '**Important Application Note \u2013 Tinted (colour/glitter) 5-in-1 Superior Base**',
      items: [
        'When working with a tinted 5-in-1 Superior Base, always apply a thin layer of 5-in-1 Superior Clear first and cure.',
        'The clear base layer creates the correct adhesion between the natural nail and the product. Tinted base products contain pigments, and these pigments can reduce direct bonding performance on the natural nail.',
        'If the tinted 5-in-1 Superior Base is applied directly onto the natural nail without the clear layer underneath, lifting may occur.',
        'For best results and long-lasting wear, the clear layer is an essential first step before applying any tinted 5-in-1 Superior Base.'
      ]
    },
    {
      header: '**A reinforced base for thin and brittle nails.**',
      items: [
        'Application \u2014 Prepare your nails for a dry manicure.',
        'Application \u2014 Apply Superbond and let it dry on its own for a few seconds.',
        'Apply the 5-in-1 Superior Base. Cure: 60\u201390s 48W UV/LED Lamp.',
        'Afer curing, for even greater durability, apply one more thin layer of 5-in-1 Superior Base Coat and cure again for Cure: 60\u201390s 48W UV/LED Lamp'
      ]
    },
    {
      header: '**To use it as a shaping gel:**',
      items: [
        'Application \u2014 Prepare your nails for a dry manicure.',
        'Application \u2014 Apply Superbond and let it dry on its own for a few seconds.',
        'Then apply a sufficient amount of the product to create the apex curve on the nail surface and Cure: 60\u201390s 48W UV/LED Lamp'
      ]
    },
    {
      header: '**To use it as a glue for rhinestones and other nail decorations**',
      items: [
        'Take a small amount of the product and apply it to the place where you want to place your decorations. After placing your rhinestone / decoration, with a thin brush you can pass a small amount of the product around the perimeter of the decorations. Cure: 60\u201390s 48W UV/LED Lamp'
      ]
    },
    {
      header: '**To use it as a gel for small nail extensions:**',
      items: [
        'Application \u2014 Prepare your nails for a dry manicure.',
        'For a small extension of up to 2mm, apply a layer of the product to create the free end of the nail. Cure: 60\u201390s 48W UV/LED Lamp.'
      ]
    }
  ]
}
console.log('Restructured: BASES::5IN1 SUPERIOR BASE with sections (Excel sequence)')

const updated = boldCure(json)
writeFileSync('src/data/product-info.json', JSON.stringify(updated, null, 2) + '\n', 'utf8')
console.log('Done — product-info.json updated')
