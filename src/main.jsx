import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { LangContext, detectLang } from './lib/i18n.js'

const STALE_BUNDLE_RELOAD_KEY = 'gelitup.stale-bundle-reload.v1'

// Block right-click saving on all images globally
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault()
}, true)

function isStaleBundleError(message) {
  const text = String(message || '').toLowerCase()
  return (
    text.includes('failed to fetch dynamically imported module')
    || text.includes('importing a module script failed')
    || text.includes('loading chunk')
    || text.includes("unexpected token '<'")
  )
}

async function forceFreshReload() {
  const hasReloaded = sessionStorage.getItem(STALE_BUNDLE_RELOAD_KEY) === '1'
  if (hasReloaded) return
  sessionStorage.setItem(STALE_BUNDLE_RELOAD_KEY, '1')

  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map((registration) => registration.update()))
    } catch (_) {
      // Best-effort update; reload still proceeds even if a registration update fails.
    }
  }

  const nextUrl = new URL(window.location.href)
  nextUrl.searchParams.set('refresh', Date.now().toString())
  window.location.replace(nextUrl.toString())
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event?.reason
  const message = reason instanceof Error ? reason.message : String(reason || '')
  if (isStaleBundleError(message)) {
    event.preventDefault()
    void forceFreshReload()
  }
})

window.addEventListener('error', (event) => {
  const message = event?.message || event?.error?.message || ''
  const filename = String(event?.filename || '')
  if (isStaleBundleError(message) || (filename.includes('/assets/') && message.includes('Unexpected token'))) {
    void forceFreshReload()
  }
}, true)

// Auto-reload when a new service worker takes control so clients always get
// the latest version immediately after a deploy without needing to close tabs.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LangContext.Provider value={detectLang()}>
        <App />
      </LangContext.Provider>
    </BrowserRouter>
  </StrictMode>,
)
