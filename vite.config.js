import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync(new URL('./public/manifest.json', import.meta.url), 'utf-8'),
)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    manifestFilename: 'manifest.json',
    registerType: 'autoUpdate',
    injectRegister: false,

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
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})