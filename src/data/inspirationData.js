const BASE = '/gelitup-media/inspiration'

export const inspirationCategories = [
  {
    key: 'colours',
    label: 'Colours',
    folder: 'Colours',
    description: 'The full GEL.IT.UP colour collection — vivid shades for every client.',
    cover: `${BASE}/Colours/gelitup-colour-collection (1).jpg`,
    images: Array.from({ length: 64 }, (_, i) => {
      const n = i + 1
      if (n === 1) return [`gelitup-colour-collection (1).jpeg`, `gelitup-colour-collection (1).jpg`]
      if (n === 2) return [`gelitup-colour-collection (2).jpeg`, `gelitup-colour-collection (2).jpg`]
      return [`gelitup-colour-collection (${n}).jpg`]
    }).flat().map(f => `${BASE}/Colours/${f}`),
  },
  {
    key: 'effects',
    label: 'Effects',
    folder: 'Effects',
    description: 'Flash glitters, cat-eye, chrome, and special-finish effects.',
    cover: `${BASE}/Effects/gel-it-up-effects (1).jpg`,
    images: Array.from({ length: 45 }, (_, i) => `${BASE}/Effects/gel-it-up-effects (${i + 1}).jpg`),
  },
  {
    key: 'salon-inspiration',
    label: 'Salon Inspiration',
    folder: 'Salon Inspiration',
    description: 'Real salon results and professional application examples.',
    cover: `${BASE}/Salon Inspiration/salon-inspiration (1).jpg`,
    images: [
      ...[1,2,3,4].map(n => `${BASE}/Salon Inspiration/salon-inspiration (${n}).jpeg`),
      ...Array.from({ length: 45 }, (_, i) => `${BASE}/Salon Inspiration/salon-inspiration (${i + 1}).jpg`),
    ],
  },
  {
    key: 'french',
    label: 'French',
    folder: 'French',
    description: 'Classic and modern French manicure looks.',
    cover: `${BASE}/French/french (1).jpg`,
    images: [1,7,8,9,10,11,12,14,16].map(n => {
      const ext = n === 12 ? 'JPG' : 'jpg'
      return `${BASE}/French/french (${n}).${ext}`
    }),
  },
  {
    key: 'red',
    label: 'Red',
    folder: 'Red',
    description: 'Bold reds — the timeless salon staple.',
    cover: `${BASE}/Red/red (1).jpg`,
    images: [
      `${BASE}/Red/red (1).jfif`,
      `${BASE}/Red/red (1).jpeg`,
      `${BASE}/Red/red (1).jpg`,
      `${BASE}/Red/red (2).jpeg`,
      `${BASE}/Red/red (2).jpg`,
      `${BASE}/Red/red (3).jpg`,
      `${BASE}/Red/red (4).jpg`,
      `${BASE}/Red/red (5).jpg`,
    ],
  },
  {
    key: '3-in-1-builder-gels',
    label: '3‑in‑1 Builder Gels',
    folder: '3-in-1-builder-gels',
    description: 'Strong, self-levelling builder gels for structure and overlay.',
    cover: `${BASE}/3-in-1-builder-gels/3-in-1-builder-gel (1).jpg`,
    images: Array.from({ length: 6 }, (_, i) => `${BASE}/3-in-1-builder-gels/3-in-1-builder-gel (${i + 1}).jpg`),
  },
  {
    key: 'biab',
    label: 'BIAB — Brush‑on Builder',
    folder: 'BIAB - Brush-on-Builder',
    description: 'Brush-on builder for natural nail strengthening and overlays.',
    cover: `${BASE}/BIAB - Brush-on-Builder/brush-on-builder (1).jpg`,
    images: [1,2,3,4,5,6,7].map(n => {
      const ext = (n === 2 || n === 5) ? 'JPG' : 'jpg'
      return `${BASE}/BIAB - Brush-on-Builder/brush-on-builder (${n}).${ext}`
    }),
  },
  {
    key: 'multimix-polygel',
    label: 'Multimix Polygel',
    folder: 'multimix-polygel',
    description: 'Versatile polygel system for sculpting and extensions.',
    cover: `${BASE}/multimix-polygel/multimix-polygel (1).jpg`,
    images: [1,4,5,6,7,8,9].map(n => {
      const ext = n === 7 ? 'JPG' : 'jpg'
      return `${BASE}/multimix-polygel/multimix-polygel (${n}).${ext}`
    }),
  },
  {
    key: 'liquid-polygel',
    label: 'Liquid Polygel',
    folder: 'Liquid Polygel',
    description: 'Flowing polygel formula for smooth sculpted results.',
    cover: `${BASE}/Liquid Polygel/liquid-polygel (1).jpg`,
    images: [1,2].map(n => `${BASE}/Liquid Polygel/liquid-polygel (${n}).jpg`),
  },
  {
    key: 'premium-builder-gel',
    label: 'Premium Builder Gel',
    folder: 'Premium Builder Gel',
    description: 'Premium-grade builder gel for advanced salon work.',
    cover: `${BASE}/Premium Builder Gel/premium builder-gel.jpg`,
    images: [`${BASE}/Premium Builder Gel/premium builder-gel.jpg`],
  },
  {
    key: '5-in-1-base-coat',
    label: '5‑in‑1 Base Coat',
    folder: '5-in-1-base-coat',
    description: 'Multi-function base coat — bond, strengthen, protect, prime, and prep.',
    cover: `${BASE}/5-in-1-base-coat/5-in-1bases (1).jpg`,
    images: Array.from({ length: 6 }, (_, i) => `${BASE}/5-in-1-base-coat/5-in-1bases (${i + 1}).jpg`),
  },
  {
    key: 'top-coats',
    label: 'Top Coats',
    folder: 'top-coats',
    description: 'High-shine, matte, and specialty top coat finishes.',
    cover: `${BASE}/top-coats/top-coats (1).jpg`,
    images: [1,2,3,4,5,6].map(n => {
      const ext = n === 5 ? 'JPG' : 'jpg'
      return `${BASE}/top-coats/top-coats (${n}).${ext}`
    }),
  },
  {
    key: 'hand-nail-care',
    label: 'Hand & Nail Care',
    folder: 'Hand-nail-care',
    description: 'Cuticle oils, hand creams, and professional nail care.',
    cover: `${BASE}/Hand-nail-care/hand-foot-nail-care (1).jpg`,
    images: Array.from({ length: 8 }, (_, i) => `${BASE}/Hand-nail-care/hand-foot-nail-care (${i + 1}).jpg`),
  },
  {
    key: 'pro-tools',
    label: 'ProTools',
    folder: 'ProTools',
    description: 'Professional tools, brushes, and salon accessories.',
    cover: `${BASE}/ProTools/pro-tools (1).jpg`,
    images: Array.from({ length: 5 }, (_, i) => `${BASE}/ProTools/pro-tools (${i + 1}).jpg`),
  },
]
