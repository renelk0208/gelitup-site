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
      } catch { /* not ready */ }
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
    <div className="gelitup-instagram-feed">
      <style>{`
        @media (max-width: 640px) {
          .gelitup-instagram-feed .eapps-instagram-feed-posts-slider-inner {
            overflow: visible !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-inner {
            display: block !important;
            width: 100% !important;
            transform: none !important;
            transition: none !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-view {
            display: none !important;
            width: 100% !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-view:first-child {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 4px !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-view:first-child .eapps-instagram-feed-posts-item {
            display: block !important;
            width: auto !important;
            min-width: 0 !important;
            height: auto !important;
            aspect-ratio: 1 / 1 !important;
            margin: 0 !important;
            overflow: hidden !important;
            border: 0 !important;
            border-radius: 8px !important;
            background: transparent !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-item-header,
          .gelitup-instagram-feed .eapps-instagram-feed-posts-item-content,
          .gelitup-instagram-feed .eapps-instagram-feed-posts-slider-nav {
            display: none !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-item-media,
          .gelitup-instagram-feed .eapps-instagram-feed-posts-item-link,
          .gelitup-instagram-feed .eapps-instagram-feed-posts-item-image-wrapper {
            width: 100% !important;
            height: 100% !important;
            min-height: 0 !important;
            padding-top: 0 !important;
          }
          .gelitup-instagram-feed .eapps-instagram-feed-posts-item-image {
            position: absolute !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
        }
      `}</style>
      <div className="elfsight-app-42ee70be-f926-412b-b52f-47a51f35a691" data-elfsight-app-lazy />
    </div>
  )
}
