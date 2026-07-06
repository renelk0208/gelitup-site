import { useEffect, useMemo, useState } from 'react'

/**
 * HomeHeroCarousel
 *
 * Rotating homepage hero banner. Each slide auto-advances after SLIDE_MS,
 * with a "loading pill" that fills left-to-right in sync — when the fill
 * completes, the next slide loads. Clicking a pill jumps to that slide and
 * restarts the timer.
 *
 * Performance notes:
 *  - First image loads eagerly; the rest are lazy and the *next* slide's
 *    image is preloaded so transitions are instant.
 *  - The pill fill is pure CSS (no JS animation loop).
 *  - Respects prefers-reduced-motion (no auto-advance, no fill animation).
 */

const SLIDE_MS = 5000
const IMG_BASE = '/gelitup-content/banner-images'

const BANNERS = [
  {
    img: `${IMG_BASE}/home-page-hero-image.webp`,
    kicker: 'Made for Professionals',
    title: 'Professional Nails. Perfected.',
    sub: 'TPO & HEMA-free gel systems, made in the EU.',
    cta: 'Shop New In',
    anchor: 'catalogue-section-new-products',
  },
  {
    img: `${IMG_BASE}/gel-polish-category-hero.jpg`,
    kicker: 'The Colour Collection',
    title: '1,000+ Gel Colours',
    sub: 'Every shade, undertone and finish.',
    cta: 'Shop Colours',
    anchor: 'catalogue-section-colours',
  },
  {
    img: `${IMG_BASE}/top-bases-catalog-hero-image.webp`,
    kicker: 'The Essentials',
    title: 'Bases & Tops',
    sub: 'Good starts to good finishes.',
    cta: 'Shop Bases & Tops',
    anchor: 'catalogue-section-essentials',
  },
  {
    img: `${IMG_BASE}/builder-gel-systems.hero.image.webp`,
    kicker: 'Structure & Strength',
    title: 'Builder Gel Systems',
    sub: 'Strength, structure, flawless shape.',
    cta: 'Shop Builder Gels',
    anchor: 'catalogue-section-builders',
  },
  {
    img: `${IMG_BASE}/nail-art.hero.image.webp`,
    kicker: 'Get Creative',
    title: 'Nail Art',
    sub: 'Tools for limitless creativity.',
    cta: 'Shop Nail Art',
    anchor: 'catalogue-section-nail-art',
  },
  {
    img: `${IMG_BASE}/equipment-and-tools-catalog-hero.jpg`,
    kicker: 'Pro Equipment',
    title: 'Equipment & Tools',
    sub: 'Precision gear for every service.',
    cta: 'Shop Equipment',
    anchor: 'catalogue-section-tools',
  },
  {
    img: `${IMG_BASE}/consumables-catalog-hero.jpg`,
    kicker: 'Restock the Salon',
    title: 'Salon Consumables',
    sub: 'Everyday essentials, pro quality.',
    cta: 'Shop Consumables',
    anchor: 'catalogue-section-consumables',
  },
  {
    img: `${IMG_BASE}/Hand-nail-and-foot-care-catalog-hero-image.webp`,
    kicker: 'Complete Care',
    title: 'Hand, Nail & Foot Care',
    sub: 'After care is essential for hands and feet.',
    cta: 'Shop Care',
    anchor: 'catalogue-section-nail-hand-foot',
  },
  {
    img: `${IMG_BASE}/nail-preparations.hero.image.jpg`,
    kicker: 'The Foundation',
    title: 'Nail Prep',
    sub: 'The foundation of a lasting set.',
    cta: 'Shop Nail Prep',
    anchor: 'catalogue-section-essentials',
  },
  {
    img: `${IMG_BASE}/academy-hero-image.webp`,
    kicker: 'Learn With Us',
    title: 'GEL.IT.UP Academy',
    sub: 'Learn from the professionals.',
    cta: 'Explore the Range',
    anchor: 'catalogue-section-new-products',
  },
]

function scrollToAnchor(anchor) {
  const el = typeof document !== 'undefined' ? document.getElementById(anchor) : null
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function HomeHeroCarousel() {
  const [index, setIndex] = useState(0)
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
    [],
  )

  // Auto-advance — resets whenever the active slide changes (incl. manual jumps).
  useEffect(() => {
    if (reduced) return undefined
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % BANNERS.length)
    }, SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, reduced])

  // Preload the next slide's image so the transition is instant.
  useEffect(() => {
    const next = BANNERS[(index + 1) % BANNERS.length]
    const img = new Image()
    img.src = next.img
  }, [index])

  const slide = BANNERS[index]

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen overflow-hidden bg-[#1A1A1A]">
      <style>{`
        @keyframes giupHeroPill { from { width: 0%; } to { width: 100%; } }
        @keyframes giupHeroIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-stretch gap-0 lg:grid-cols-2">
        {/* Text column */}
        <div key={`t-${index}`} className="order-2 flex flex-col justify-center px-5 py-8 sm:px-8 sm:py-12 lg:order-1" style={{ animation: reduced ? 'none' : 'giupHeroIn 0.5s ease-out both' }}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#e879b9]">{slide.kicker}</p>
          <h2 className="heading-on-dark mt-2 text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">{slide.title}</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">{slide.sub}</p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => scrollToAnchor(slide.anchor)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D43790] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#BF3182]"
            >
              {slide.cta}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true"><path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" /></svg>
            </button>
          </div>

          {/* Loading pills */}
          <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {BANNERS.map((b, i) => {
              const isActive = i === index
              return (
                <button
                  key={b.title}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={b.title}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 overflow-hidden rounded-full transition-all duration-300 ${isActive ? 'w-9 bg-white/25' : 'w-3 bg-white/25 hover:bg-white/40'}`}
                >
                  {isActive && (
                    <span
                      key={`fill-${index}`}
                      className="block h-full rounded-full bg-white"
                      style={reduced ? { width: '100%' } : { animation: `giupHeroPill ${SLIDE_MS}ms linear forwards` }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Image column */}
        <div className="relative order-1 min-h-[200px] overflow-hidden sm:min-h-[280px] lg:order-2 lg:min-h-[420px]">
          <img
            key={`img-${index}`}
            src={slide.img}
            alt={slide.title}
            className="h-full w-full object-cover"
            loading={index === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ animation: reduced ? 'none' : 'giupHeroIn 0.6s ease-out both' }}
          />
          {/* Soft blend into the dark panel on desktop */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block" style={{ background: 'linear-gradient(to right, #1A1A1A 0%, rgba(26,26,26,0.35) 22%, transparent 55%)' }} />
        </div>
      </div>
    </div>
  )
}
