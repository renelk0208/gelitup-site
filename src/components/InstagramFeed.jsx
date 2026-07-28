import { useEffect } from 'react'

const INSTAGRAM_HANDLE = 'gelitupinternational'
const INSTAGRAM_URL = 'https://www.instagram.com/gelitupinternational/'

/**
 * InstagramFeed
 *
 * Elfsight Instagram embed with branded header.
 * Handles Elfsight script injection automatically — no <script> tag needed elsewhere.
 */
export default function InstagramFeed() {
  useEffect(() => {
    const trySetup = () => {
      try {
        if (window.eapps?.Platform?.setupWidgets) {
          window.eapps.Platform.setupWidgets()
          return true
        }
      } catch (_) { /* not ready */ }
      return false
    }

    if (document.querySelector('script[src*="elfsightcdn.com/platform"]')) {
      if (!trySetup()) {
        let attempts = 0
        const iv = setInterval(() => {
          if (trySetup() || ++attempts >= 30) clearInterval(iv)
        }, 500)
        return () => clearInterval(iv)
      }
      return
    }
    const script = document.createElement('script')
    script.src = 'https://elfsightcdn.com/platform.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  return (
    <div>
      <div className="elfsight-app-42ee70be-f926-412b-b52f-47a51f35a691" data-elfsight-app-lazy />
    </div>
  )
}
