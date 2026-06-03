// scripts/prerender.cjs
// Run after vite build: node scripts/prerender.cjs
// Prerenders each route into its own dist/<route>/index.html using jsdom.

'use strict'

const path = require('path')
const Prerenderer = require('@prerenderer/prerenderer')
const JSDOMRenderer = require('@prerenderer/renderer-jsdom')

const DIST = path.resolve(__dirname, '../dist')

const PRERENDER_ROUTES = [
  '/',
  '/full-catalogue',
  '/distributor-packages',
  '/distributors',
  '/for-academies',
  '/become-distributor',
  '/portal/login',
  '/privacy-policy',
  '/cookie-policy',
  '/terms-and-conditions',
  '/guestbook',
  '/inspiration',
  '/cat-eye', '/shimmer', '/glitters', '/jelly', '/metallic',
  '/glass-effect', '/spix', '/by-the-ocean', '/solid-gel-polish',
  '/bob', '/3in1', '/premium-builder', '/liquid-polygel', '/multimix',
  '/mirror-powder', '/5in1-base', '/superbond', '/classic-tops', '/effect-tops',
]

;(async () => {
  const prerenderer = new Prerenderer({
    staticDir: DIST,
    server: {
      host: '127.0.0.1',
      port: 3500,
    },
    renderer: new JSDOMRenderer({
      renderAfterTime: 3000,
    }),
  })

  try {
    await prerenderer.initialize()
    const routes = await prerenderer.renderRoutes(PRERENDER_ROUTES)

    const { writeFileSync, mkdirSync } = require('fs')
    for (const route of routes) {
      const routeDir = path.join(DIST, route.route)
      mkdirSync(routeDir, { recursive: true })
      const html = route.html
        .replace(/href="\//g, 'href="/')
        .replace(/src="\//g, 'src="/')
      writeFileSync(path.join(routeDir, 'index.html'), html, 'utf-8')
      console.log(`✓ prerendered ${route.route}`)
    }
    console.log(`\n✓ Prerender complete — ${routes.length} routes`)
  } catch (err) {
    console.error('Prerender failed:', err)
    process.exit(1)
  } finally {
    prerenderer.destroy()
  }
})()
