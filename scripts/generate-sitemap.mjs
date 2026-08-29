// scripts/generate-sitemap.mjs
// Run after build: node scripts/generate-sitemap.mjs
// Already wired into: "build" script below

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import COLOR_FAMILY_PAGES from './colour-family-pages.cjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')
const BASE_URL = 'https://gelitup.com'
const PRODUCT_MANIFEST = JSON.parse(
  readFileSync(
    resolve(__dirname, '../public/gelitup-content/product-manifest.json'),
    'utf8',
  ),
)

const COLOR_FAMILY_ROUTES = COLOR_FAMILY_PAGES
  .filter(({ includeInSitemap = true }) => includeInSitemap)
  .map(({ slug }) => ({
    path: `/colours/${slug}`,
    priority: '0.8',
    changefreq: 'weekly',
  }))

// Individual product pages intentionally omitted from the sitemap because they will be noindexed.
const PRODUCT_ROUTES = []

const ROUTES = [
  // Core pages
  { path: '/',                           priority: '1.0', changefreq: 'daily'   },
  { path: '/full-catalogue',             priority: '0.9', changefreq: 'weekly'  },
  { path: '/guestbook',                  priority: '0.6', changefreq: 'weekly'  },
  { path: '/blog',                       priority: '0.7', changefreq: 'weekly'  },
  { path: '/blog/why-ingredient-labels-matter', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog/hema-free-tpo-free-gel-salon-liability-guide', priority: '0.8', changefreq: 'monthly' },
  { path: '/about-us',                   priority: '0.6', changefreq: 'monthly' },
  { path: '/contact',                    priority: '0.6', changefreq: 'monthly' },

  // Distribution
  { path: '/distributor-packages',       priority: '0.8', changefreq: 'monthly' },
  { path: '/distributors',              priority: '0.7', changefreq: 'monthly' },
  { path: '/become-distributor',         priority: '0.8', changefreq: 'monthly' },
  { path: '/register',                   priority: '0.7', changefreq: 'monthly' },

  // Ambassadors
  { path: '/ambassadors',                priority: '0.7', changefreq: 'monthly' },

  // Academies
  { path: '/for-academies',              priority: '0.7', changefreq: 'monthly' },
  { path: '/academies',                  priority: '0.6', changefreq: 'monthly' },

  // Our Products category pages
  { path: '/our-products',              priority: '0.8', changefreq: 'weekly'  },
  { path: '/our-products/colours',       priority: '0.8', changefreq: 'weekly'  },
  { path: '/our-products/builder-gel',   priority: '0.7', changefreq: 'weekly'  },
  { path: '/our-products/bases-and-tops',priority: '0.7', changefreq: 'weekly'  },
  { path: '/our-products/nail-art',      priority: '0.6', changefreq: 'weekly'  },
  { path: '/our-products/tools',         priority: '0.6', changefreq: 'weekly'  },
  { path: '/our-products/consumables',   priority: '0.6', changefreq: 'weekly'  },
  { path: '/our-products/nail-care',     priority: '0.6', changefreq: 'weekly'  },

  // Colour family landing pages
  ...COLOR_FAMILY_ROUTES,

  // Individual Solid Gel Polish products are intentionally omitted (noindex)
  // (see PRODUCT_ROUTES comment above)

  // Gel polish subcategory vanity routes
  { path: '/solid-gel-polish',           priority: '0.8', changefreq: 'weekly'  },
  { path: '/cat-eye',                    priority: '0.8', changefreq: 'weekly'  },
  { path: '/shimmer',                    priority: '0.7', changefreq: 'weekly'  },
  { path: '/glitters',                   priority: '0.7', changefreq: 'weekly'  },
  { path: '/mirror-powder',              priority: '0.7', changefreq: 'weekly'  },
  { path: '/by-the-ocean',               priority: '0.7', changefreq: 'weekly'  },
  { path: '/bob',                        priority: '0.7', changefreq: 'weekly'  },

  // Builder gel vanity routes
  { path: '/premium-builder',            priority: '0.7', changefreq: 'weekly'  },
  { path: '/3in1',                       priority: '0.7', changefreq: 'weekly'  },
  { path: '/liquid-polygel',             priority: '0.7', changefreq: 'weekly'  },

  // Base coat vanity routes
  { path: '/5in1-base',                  priority: '0.7', changefreq: 'weekly'  },
]

const now = new Date().toISOString().split('T')[0]

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(r => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`).join('\n')}
</urlset>`

writeFileSync(resolve(DIST, 'sitemap.xml'), xml, 'utf-8')
console.log(`✓ sitemap.xml written with ${ROUTES.length} URLs`)

// robots.txt
const robots = `User-agent: *
Allow: /

Sitemap: ${BASE_URL}/sitemap.xml
`
writeFileSync(resolve(DIST, 'robots.txt'), robots, 'utf-8')
console.log('✓ robots.txt written')
