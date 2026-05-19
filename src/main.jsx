import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import { LangContext, detectLang } from './lib/i18n.js'

// Block right-click saving on all images globally
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG') e.preventDefault()
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
