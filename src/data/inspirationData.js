const BASE = '/gelitup-media/inspiration'

/** Encode path segments that contain spaces / parentheses so browsers fetch them correctly. */
function enc(path) {
  return path.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')
}

export const inspirationCategories = [
  {
    key: '2026',
    label: '2026 Inspiration',
    folder: '2026',
    description: 'The latest nail art and colour trends for 2026 — Cloud Dancer, Sunshine Ready & Shimmer collections.',
    cover: `${BASE}/2026/cloud-dancer-inspiration-cover-card.webp`,
    images: [
      // Cloud Dancer
      ...['cloud-dancer-inspiration-cover-card.webp',
      'gelitup_cloudancer_cover_post.webp',
      'cloud%20dancer%20pt1.webp',
      // 2600
      '2600.webp','gelitup_cloudancer_2600_card_hand.webp',
      // 2601
      '2601.webp','gelitup_cloudancer_2601_card_hand.webp',
      // 2602
      '2602.webp','gelitup_cloudancer_2602_card_hand.webp',
      // 2600-2601-2602 combo
      '2600-2601-2602%20(1).webp','2600-2601-2602%20(2).webp',
      // 2603
      '2603.webp','2603-1.webp','2603%20(1).webp','2603%20(2).webp','gelitup_cloudancer_2603_card_hand.webp',
      // 2604
      '2604.webp','2604--1.webp','gelitup_cloudancer_2604_card_hand.webp',
      // 2605
      '2605.webp','2605-1.webp','gelitup_cloudancer_2605_card_hand.webp',
      // 2606
      '2606.webp','2606-1.webp','2606-2.webp','gelitup_cloudancer_2606_card_hand.webp',
      // 2607
      '2607.webp','2607-1.webp','2607-2.webp','gelitup_cloudancer_2607_card_hand.webp',
      // 2608
      '2608.webp','2608-1.webp','2608-2.webp','gelitup_cloudancer_2608_card_hand.webp',
      // 2609
      '2609.webp','2609-1.webp','gelitup_cloudancer_2609_card_hand.webp',
      // 2610
      '2610.webp','2610-1.webp','2610-2.webp','gelitup_cloudancer_2610_card_hand.webp',
      // Other
      '2906-2.webp',
      ].map(f => `${BASE}/2026/${f}`),
      // Sunshine Ready Collection
      ...[
        'gelitup_summer_2026_1.jpg',
        'gelitup_summer_2026_2.jpg',
        'gelitup_summer_2026_3.jpg',
        'gelitup_summer_2026_4.jpg',
        'gelitup_summer_2026_2612.jpg',
        'gelitup_summer_2026_2613.jpg',
        'gelitup_summer_2026_2614.jpg',
      ].map(f => enc(`/gelitup-media/images/news/Spring Summer/NEWS Carousel Summer 2026/${f}`)),
      // Shimmer Collection (New Effects)
      ...[
        'new-effects-1.jpg',
        'new-effects-2.jpg',
        'new-effects-3.jpg',
      ].map(f => enc(`/gelitup-media/images/news/Spring Summer/New Effects Collection/${f}`)),
    ],
    pinFirst: true,
  },
  {
    key: 'colours',
    label: 'Colours',
    folder: 'Colours',
    description: 'The full GEL.IT.UP colour collection — vivid shades for every client.',
    cover: enc(`${BASE}/Colours/gelitup-colour-collection (1).webp`),
    images: Array.from({ length: 64 }, (_, i) => {
      const n = i + 1
      return enc(`${BASE}/Colours/gelitup-colour-collection (${n}).webp`)
    }),
  },
  {
    key: 'effects',
    label: 'Effects',
    folder: 'Effects',
    description: 'Flash glitters, cat-eye, chrome, and special-finish effects.',
    cover: enc(`${BASE}/Effects/gel-it-up-effects (1).webp`),
    images: Array.from({ length: 45 }, (_, i) => enc(`${BASE}/Effects/gel-it-up-effects (${i + 1}).webp`)),
  },
  {
    key: 'salon-inspiration',
    label: 'Salon Inspiration',
    folder: 'Salon Inspiration',
    description: 'Real salon results and professional application examples.',
    cover: enc(`${BASE}/Salon Inspiration/salon-inspiration (1).webp`),
    images: [
      ...Array.from({ length: 23 }, (_, i) => enc(`${BASE}/Salon Inspiration/salon-inspiration (${i + 1}).webp`)),
      ...Array.from({ length: 40 }, (_, i) => enc(`${BASE}/Salon Inspiration/salon-inspiration (${i + 45}).webp`)),
    ],
  },
  {
    key: 'french',
    label: 'French',
    folder: 'French',
    description: 'Classic and modern French manicure looks.',
    cover: enc(`${BASE}/French/french (1).webp`),
    images: [1,7,8,9,10,11,12,14,16].map(n => enc(`${BASE}/French/french (${n}).webp`)),
  },
  {
    key: 'red',
    label: 'Red',
    folder: 'Red',
    description: 'Bold reds — the timeless salon staple.',
    cover: enc(`${BASE}/Red/red (1).webp`),
    images: [
      enc(`${BASE}/Red/red (1).webp`),
      enc(`${BASE}/Red/red (2).webp`),
      enc(`${BASE}/Red/red (3).webp`),
      enc(`${BASE}/Red/red (4).webp`),
      enc(`${BASE}/Red/red (5).webp`),
    ],
  },
  {
    key: '3-in-1-builder-gels',
    label: 'Builder Gels',
    folder: '3-in-1-builder-gels',
    description: 'Classic 3-in-1 builder gel in a wide range of natural, nude and colour shades - one formula to build, shape and finish.',
    cover: enc(`${BASE}/3-in-1-builder-gels/builder-gels-category.jpg`),
    images: [enc(`${BASE}/3-in-1-builder-gels/builder-gels-category.jpg`)],
  },
  {
    key: '3-in-1-effects-builder-gels',
    label: 'Effects Builder Gels',
    folder: '3-in-1-builder-gels',
    description: 'Builder gels with built-in visual effects - shimmer, glitter and iridescent finishes in a single formula.',
    cover: enc(`${BASE}/3-in-1-builder-gels/effects-builder-gels-category.webp`),
    images: [enc(`${BASE}/3-in-1-builder-gels/effects-builder-gels-category.webp`)],
  },
  {
    key: 'biab',
    label: 'BIAB — Brush‑on Builder',
    folder: 'BIAB - Brush-on-Builder',
    description: 'Brush-on builder for natural nail strengthening and overlays.',
    cover: `${BASE}/BIAB%20-%20Brush-on-Builder/bob-biab.webp`,
    images: [
      `${BASE}/BIAB%20-%20Brush-on-Builder/bob-biab.webp`,
      ...Array.from({ length: 6 }, (_, i) => enc(`${BASE}/BIAB - Brush-on-Builder/brush-on-builder (${i + 2}).webp`)),
    ],
  },
  {
    key: 'multimix-polygel',
    label: 'Multimix Polygel',
    folder: 'multimix-polygel',
    description: 'Versatile polygel system for sculpting and extensions.',
    cover: enc(`${BASE}/multimix-polygel/multimix-polygel (1).webp`),
    images: [1,4,5,6,7,8].map(n => enc(`${BASE}/multimix-polygel/multimix-polygel (${n}).webp`)),
  },
  {
    key: 'liquid-polygel',
    label: 'Liquid Polygel',
    folder: 'Liquid Polygel',
    description: 'Flowing polygel formula for smooth sculpted results.',
    cover: enc(`${BASE}/Liquid Polygel/liquid-polygel (1).webp`),
    images: [1,2].map(n => enc(`${BASE}/Liquid Polygel/liquid-polygel (${n}).webp`)),
  },
  {
    key: 'premium-builder-gel',
    label: 'Premium Builder Gel',
    folder: 'Premium Builder Gel',
    description: 'Premium-grade builder gel for advanced salon work.',
    cover: enc(`${BASE}/Premium Builder Gel/premium builder-gel.webp`),
    images: [enc(`${BASE}/Premium Builder Gel/premium builder-gel.webp`)],
  },
  {
    key: '5-in-1-base-coat',
    label: '5‑in‑1 Base Coat',
    folder: '5-in-1-base-coat',
    description: 'Multi-function base coat — bond, strengthen, protect, prime, and prep.',
    cover: enc(`${BASE}/5-in-1-base-coat/5-in-1bases (1).webp`),
    images: Array.from({ length: 6 }, (_, i) => enc(`${BASE}/5-in-1-base-coat/5-in-1bases (${i + 1}).webp`)),
  },
  {
    key: 'top-coats',
    label: 'Top Coats',
    folder: 'top-coats',
    description: 'High-shine, matte, and specialty top coat finishes.',
    cover: enc(`${BASE}/top-coats/top-coats (1).webp`),
    images: [1,2,3,4,5,6].map(n => enc(`${BASE}/top-coats/top-coats (${n}).webp`)),
  },
  {
    key: 'hand-nail-care',
    label: 'Hand & Nail Care',
    folder: 'Hand-nail-care',
    description: 'Cuticle oils, hand creams, and professional nail care.',
    cover: enc(`${BASE}/Hand-nail-care/hand-foot-nail-care (1).webp`),
    images: Array.from({ length: 8 }, (_, i) => enc(`${BASE}/Hand-nail-care/hand-foot-nail-care (${i + 1}).webp`)),
  },
  {
    key: 'pro-tools',
    label: 'ProTools',
    folder: 'ProTools',
    description: 'Professional tools, brushes, and salon accessories.',
    cover: enc(`${BASE}/ProTools/pro-tools (1).webp`),
    images: Array.from({ length: 5 }, (_, i) => enc(`${BASE}/ProTools/pro-tools (${i + 1}).webp`)),
  },
]
