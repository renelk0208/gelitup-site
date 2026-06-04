import { useEffect } from 'react'

const INSTAGRAM_HANDLE = 'gelitup'
const INSTAGRAM_URL = 'https://www.instagram.com/gelitup/'

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
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen bg-[#F5F5F5] py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f09433" />
                  <stop offset="25%" stopColor="#e6683c" />
                  <stop offset="50%" stopColor="#dc2743" />
                  <stop offset="75%" stopColor="#cc2366" />
                  <stop offset="100%" stopColor="#bc1888" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
              <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
              <circle cx="17.5" cy="6.5" r="1" fill="url(#ig-grad)" />
            </svg>
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-[#1A1A1A]">
              @{INSTAGRAM_HANDLE}
            </span>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold uppercase tracking-widest text-[#D43790] transition hover:text-[#BF3182]"
          >
            Follow Us →
          </a>
        </div>
        <div className="elfsight-app-42ee70be-f926-412b-b52f-47a51f35a691" data-elfsight-app-lazy />
      </div>
    </div>
  )
}
