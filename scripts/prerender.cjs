// scripts/prerender.cjs
// Run after vite build: node scripts/prerender.cjs
//
// Copies dist/index.html into each route directory and injects the correct
// <title>, <meta name="description">, <link rel="canonical"> and Open Graph /
// Twitter tags for that route.  No browser / jsdom rendering is needed — Google
// executes the React bundle itself, so all we need is the correct <head> for
// each URL.

'use strict'

const path = require('path')
const fs   = require('fs')
const COLOR_FAMILY_PAGES = require('./colour-family-pages.cjs')

const DIST = path.resolve(__dirname, '../dist')
const PRODUCT_MANIFEST = JSON.parse(
  fs.readFileSync(
    path.resolve(__dirname, '../public/gelitup-content/product-manifest.json'),
    'utf8',
  ),
)

// ─── Per-route SEO map ────────────────────────────────────────────────────────

const COLOR_FAMILY_ROUTE_SEO = Object.fromEntries(
  COLOR_FAMILY_PAGES.map(({ label, slug }) => {
    const labelLower = label.toLowerCase()
    const heading = `${label} Gel Polish Wholesale`
    const intro = `Explore GEL.IT.UP ${labelLower} gel polish in professional, HEMA-free, TPO-free and EU-certified formulations. These salon-ready ${labelLower} shades are available wholesale for nail technicians, academies and distributors.`

    return [
      `/colours/${slug}`,
      {
        title: `${heading} | GEL.IT.UP`,
        description: `Shop professional ${labelLower} gel polish wholesale from GEL.IT.UP. Every shade is HEMA-free, TPO-free and EU-certified for nail technicians, salons, academies and distributors.`,
        canonical: `https://gelitup.com/colours/${slug}`,
        bodyHtml: `<main><h1>${heading}</h1><p>${intro}</p></main>`,
      },
    ]
  }),
)

const PRODUCT_ROUTE_SEO = Object.fromEntries(
  PRODUCT_MANIFEST.map((product) => {
    const isSolidGelPolish = product.category === 'Solid Gel Polish'
    const isNailArt = product.category === 'Nail Art'
    const familyName = product.colorFamily
      ? product.colorFamily
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
      : ''
    const productType = isSolidGelPolish
      ? 'gel polish'
      : String(product.subcategory || product.category).toLowerCase()
    const heading = isSolidGelPolish
      ? `${product.name} Gel Polish`
      : product.name
    const description = isSolidGelPolish
      ? `Discover ${product.name}, a professional ${familyName.toLowerCase()} gel polish from GEL.IT.UP. HEMA-free, TPO-free and EU-certified for professional nail technicians and salons.`
      : isNailArt
        ? `Discover ${product.name}, professional ${productType} from GEL.IT.UP for creative salon nail art.`
        : `Discover ${product.name}, professional ${productType} from GEL.IT.UP. HEMA-free, TPO-free and EU-certified for professional nail technicians and salons.`

    // Determine canonical: colours family pages for solid gel polishes; otherwise map to our-products landing pages
    let canonicalUrl = `https://gelitup.com/products/${product.slug}`
    if (isSolidGelPolish && product.colorFamily) {
      const slug = String(product.colorFamily).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '')
      canonicalUrl = `https://gelitup.com/colours/${slug}`
    } else if (isNailArt) {
      canonicalUrl = 'https://gelitup.com/our-products/nail-art'
    } else {
      const cat = String(product.category || '').toLowerCase()
      if (/builder/.test(cat)) canonicalUrl = 'https://gelitup.com/our-products/builder-gel'
      else if (/base|top|bases|tops|essentials/.test(cat)) canonicalUrl = 'https://gelitup.com/our-products/bases-and-tops'
      else if (/nail[- ]?care|skin/.test(cat)) canonicalUrl = 'https://gelitup.com/our-products/nail-care'
      else if (/tool|tools/.test(cat)) canonicalUrl = 'https://gelitup.com/our-products/tools'
      else if (/consumable|consumables/.test(cat)) canonicalUrl = 'https://gelitup.com/our-products/consumables'
      else canonicalUrl = 'https://gelitup.com/our-products'
    }

    return [
      `/products/${product.slug}`,
      {
        title: `${heading} | GEL.IT.UP`,
        description,
        canonical: canonicalUrl,
        robots: 'noindex, follow',
        bodyHtml: `<main><h1>${escapeHtml(heading)}</h1><img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)} ${escapeHtml(productType)}"><p>${escapeHtml(description)}</p></main>`,
      },
    ]
  }),
)

const ROUTE_SEO_MAP = {
  '/': {
    title:       'GEL.IT.UP by GIUP® | Professional Gel Polish, Builder Gel & Nail Systems',
    description: 'Wholesale gel polish, builder gel and nail systems for nail technicians, salons and academies. HEMA-free, TPO-free, EU certified, Leaping Bunny Approved. 15+ countries.',
    canonical:   'https://gelitup.com/',
  },
  '/full-catalogue': {
    title:       'Full Product Catalogue | Wholesale Nail Supplies | GEL.IT.UP by GIUP®',
    description: 'Browse the complete GEL.IT.UP wholesale catalogue. 1,000+ gel polish shades, builder gels, base coats, nail art and professional tools. HEMA-free, TPO-free, EU certified.',
    canonical:   'https://gelitup.com/full-catalogue',
  },
  ...COLOR_FAMILY_ROUTE_SEO,
  ...PRODUCT_ROUTE_SEO,
  '/solid-gel-polish': {
    title:       'Wholesale Gel Polish Supplier | 1,000+ Shades | GEL.IT.UP Professional',
    description: 'Over 1,000 shades of professional gel polish available wholesale. HEMA-free, TPO-free, Leaping Bunny Approved. Bulk supply for nail technicians, salons and academies across the EU and worldwide.',
    canonical:   'https://gelitup.com/solid-gel-polish',
  },
  '/cat-eye': {
    title:       'Cat Eye Gel Polish Wholesale | Dreamy Cat Eye Collection | GEL.IT.UP',
    description: 'Professional magnetic cat eye gel polish available wholesale. Multidimensional finish your clients will ask for by name. HEMA-free, TPO-free, Leaping Bunny Approved. Open a wholesale account today.',
    canonical:   'https://gelitup.com/cat-eye',
  },
  '/shimmer': {
    title:       'Shimmer Gel Polish Wholesale | Professional Nail Supplies | GEL.IT.UP',
    description: 'Professional shimmer gel polish available in bulk wholesale. HEMA-free, TPO-free, Leaping Bunny Approved. For nail technicians, salons and academies. Open a wholesale account at gelitup.com.',
    canonical:   'https://gelitup.com/shimmer',
  },
  '/glitters': {
    title:       'Glitter Gel Polish Wholesale | Professional Nail Supplies | GEL.IT.UP',
    description: 'Wholesale glitter gel polish for professional nail technicians and salons. HEMA-free, TPO-free, Leaping Bunny Approved. 15+ countries served. Open a B2B wholesale account today.',
    canonical:   'https://gelitup.com/glitters',
  },
  '/mirror-powder': {
    title:       'Mirror Powder Wholesale | Chrome Nail Supplies | GEL.IT.UP Professional',
    description: 'Professional mirror powder and chrome nail supplies available wholesale. HEMA-free, TPO-free, EU certified. For nail technicians, salons and academies. Open a wholesale account at gelitup.com.',
    canonical:   'https://gelitup.com/mirror-powder',
  },
  '/by-the-ocean': {
    title:       'By The Ocean Collection | Wholesale Gel Polish | GEL.IT.UP Professional',
    description: 'By The Ocean gel polish collection available wholesale for professional nail technicians and salons. HEMA-free, TPO-free, Leaping Bunny Approved. Open a wholesale account today.',
    canonical:   'https://gelitup.com/by-the-ocean',
  },
  '/bob': {
    title:       'BOB Collection | Professional Gel Polish Wholesale | GEL.IT.UP',
    description: 'The BOB gel polish collection available wholesale for nail technicians and salons. HEMA-free, TPO-free, Leaping Bunny Approved. EU certified. Open a B2B account at gelitup.com.',
    canonical:   'https://gelitup.com/bob',
  },
  '/premium-builder': {
    title:       'Premium Builder Gel Wholesale | HEMA-Free | GEL.IT.UP Professional',
    description: '3-in-1 Premium Builder Gel wholesale for nail professionals. Fiberglass-reinforced, single-phase, no base or top coat needed. HEMA-free, TPO-free, Leaping Bunny Approved. Open a wholesale account.',
    canonical:   'https://gelitup.com/premium-builder',
  },
  '/3in1': {
    title:       '3-in-1 Builder Gel Wholesale | Professional Nail Systems | GEL.IT.UP',
    description: 'Professional 3-in-1 builder gel available wholesale for nail technicians, salons and academies. HEMA-free, TPO-free, EU certified, Leaping Bunny Approved. Wholesale accounts available worldwide.',
    canonical:   'https://gelitup.com/3in1',
  },
  '/5in1-base': {
    title:       '5-in-1 Superior Base Coat Wholesale | HEMA-Free | GEL.IT.UP Professional',
    description: '5-in-1 Superior Base Coat wholesale for nail professionals. Works as base coat, reinforced base, shaping gel, decoration glue and extension gel. HEMA-free, TPO-free, Leaping Bunny Approved.',
    canonical:   'https://gelitup.com/5in1-base',
  },
  '/liquid-polygel': {
    title:       'Polygel Wholesale Supplier | MultiMix Synthogel | GEL.IT.UP Professional',
    description: 'Professional polygel wholesale supplier. GEL.IT.UP MultiMix Synthogel — acrylic strength, gel ease, zero heat spikes, odourless. HEMA-free, TPO-free, Leaping Bunny Approved. Open a wholesale account.',
    canonical:   'https://gelitup.com/liquid-polygel',
  },
  '/become-distributor': {
    title:       'Become a GEL.IT.UP Distributor | Wholesale Nail Supplies EU & Worldwide',
    description: 'Apply to become an authorised GEL.IT.UP distributor. Join our verified wholesale network across 15+ countries. Professional nail supplies, EU certified, HEMA-free, TPO-free.',
    canonical:   'https://gelitup.com/become-distributor',
  },
  '/distributor-packages': {
    title:       'Distributor Packages | Wholesale Partnership Tiers | GEL.IT.UP',
    description: 'View GEL.IT.UP distributor partnership tiers and wholesale packages. Professional nail supply distribution across Europe and worldwide. Apply today at gelitup.com.',
    canonical:   'https://gelitup.com/distributor-packages',
  },
  '/distributors': {
    title:       'Our Distributors | Authorised Wholesale Partners | GEL.IT.UP',
    description: 'Find your nearest authorised GEL.IT.UP distributor. Professional nail supply wholesale partners across 15+ countries in Europe and worldwide.',
    canonical:   'https://gelitup.com/distributors',
  },
  '/for-academies': {
    title:       'Nail Academy Supplies Wholesale | GEL.IT.UP Professional Nail Systems',
    description: 'Professional nail academy supplies wholesale. GEL.IT.UP supplies certified gel systems, training materials and branded support to nail academies worldwide. HEMA-free, TPO-free, EU certified.',
    canonical:   'https://gelitup.com/for-academies',
  },
  '/academies': {
    title:       'GEL.IT.UP Nail Academies | Professional Training & Certified Gel Systems',
    description: 'Find GEL.IT.UP certified nail academies worldwide. Professional training with EU-certified, HEMA-free, TPO-free gel systems. For academy partnerships contact us at gelitup.com.',
    canonical:   'https://gelitup.com/academies',
  },
  '/guestbook': {
    title:       'Guestbook | Nail Technician Reviews | GEL.IT.UP Professional',
    description: 'Read reviews from professional nail technicians, salons and academies who trust GEL.IT.UP products every day. Join our global wholesale community at gelitup.com.',
    canonical:   'https://gelitup.com/guestbook',
  },
  '/blog': {
    title:       'Professional Nail Industry Blog | GEL.IT.UP by GIUP®',
    description: 'Professional guidance for nail salons and technicians on gel safety, EU compliance, ingredients, business protection and product performance.',
    canonical:   'https://gelitup.com/blog',
  },
  '/blog/why-ingredient-labels-matter': {
    title:       'Why Gel Polish Ingredient Labels Matter | HEMA & TPO Guide',
    description: 'Learn what HEMA and TPO are, why ingredient labels matter, and how nail professionals can evaluate safer, compliant gel polish formulations.',
    canonical:   'https://gelitup.com/blog/why-ingredient-labels-matter',
  },
  '/blog/hema-free-tpo-free-gel-salon-liability-guide': {
    title:       'HEMA-Free, TPO-Free Gels: Salon Liability & EU Compliance Guide',
    description: 'Understand the liability risks of non-EU compliant nail gels containing HEMA and TPO. How salon owners can protect their business with HEMA-free, TPO-free formulations.',
    canonical:   'https://gelitup.com/blog/hema-free-tpo-free-gel-salon-liability-guide',
  },
  '/about-us': {
    title:       'About GEL.IT.UP by GIUP® | Professional Nail Supplies EU',
    description: 'Learn about GEL.IT.UP by GIUP® — professional nail supply brand trusted by technicians in 15+ countries. HEMA-free, TPO-free, EU certified, Leaping Bunny Approved.',
    canonical:   'https://gelitup.com/about-us',
  },
  '/contact': {
    title:       'Contact GEL.IT.UP | Wholesale Nail Supply Enquiries',
    description: 'Contact GEL.IT.UP by GIUP® for wholesale account enquiries, distributor partnerships and academy supply. Professional nail supplies for 15+ countries. Email info@gelitup.com.',
    canonical:   'https://gelitup.com/contact',
  },
  '/our-products': {
    title:       'Professional Nail Products Wholesale | GEL.IT.UP by GIUP®',
    description: 'Browse the full GEL.IT.UP professional nail product range. Gel polish, builder gel, base coats, top coats, nail art and tools — all HEMA-free, TPO-free, EU certified. Wholesale accounts available.',
    canonical:   'https://gelitup.com/our-products',
  },
  '/our-products/colours': {
    title:       'Gel Polish Colours Wholesale | 1,000+ Shades | GEL.IT.UP Professional',
    description: 'Over 1,000 professional gel polish colours available wholesale. HEMA-free, TPO-free, Leaping Bunny Approved, EU certified. For nail technicians, salons and academies worldwide.',
    canonical:   'https://gelitup.com/our-products/colours',
  },
  '/our-products/builder-gel': {
    title:       'Builder Gel Wholesale | Professional Nail Systems | GEL.IT.UP',
    description: 'Professional builder gel systems available wholesale. 3-in-1 Builder Gel, Premium Builder Gel and MultiMix Synthogel Polygel. HEMA-free, TPO-free, Leaping Bunny Approved.',
    canonical:   'https://gelitup.com/our-products/builder-gel',
  },
  '/our-products/bases-and-tops': {
    title:       'Base Coats & Top Coats Wholesale | Professional Nail Supplies | GEL.IT.UP',
    description: 'Professional base coats and top coats available wholesale. Including our 5-in-1 Superior Base Coat. HEMA-free, TPO-free, Leaping Bunny Approved. Open a wholesale account today.',
    canonical:   'https://gelitup.com/our-products/bases-and-tops',
  },
  '/our-products/nail-art': {
    title:       'Nail Art Supplies Wholesale | Professional Nail Art | GEL.IT.UP',
    description: 'Professional nail art supplies available wholesale for nail technicians and salons. HEMA-free, TPO-free, EU certified, Leaping Bunny Approved. Open a wholesale account at gelitup.com.',
    canonical:   'https://gelitup.com/our-products/nail-art',
  },
  '/our-products/tools': {
    title:       'Professional Nail Tools Wholesale | Cuticle Nippers & More | GEL.IT.UP',
    description: 'Professional stainless steel nail tools available wholesale. Cuticle nippers, pushers, scissors, tweezers and more. For nail technicians and salons. Open a wholesale account at gelitup.com.',
    canonical:   'https://gelitup.com/our-products/tools',
  },
  '/our-products/consumables': {
    title:       'Nail Consumables Wholesale | Professional Salon Supplies | GEL.IT.UP',
    description: 'Professional nail consumables available wholesale for salons and nail technicians. HEMA-free, TPO-free, EU certified. Open a B2B wholesale account at gelitup.com.',
    canonical:   'https://gelitup.com/our-products/consumables',
  },
  '/our-products/nail-care': {
    title:       'Nail Care Products Wholesale | Professional Nail Supplies | GEL.IT.UP',
    description: 'Professional nail care products available wholesale. For nail technicians, salons and academies. HEMA-free, TPO-free, EU certified, Leaping Bunny Approved. Open an account at gelitup.com.',
    canonical:   'https://gelitup.com/our-products/nail-care',
  },
  '/register': {
    title:       'Open a Wholesale Account | GEL.IT.UP Professional Nail Supplies',
    description: 'Open a B2B wholesale account with GEL.IT.UP by GIUP®. Access 1,000+ professional nail products including gel polish, builder gel and nail systems. HEMA-free, TPO-free, EU certified.',
    canonical:   'https://gelitup.com/register',
  },
  '/inspiration': {
    title:       'Nail Inspiration | GEL.IT.UP Professional',
    description: 'Explore nail art inspiration from GEL.IT.UP professionals worldwide. Discover the latest trends in gel polish, builder gel and nail art. Wholesale supplies available at gelitup.com.',
    canonical:   'https://gelitup.com/inspiration',
  },
  '/ambassadors': {
    title:       'Become a GEL.IT.UP Ambassador | Get Featured, Get Perks',
    description: 'Join the GEL.IT.UP Ambassador Programme. Get your nail work featured on @gelitup, earn a personal discount code and receive free product drops. Apply in 60 seconds.',
    canonical:   'https://gelitup.com/ambassadors',
  },
  '/ambassador-agreement': {
    title:       'Ambassador Agreement | GEL.IT.UP by GIUP®',
    description: 'The full GEL.IT.UP Ambassador Agreement — commitments, content permissions and how the partnership works.',
    canonical:   'https://gelitup.com/ambassador-agreement',
  },
  '/privacy-policy': {
    title:       'Privacy Policy | GEL.IT.UP by GIUP®',
    description: 'Read the GEL.IT.UP privacy policy. How we collect, use and protect your personal data in accordance with EU GDPR regulations.',
    canonical:   'https://gelitup.com/privacy-policy',
  },
  '/cookie-policy': {
    title:       'Cookie Policy | GEL.IT.UP by GIUP®',
    description: 'Read the GEL.IT.UP cookie policy. Information about the cookies we use and how to manage your cookie preferences.',
    canonical:   'https://gelitup.com/cookie-policy',
  },
  '/terms-and-conditions': {
    title:       'Terms & Conditions | GEL.IT.UP by GIUP®',
    description: 'Read the GEL.IT.UP terms and conditions for wholesale accounts, distribution partnerships and use of the gelitup.com website.',
    canonical:   'https://gelitup.com/terms-and-conditions',
  },
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
}

function injectSeo(html, { title, description, canonical, robots, bodyHtml = '' }) {
  const t = escapeHtml(title)
  const d = escapeHtml(description)
  const seoHtml = html
    .replace(/<title>[^<]*<\/title>/i,                     `<title>${t}</title>`)
    .replace(/<meta\s+name="description"[^>]*>/i,          `<meta name="description" content="${d}" />`)
    .replace(/<link\s+rel="canonical"[^>]*>/i,             `<link rel="canonical" href="${canonical}" />\n    <meta name="robots" content="${robots || 'index, follow'}" />`)
    .replace(/<meta\s+property="og:title"[^>]*>/i,         `<meta property="og:title" content="${t}" />`)
    .replace(/<meta\s+property="og:description"[^>]*>/i,   `<meta property="og:description" content="${d}" />`)
    .replace(/<meta\s+property="og:url"[^>]*>/i,           `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta\s+name="twitter:title"[^>]*>/i,        `<meta name="twitter:title" content="${t}" />`)
    .replace(/<meta\s+name="twitter:description"[^>]*>/i,  `<meta name="twitter:description" content="${d}" />`)

  return bodyHtml
    ? seoHtml.replace(/<div\s+id="root"\s*>/i, `<div id="root">${bodyHtml}`)
    : seoHtml
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8')

const routes = Object.keys(ROUTE_SEO_MAP)
let count = 0

for (const route of routes) {
  const seo      = ROUTE_SEO_MAP[route]
  const html     = injectSeo(template, seo)
  const routeDir = path.join(DIST, route)
  fs.mkdirSync(routeDir, { recursive: true })
  fs.writeFileSync(path.join(routeDir, 'index.html'), html, 'utf-8')
  console.log(`✓ prerendered ${route} (SEO injected)`)
  count++
}

console.log(`\n✓ Prerender complete — ${count} routes (SEO injected)`)
