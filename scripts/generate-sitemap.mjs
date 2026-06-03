// scripts/generate-sitemap.mjs
// Run after build: node scripts/generate-sitemap.mjs
// Already wired into: "build" script below

import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = resolve(__dirname, '../dist')
const BASE_URL = 'https://gelitup.com'

const ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/full-catalogue', priority: '0.9', changefreq: 'weekly' },
  { path: '/distributor-packages', priority: '0.8', changefreq: 'monthly' },
  { path: '/distributors', priority: '0.7', changefreq: 'monthly' },
  { path: '/for-academies', priority: '0.7', changefreq: 'monthly' },
  { path: '/become-distributor', priority: '0.8', changefreq: 'monthly' },
  { path: '/guestbook', priority: '0.5', changefreq: 'weekly' },
  { path: '/inspiration', priority: '0.6', changefreq: 'weekly' },
  { path: '/privacy-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookie-policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms-and-conditions', priority: '0.3', changefreq: 'yearly' },
  // Vanity routes
  { path: '/cat-eye', priority: '0.7', changefreq: 'weekly' },
  { path: '/shimmer', priority: '0.6', changefreq: 'weekly' },
  { path: '/glitters', priority: '0.6', changefreq: 'weekly' },
  { path: '/bob', priority: '0.6', changefreq: 'weekly' },
  { path: '/3in1', priority: '0.6', changefreq: 'weekly' },
  { path: '/premium-builder', priority: '0.6', changefreq: 'weekly' },
  { path: '/5in1-base', priority: '0.6', changefreq: 'weekly' },
  { path: '/by-the-ocean', priority: '0.6', changefreq: 'weekly' },
  { path: '/solid-gel-polish', priority: '0.7', changefreq: 'weekly' },
  { path: '/mirror-powder', priority: '0.6', changefreq: 'weekly' },
  { path: '/liquid-polygel', priority: '0.6', changefreq: 'weekly' },
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
