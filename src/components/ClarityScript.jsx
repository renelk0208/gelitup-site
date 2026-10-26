import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Microsoft Clarity — gelitup.com
 * Project ID: x1qbjkk609
 */
export default function ClarityScript() {
  const location = useLocation()

  // Do not load Clarity on portal or admin routes
  if (
    location.pathname.startsWith('/portal') ||
    location.pathname.startsWith('/admin')
  ) {
    return null
  }

  useEffect(() => {
    let timer = null
    const load = () => {
      // Delay 2s so Clarity never interferes with React mounting
      timer = setTimeout(() => {
        try {
          if (window.clarity) return
          ;(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)}
            t=l.createElement(r);t.async=1;t.src='https://www.clarity.ms/tag/'+i
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)
          })(window,document,'clarity','script','x1qbjkk609')
        } catch(e) {
          console.warn('Clarity failed to load:', e)
        }
      }, 2000)
    }
    // Load only after the visitor accepts analytics cookies (banner: /giup-consent.js)
    if (window.giupConsent && window.giupConsent.analytics) {
      load()
      return () => clearTimeout(timer)
    }
    const onConsent = (e) => {
      if (e.detail && e.detail.analytics) {
        window.removeEventListener('giup:consent', onConsent)
        load()
      }
    }
    window.addEventListener('giup:consent', onConsent)
    return () => {
      window.removeEventListener('giup:consent', onConsent)
      clearTimeout(timer)
    }
  }, [])
  return null
}
