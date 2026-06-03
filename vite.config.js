import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync(new URL('./public/manifest.json', import.meta.url), 'utf-8'),
)

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
  // Vanity subcategory routes
  '/cat-eye', '/shimmer', '/glitters', '/jelly', '/metallic',
  '/glass-effect', '/spix', '/by-the-ocean', '/solid-gel-polish',
  '/bob', '/3in1', '/premium-builder', '/liquid-polygel', '/multimix',
  '/mirror-powder', '/5in1-base', '/superbond', '/classic-tops', '/effect-tops',
]

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      manifestFilename: 'manifest.json',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      pwaAssets: {
        disabled: false,
        config: true,
        includeHtmlHeadLinks: false,
      },
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallbackDenylist: [/\.xml$/, /\.txt$/, /\.json$/, /\.csv$/, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/gelitup-media\/.+\.(?:png|jpg|jpeg|webp|gif|svg)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/fonts\/.+\.(?:woff2?|ttf|otf|eot)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        navigateFallback: 'index.html',
        suppressWarnings: true,
        type: 'module',
      },
    }),
  ],
})
