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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LangContext.Provider value={detectLang()}>
        <App />
      </LangContext.Provider>
    </BrowserRouter>
  </StrictMode>,
)
